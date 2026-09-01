<?php

declare(strict_types=1);

namespace AmotPay\Identity\Sumsub;

use AmotPay\Core\Eligibility\EligibilityEngine;
use AmotPay\Database\Database;
use AmotPay\Identity\IdentityVerificationService;
use AmotPay\Identity\KycStatus;
use AmotPay\Services\AuditService;
use AmotPay\Services\SettingsService;

final class SumsubWebhookHandler
{
    public function __construct(
        private SettingsService $settings = new SettingsService(),
        private IdentityVerificationService $kyc = new IdentityVerificationService()
    ) {}

    public function handle(string $rawBody, string $digestHeader): bool
    {
        $secret = $this->settings->get('SUMSUB_WEBHOOK_SECRET') ?? '';
        if ($secret === '') {
            throw new \RuntimeException('Sumsub webhook is not configured');
        }
        if (!SumsubAdapter::verifyWebhookSignature($rawBody, $digestHeader, $secret)) {
            throw new \InvalidArgumentException('Invalid Sumsub webhook signature');
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            throw new \InvalidArgumentException('Invalid webhook payload');
        }

        $eventType = (string) ($payload['type'] ?? $payload['eventType'] ?? 'unknown');
        $applicantId = (string) ($payload['applicantId'] ?? $payload['applicant']['id'] ?? '');
        $externalUserId = (string) ($payload['externalUserId'] ?? $payload['applicant']['externalUserId'] ?? '');
        $eventHash = hash('sha256', $rawBody);

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare('SELECT id FROM kyc_events WHERE event_hash = ? FOR UPDATE');
            $stmt->execute([$eventHash]);
            if ($stmt->fetch()) {
                $pdo->commit();

                return false;
            }

            $userId = $this->resolveUserId($externalUserId, $applicantId);
            $reviewStatus = (string) ($payload['reviewStatus'] ?? $payload['reviewResult']['reviewStatus'] ?? 'pending');
            $reviewAnswer = $payload['reviewResult']['reviewAnswer'] ?? $payload['reviewAnswer'] ?? null;
            $rejectType = $payload['reviewResult']['reviewRejectType'] ?? null;
            $mappedStatus = KycStatus::mapFromSumsub($reviewStatus, is_string($reviewAnswer) ? $reviewAnswer : null);

            $pdo->prepare(
                'INSERT INTO kyc_events (user_id, sumsub_applicant_id, event_type, event_hash, payload, processed)
                 VALUES (?, ?, ?, ?, ?, 1)'
            )->execute([
                $userId,
                $applicantId !== '' ? $applicantId : null,
                $eventType,
                $eventHash,
                $rawBody,
            ]);

            if ($userId !== null && $applicantId !== '') {
                $this->kyc->updateStatusFromProvider(
                    $userId,
                    $applicantId,
                    $mappedStatus,
                    is_string($reviewAnswer) ? $reviewAnswer : null,
                    is_string($rejectType) ? $rejectType : null
                );

                $userStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $userStmt->execute([$userId]);
                $user = $userStmt->fetch();
                if ($user) {
                    $eligibility = (new EligibilityEngine())->evaluateUser($user);
                    AuditService::log('kyc.eligibility.recalculated', $userId, 'user', (string) $userId, null, [
                        'kyc_status' => $mappedStatus,
                        'features' => array_map(
                            static fn ($f) => is_array($f) ? ($f['status'] ?? null) : $f,
                            $eligibility['features'] ?? []
                        ),
                    ]);
                }
            }

            $pdo->commit();
            AuditService::log('kyc.webhook', $userId, 'kyc_event', $eventHash, null, [
                'event_type' => $eventType,
                'status' => $mappedStatus,
            ]);

            return true;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private function resolveUserId(string $externalUserId, string $applicantId): ?int
    {
        $pdo = Database::connection();

        if (preg_match('/^amotpay-user-(\d+)$/', $externalUserId, $m)) {
            return (int) $m[1];
        }

        if ($applicantId !== '') {
            $stmt = $pdo->prepare('SELECT id FROM users WHERE sumsub_applicant_id = ?');
            $stmt->execute([$applicantId]);
            $row = $stmt->fetch();
            if ($row) {
                return (int) $row['id'];
            }
        }

        return null;
    }
}
