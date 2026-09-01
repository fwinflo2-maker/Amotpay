<?php

declare(strict_types=1);

namespace AmotPay\Identity;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\ApiException;
use AmotPay\Identity\Sumsub\SumsubAdapter;

final class IdentityVerificationService
{
    public function __construct(private SumsubAdapter $sumsub = new SumsubAdapter()) {}

    public function getStatus(int $userId): array
    {
        return $this->getPublicStatus($userId);
    }

    /** Minimal public KYC response — no secrets or internal provider data. */
    public function getPublicStatus(int $userId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT kyc_status, kyc_verified_at FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row) {
            throw new ApiException('User not found', 404, 'NOT_FOUND');
        }

        $status = (string) $row['kyc_status'];

        return [
            'status' => $status,
            'verified' => KycStatus::isVerified($status),
            'display_status' => $this->displayStatus($status),
            'action_required' => in_array($status, [KycStatus::RETRY_REQUIRED, KycStatus::REJECTED], true),
        ];
    }

    /** @return array<string, mixed> Admin-only detailed KYC view */
    public function getAdminStatus(int $userId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT u.id, u.kyc_status, u.sumsub_applicant_id, u.kyc_verified_at,
                    kp.level_name, kp.review_result, kp.review_reject_type, kp.updated_at
             FROM users u
             LEFT JOIN kyc_profiles kp ON kp.user_id = u.id
             WHERE u.id = ?'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row) {
            throw new ApiException('User not found', 404, 'NOT_FOUND');
        }

        return [
            'user_id' => (int) $row['id'],
            'status' => $row['kyc_status'],
            'verified' => KycStatus::isVerified((string) $row['kyc_status']),
            'sumsub_applicant_id' => $row['sumsub_applicant_id'],
            'verified_at' => $row['kyc_verified_at'],
            'level_name' => $row['level_name'],
            'review_result' => $row['review_result'],
            'review_reject_type' => $row['review_reject_type'],
            'updated_at' => $row['updated_at'],
        ];
    }

    /** @param array<string, mixed> $user */
    public function startVerification(array $user): array
    {
        if (!$this->sumsub->isConfigured()) {
            throw new ApiException('Identity verification is not configured', 503, 'KYC_NOT_CONFIGURED');
        }

        $userId = (int) $user['id'];
        $externalUserId = 'amotpay-user-' . $userId;
        $pdo = Database::connection();

        $stmt = $pdo->prepare('SELECT sumsub_applicant_id, kyc_status FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();

        $applicantId = $existing['sumsub_applicant_id'] ?? null;

        if (!$applicantId) {
            try {
                $existingApplicant = $this->sumsub->getApplicantByExternalUserId($externalUserId);
                $applicantId = (string) ($existingApplicant['id'] ?? '');
            } catch (\Throwable) {
                $applicantId = '';
            }
        }

        if (!$applicantId) {
            $info = [
                'firstName' => (string) ($user['first_name'] ?? ''),
                'lastName' => (string) ($user['last_name'] ?? ''),
                'country' => (string) ($user['country_code'] ?? ''),
            ];
            if (!empty($user['email'])) {
                $info['email'] = (string) $user['email'];
            }
            if (!empty($user['phone'])) {
                $info['phone'] = (string) $user['phone'];
            }

            $created = $this->sumsub->createApplicant($externalUserId, $info);
            $applicantId = (string) ($created['id'] ?? '');
            if ($applicantId === '') {
                throw new ApiException('Failed to create verification applicant', 502, 'KYC_PROVIDER_ERROR');
            }

            $pdo->prepare(
                'UPDATE users SET sumsub_applicant_id = ?, kyc_status = ? WHERE id = ?'
            )->execute([$applicantId, KycStatus::PENDING, $userId]);

            $pdo->prepare(
                'INSERT INTO kyc_profiles (user_id, sumsub_applicant_id, level_name, status, country_code)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE sumsub_applicant_id = VALUES(sumsub_applicant_id),
                    status = VALUES(status), updated_at = NOW()'
            )->execute([
                $userId,
                $applicantId,
                $this->sumsub->getLevelName(),
                KycStatus::PENDING,
                $user['country_code'] ?? null,
            ]);
        }

        $token = $this->sumsub->generateAccessToken($externalUserId);

        return [
            'access_token' => $token['token'] ?? null,
            'status' => KycStatus::PENDING,
        ];
    }

    public function updateStatusFromProvider(
        int $userId,
        string $applicantId,
        string $status,
        ?string $reviewResult = null,
        ?string $rejectType = null
    ): void {
        $pdo = Database::connection();
        $verifiedAt = $status === KycStatus::VERIFIED ? date('Y-m-d H:i:s') : null;

        $pdo->prepare(
            'UPDATE users SET kyc_status = ?, kyc_verified_at = COALESCE(?, kyc_verified_at) WHERE id = ?'
        )->execute([$status, $verifiedAt, $userId]);

        $pdo->prepare(
            'UPDATE kyc_profiles SET status = ?, review_result = ?, review_reject_type = ?, updated_at = NOW()
             WHERE user_id = ?'
        )->execute([$status, $reviewResult, $rejectType, $userId]);

        $pdo->prepare(
            'INSERT INTO kyc_verifications (user_id, sumsub_applicant_id, level_name, status, review_answer, completed_at)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $userId,
            $applicantId,
            $this->sumsub->getLevelName(),
            $status,
            $reviewResult,
            in_array($status, [KycStatus::VERIFIED, KycStatus::REJECTED], true) ? date('Y-m-d H:i:s') : null,
        ]);
    }

    private function displayStatus(string $status): string
    {
        return match ($status) {
            KycStatus::NOT_STARTED => 'Not started',
            KycStatus::PENDING, KycStatus::IN_REVIEW => 'In progress',
            KycStatus::VERIFIED => 'Verified',
            KycStatus::REJECTED => 'Rejected',
            KycStatus::RETRY_REQUIRED => 'Action required',
            KycStatus::EXPIRED => 'Expired',
            KycStatus::SUSPENDED => 'Suspended',
            default => 'In progress',
        };
    }
}
