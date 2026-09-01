<?php

declare(strict_types=1);

namespace AmotPay\Core\Capability;

use AmotPay\Database\Database;

final class CapabilityEngine
{
    public function getCapability(
        string $provider,
        string $capabilityType,
        string $capabilityKey,
        ?string $countryCode = null,
        ?string $currency = null
    ): array {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT provider, capability_type, capability_key, country_code, currency, status, metadata,
                    min_amount, max_amount, source, synced_at, updated_at
             FROM provider_capabilities
             WHERE provider = ?
               AND capability_type = ?
               AND capability_key = ?
               AND (country_code IS NULL OR country_code = ?)
               AND (currency IS NULL OR currency = ?)
             ORDER BY country_code IS NULL, currency IS NULL
             LIMIT 1'
        );
        $stmt->execute([$provider, $capabilityType, $capabilityKey, $countryCode, $currency]);
        $row = $stmt->fetch();

        if (!$row) {
            return [
                'provider' => $provider,
                'capability_type' => $capabilityType,
                'capability_key' => $capabilityKey,
                'country_code' => $countryCode,
                'currency' => $currency,
                'status' => CapabilityStatus::UNAVAILABLE,
                'metadata' => null,
            ];
        }

        if (is_string($row['metadata'])) {
            $row['metadata'] = json_decode($row['metadata'], true);
        }

        return $row;
    }

    public function upsertCapability(
        string $provider,
        string $capabilityType,
        string $capabilityKey,
        string $status,
        ?string $countryCode = null,
        ?string $currency = null,
        ?array $metadata = null,
        ?string $minAmount = null,
        ?string $maxAmount = null,
        string $source = 'PROVIDER_API'
    ): void {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO provider_capabilities
                (provider, capability_type, capability_key, country_code, currency, status, metadata, min_amount, max_amount, source, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                metadata = VALUES(metadata),
                min_amount = VALUES(min_amount),
                max_amount = VALUES(max_amount),
                source = VALUES(source),
                synced_at = NOW(),
                updated_at = NOW()'
        );
        $stmt->execute([
            $provider,
            $capabilityType,
            $capabilityKey,
            $countryCode,
            $currency,
            $status,
            $metadata !== null ? json_encode($metadata) : null,
            $minAmount,
            $maxAmount,
            $source,
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    public function listByCountry(string $countryCode): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT provider, capability_type, capability_key, country_code, currency, status, metadata, min_amount, max_amount
             FROM provider_capabilities
             WHERE country_code = ? OR country_code IS NULL
             ORDER BY capability_type, capability_key'
        );
        $stmt->execute([$countryCode]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            if (is_string($row['metadata'])) {
                $row['metadata'] = json_decode($row['metadata'], true);
            }
        }

        return $rows;
    }
}
