<?php

declare(strict_types=1);

namespace AmotPay\Reconciliation;

use AmotPay\Database\Database;
use AmotPay\Ledger\LedgerService;

final class ReconciliationService
{
    public const MATCHED = 'MATCHED';
    public const MISMATCH = 'MISMATCH';
    public const MISSING_PROVIDER = 'MISSING_PROVIDER';
    public const MISSING_INTERNAL = 'MISSING_INTERNAL';
    public const AMOUNT_MISMATCH = 'AMOUNT_MISMATCH';
    public const STATUS_MISMATCH = 'STATUS_MISMATCH';

    public function __construct(private LedgerService $ledger = new LedgerService()) {}

    public function reconcileTransferOrder(int $transferOrderId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM transfer_orders WHERE id = ?');
        $stmt->execute([$transferOrderId]);
        $transfer = $stmt->fetch();

        if (!$transfer) {
            return $this->record($transferOrderId, null, self::MISSING_INTERNAL, [
                'reason' => 'transfer_order not found',
            ]);
        }

        $ledgerEntries = $this->ledger->entriesForRelated('transfer_order', $transferOrderId);
        $webhookStmt = $pdo->prepare(
            'SELECT id, event_type, processed, created_at FROM webhooks
             WHERE provider = ? AND provider_reference = ? ORDER BY id DESC LIMIT 1'
        );
        $webhookStmt->execute(['CASHRAMP', (string) ($transfer['provider_reference'] ?? '')]);
        $webhook = $webhookStmt->fetch();

        $status = self::MATCHED;
        $details = [];

        if ($transfer['provider_reference'] === null || $transfer['provider_reference'] === '') {
            $status = self::MISSING_PROVIDER;
            $details['reason'] = 'No provider reference on transfer';
        }

        if ($ledgerEntries === []) {
            $status = self::MISMATCH;
            $details['reason'] = 'No ledger entries for transfer';
        }

        $internalFinal = in_array($transfer['status'], ['COMPLETED', 'FAILED', 'REFUNDED'], true);
        if ($internalFinal && (!$webhook || !(bool) $webhook['processed'])) {
            $status = self::STATUS_MISMATCH;
            $details['internal_status'] = $transfer['status'];
            $details['webhook_processed'] = $webhook['processed'] ?? null;
        }

        return $this->record((int) $transfer['id'], (string) ($transfer['provider_reference'] ?? ''), $status, $details);
    }

    /** @return array<string, mixed> */
    public function listRecent(int $limit = 50): array
    {
        try {
            $stmt = Database::connection()->prepare(
                'SELECT * FROM reconciliation_records ORDER BY id DESC LIMIT ?'
            );
            $stmt->bindValue(1, max(1, min($limit, 200)), \PDO::PARAM_INT);
            $stmt->execute();

            return ['items' => $stmt->fetchAll()];
        } catch (\PDOException) {
            return ['items' => []];
        }
    }

    /** @param array<string, mixed> $details */
    private function record(?int $transferId, ?string $providerRef, string $status, array $details): array
    {
        $pdo = Database::connection();
        try {
            $pdo->prepare(
                'INSERT INTO reconciliation_records (transfer_order_id, provider_reference, status, details)
                 VALUES (?, ?, ?, ?)'
            )->execute([
                $transferId,
                $providerRef,
                $status,
                json_encode($details),
            ]);
        } catch (\PDOException) {
            // Table may not exist until migration 007
        }

        return [
            'transfer_order_id' => $transferId,
            'provider_reference' => $providerRef,
            'status' => $status,
            'details' => $details,
        ];
    }
}
