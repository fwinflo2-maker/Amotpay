<?php

declare(strict_types=1);

namespace AmotPay\Core\Limits;

use AmotPay\Database\Database;

final class ProductLimitsService
{
    public function getLimit(string $productKey, ?string $countryCode = null, ?string $currency = null): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT product_key, country_code, currency, minimum_amount, maximum_amount, source, metadata, updated_at
             FROM product_limits
             WHERE product_key = ?
               AND (country_code IS NULL OR country_code = ?)
               AND (currency IS NULL OR currency = ?)
             ORDER BY country_code IS NULL, currency IS NULL
             LIMIT 1'
        );
        $stmt->execute([$productKey, $countryCode, $currency]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function upsert(
        string $productKey,
        ?string $countryCode,
        ?string $currency,
        ?string $minimum,
        ?string $maximum,
        string $source = 'PROVIDER_API',
        ?array $metadata = null
    ): void {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO product_limits (product_key, country_code, currency, minimum_amount, maximum_amount, source, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                minimum_amount = VALUES(minimum_amount),
                maximum_amount = VALUES(maximum_amount),
                source = VALUES(source),
                metadata = VALUES(metadata),
                updated_at = NOW()'
        );
        $stmt->execute([
            $productKey,
            $countryCode,
            $currency,
            $minimum,
            $maximum,
            $source,
            $metadata !== null ? json_encode($metadata) : null,
        ]);
    }
}
