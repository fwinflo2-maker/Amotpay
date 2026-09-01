<?php

declare(strict_types=1);

namespace AmotPay\Ledger;

use AmotPay\Database\Database;
use AmotPay\Utils\ReferenceGenerator;

final class LedgerService
{
    /**
     * @param list<array{account_type: string, account_id: string, currency: string, entry_type: string, amount: string, balance_type?: string}> $entries
     */
    public function post(
        string $operationType,
        array $entries,
        ?int $userId = null,
        ?string $relatedType = null,
        ?int $relatedId = null,
        string $status = 'PENDING',
        ?string $description = null
    ): string {
        if (count($entries) < 2) {
            throw new \InvalidArgumentException('Ledger requires at least two entries');
        }

        $debits = '0';
        $credits = '0';
        foreach ($entries as $entry) {
            if ($entry['entry_type'] === 'debit') {
                $debits = bcadd($debits, $entry['amount'], 8);
            } else {
                $credits = bcadd($credits, $entry['amount'], 8);
            }
        }
        if (bccomp($debits, $credits, 8) !== 0) {
            throw new \InvalidArgumentException('Ledger entries must balance');
        }

        $pdo = Database::connection();
        $reference = ReferenceGenerator::generate('LDG');
        $pdo->beginTransaction();

        try {
            $pdo->prepare(
                'INSERT INTO ledger_transactions (reference, user_id, operation_type, related_type, related_id, status, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$reference, $userId, $operationType, $relatedType, $relatedId, $status, $description]);

            $ledgerTxId = (int) $pdo->lastInsertId();
            $entryStmt = $pdo->prepare(
                'INSERT INTO ledger_entries (ledger_transaction_id, account_type, account_id, currency, entry_type, amount, balance_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );

            foreach ($entries as $entry) {
                $entryStmt->execute([
                    $ledgerTxId,
                    $entry['account_type'],
                    $entry['account_id'],
                    $entry['currency'],
                    $entry['entry_type'],
                    $entry['amount'],
                    $entry['balance_type'] ?? 'available',
                ]);
            }

            $pdo->commit();

            return $reference;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public function complete(string $reference): void
    {
        Database::connection()->prepare(
            "UPDATE ledger_transactions SET status = 'COMPLETED', completed_at = NOW() WHERE reference = ?"
        )->execute([$reference]);
    }

    /** @return array<int, array<string, mixed>> */
    public function entriesForRelated(string $relatedType, int $relatedId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT lt.reference, lt.operation_type, lt.status, le.account_type, le.account_id,
                    le.currency, le.entry_type, le.amount, le.balance_type, le.created_at
             FROM ledger_transactions lt
             JOIN ledger_entries le ON le.ledger_transaction_id = lt.id
             WHERE lt.related_type = ? AND lt.related_id = ?
             ORDER BY le.id'
        );
        $stmt->execute([$relatedType, $relatedId]);

        return $stmt->fetchAll();
    }
}
