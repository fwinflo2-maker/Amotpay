<?php

declare(strict_types=1);

namespace AmotPay\Webhooks;

use AmotPay\Database\Database;
use AmotPay\Http\Request;
use AmotPay\Ledger\LedgerService;
use AmotPay\Reconciliation\ReconciliationService;
use AmotPay\Services\AuditService;
use AmotPay\Services\CashrampService;
use AmotPay\Services\SettingsService;

final class CashrampWebhookHandler
{
    public function __construct(
        private SettingsService $settings = new SettingsService(),
        private LedgerService $ledger = new LedgerService(),
        private ReconciliationService $reconciliation = new ReconciliationService()
    ) {}

    public function handle(Request $request): bool
    {
        $secret = $this->settings->get('CASHRAMP_WEBHOOK_SECRET')
            ?? $this->settings->get('CASHRAMP_WEBHOOK_TOKEN');

        if ($secret === null || $secret === '') {
            throw new \InvalidArgumentException('Cashramp webhook secret not configured');
        }

        $signature = trim((string) (
            $request->headers['x-cashramp-signature']
            ?? $request->headers['x-signature']
            ?? ''
        ));

        if ($signature === '' || !hash_equals(hash_hmac('sha256', $request->rawBody, $secret), $signature)) {
            throw new \InvalidArgumentException('Invalid Cashramp webhook signature');
        }

        $payload = $request->body;
        $eventHash = hash('sha256', $request->rawBody);
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare('SELECT id FROM webhooks WHERE event_hash = ? FOR UPDATE');
            $stmt->execute([$eventHash]);
            if ($stmt->fetch()) {
                $pdo->commit();

                return false;
            }

            $eventType = (string) ($payload['event'] ?? $payload['type'] ?? 'unknown');
            $providerRef = (string) ($payload['reference'] ?? $payload['id'] ?? $payload['data']['reference'] ?? '');

            $webhookId = $this->insertWebhook($pdo, $eventType, $providerRef, $eventHash, $request->rawBody);

            $transfer = $this->findTransfer($pdo, $payload, $providerRef);
            $mapped = null;
            if ($transfer) {
                $newStatus = CashrampService::mapPaymentStatus(
                    (string) ($payload['status'] ?? $payload['data']['status'] ?? 'processing')
                );
                $mapped = $this->mapToTransferStatus($newStatus);
                $this->updateTransferStatus($pdo, (int) $transfer['id'], $mapped, $providerRef);

                if ($mapped === 'COMPLETED') {
                    $this->settleLedger((int) $transfer['id'], (string) $transfer['reference']);
                } elseif (in_array($mapped, ['FAILED', 'CANCELLED'], true)) {
                    $this->reverseLedger((int) $transfer['id'], (string) $transfer['reference'], (string) $transfer['source_currency'], (string) $transfer['source_amount']);
                }

                $this->reconciliation->reconcileTransferOrder((int) $transfer['id']);
            }

            $pdo->prepare('UPDATE webhooks SET processed = 1, processed_at = NOW() WHERE id = ?')
                ->execute([$webhookId]);

            $pdo->commit();

            AuditService::log('webhook.cashramp', $transfer['user_id'] ?? null, 'webhook', (string) $webhookId, $request->clientIp(), [
                'event' => $eventType,
                'transfer_reference' => $transfer['reference'] ?? null,
                'status' => isset($transfer, $mapped) ? $mapped : null,
            ]);

            return true;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private function insertWebhook(\PDO $pdo, string $eventType, string $providerRef, string $eventHash, string $raw): int
    {
        $pdo->prepare(
            'INSERT INTO webhooks (provider, event_type, provider_reference, event_hash, payload, processed)
             VALUES (?, ?, ?, ?, ?, 0)'
        )->execute(['CASHRAMP', $eventType, $providerRef, $eventHash, $raw]);

        return (int) $pdo->lastInsertId();
    }

    /** @param array<string, mixed> $payload */
    private function findTransfer(\PDO $pdo, array $payload, string $providerRef): ?array
    {
        $reference = (string) ($payload['reference'] ?? $payload['data']['reference'] ?? '');
        if ($reference !== '') {
            $stmt = $pdo->prepare('SELECT * FROM transfer_orders WHERE reference = ? LIMIT 1');
            $stmt->execute([$reference]);
            if ($row = $stmt->fetch()) {
                return $row;
            }
        }

        if ($providerRef !== '') {
            $stmt = $pdo->prepare('SELECT * FROM transfer_orders WHERE provider_reference = ? LIMIT 1');
            $stmt->execute([$providerRef]);
            if ($row = $stmt->fetch()) {
                return $row;
            }
        }

        return null;
    }

    private function updateTransferStatus(\PDO $pdo, int $id, string $status, string $providerRef): void
    {
        $completed = $status === 'COMPLETED' ? ', completed_at = NOW()' : '';
        $pdo->prepare(
            "UPDATE transfer_orders SET status = ?, provider_reference = COALESCE(NULLIF(?, ''), provider_reference){$completed} WHERE id = ?"
        )->execute([$status, $providerRef, $id]);
    }

    private function mapToTransferStatus(string $cashrampStatus): string
    {
        return match ($cashrampStatus) {
            'SUCCESS' => 'COMPLETED',
            'CANCELLED' => 'CANCELLED',
            'CREATED' => 'CREATED',
            default => 'PROCESSING',
        };
    }

    private function settleLedger(int $transferId, string $reference): void
    {
        $entries = $this->ledger->entriesForRelated('transfer_order', $transferId);
        foreach ($entries as $entry) {
            if (($entry['balance_type'] ?? '') === 'pending' && $entry['entry_type'] === 'debit') {
                // Mark parent ledger transaction completed
                Database::connection()->prepare(
                    "UPDATE ledger_transactions SET status = 'COMPLETED', completed_at = NOW()
                     WHERE related_type = 'transfer_order' AND related_id = ?"
                )->execute([$transferId]);
                break;
            }
        }
    }

    private function reverseLedger(int $transferId, string $reference, string $currency, string $amount): void
    {
        $this->ledger->post(
            'transfer_reversal',
            [
                [
                    'account_type' => 'provider_transit',
                    'account_id' => 'cashramp',
                    'currency' => $currency,
                    'entry_type' => 'debit',
                    'amount' => $amount,
                    'balance_type' => 'settlement',
                ],
                [
                    'account_type' => 'user_liability',
                    'account_id' => 'user:' . $this->transferUserId($transferId),
                    'currency' => $currency,
                    'entry_type' => 'credit',
                    'amount' => $amount,
                    'balance_type' => 'available',
                ],
            ],
            $this->transferUserId($transferId),
            'transfer_order',
            $transferId,
            'COMPLETED',
            'Reversal ' . $reference
        );

        Database::connection()->prepare(
            "UPDATE transfer_orders SET status = 'REFUNDED' WHERE id = ?"
        )->execute([$transferId]);
    }

    private function transferUserId(int $transferId): int
    {
        $stmt = Database::connection()->prepare('SELECT user_id FROM transfer_orders WHERE id = ?');
        $stmt->execute([$transferId]);

        return (int) $stmt->fetchColumn();
    }
}
