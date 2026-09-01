<?php

declare(strict_types=1);

namespace AmotPay\Core;

use AmotPay\Database\Database;

final class FeatureFlags
{
    public const USD_ACCOUNT = 'USD_ACCOUNT';
    public const EUR_ACCOUNT = 'EUR_ACCOUNT';
    public const CRYPTO = 'CRYPTO';
    public const USDT = 'USDT';
    public const USDC = 'USDC';
    public const BTC = 'BTC';
    public const VIRTUAL_CARD = 'VIRTUAL_CARD';
    public const ONCHAIN_WITHDRAWAL = 'ONCHAIN_WITHDRAWAL';
    public const INTERNATIONAL_TRANSFER = 'INTERNATIONAL_TRANSFER';

    public function isEnabled(string $flagKey): bool
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT enabled FROM feature_flags WHERE flag_key = ?');
        $stmt->execute([$flagKey]);
        $row = $stmt->fetch();

        return $row ? (bool) $row['enabled'] : false;
    }

    /** @return array<string, bool> */
    public function all(): array
    {
        $pdo = Database::connection();
        $rows = $pdo->query('SELECT flag_key, enabled FROM feature_flags')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $out[$row['flag_key']] = (bool) $row['enabled'];
        }

        return $out;
    }

    /** @return array<int, array<string, mixed>> */
    public function allDetailed(): array
    {
        try {
            return Database::connection()
                ->query('SELECT flag_key, enabled, description, updated_at FROM feature_flags ORDER BY flag_key')
                ->fetchAll();
        } catch (\PDOException) {
            return [];
        }
    }

    public function setEnabled(string $flagKey, bool $enabled): void
    {
        Database::connection()->prepare(
            'UPDATE feature_flags SET enabled = ?, updated_at = NOW() WHERE flag_key = ?'
        )->execute([(int) $enabled, $flagKey]);
    }
}
