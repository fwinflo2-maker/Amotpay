<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Database\Database;
use PDO;

final class TransferService
{
    public function getTransfer(int $userId, int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, user_id, reference, source_country, source_currency, destination_country, destination_currency,
             payment_method, recipient_phone, recipient_first_name, recipient_last_name, source_amount, provider_fee,
             application_fee, exchange_rate, destination_amount, total_payable, provider, provider_reference, status,
             created_at, updated_at, completed_at FROM transactions WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    public function listTransfers(int $userId, int $limit = 20): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, user_id, reference, source_country, source_currency, destination_country, destination_currency,
             payment_method, recipient_phone, recipient_first_name, recipient_last_name, source_amount, provider_fee,
             application_fee, exchange_rate, destination_amount, total_payable, provider, provider_reference, status,
             created_at, updated_at, completed_at FROM transactions
             WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, max(1, min($limit, 100)), PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function normalizeAmount(mixed $amount): string
    {
        $value = trim((string) $amount);
        if (!preg_match('/^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/', $value, $match)) {
            throw new \InvalidArgumentException('Invalid amount');
        }
        return $match[1] . '.' . str_pad($match[2] ?? '', 2, '0');
    }
}
