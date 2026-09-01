<?php

declare(strict_types=1);

namespace AmotPay\Core\Capability;

use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;

final class CashrampCapabilityEngine
{
    public function __construct(
        private CashrampAdapter $provider = new CashrampAdapter(),
        private CapabilityEngine $capabilities = new CapabilityEngine()
    ) {}

    public function sync(): array
    {
        if (!$this->provider->isConfigured()) {
            return ['synced' => false, 'reason' => 'Cashramp not configured'];
        }

        $synced = ['countries' => 0, 'assets' => 0];

        foreach ($this->provider->getAvailableCountries() as $country) {
            $code = strtoupper((string) ($country['code'] ?? ''));
            if ($code === '') {
                continue;
            }
            $this->capabilities->upsertCapability(
                'CASHRAMP',
                'country',
                strtolower($code),
                CapabilityStatus::AVAILABLE,
                $code,
                null,
                ['name' => $country['name'] ?? null, 'provider_id' => $country['id'] ?? null]
            );
            $synced['countries']++;
        }

        foreach ($this->provider->getRampableAssets() as $asset) {
            $symbol = strtoupper((string) ($asset['symbol'] ?? ''));
            if ($symbol === '') {
                continue;
            }
            $this->capabilities->upsertCapability(
                'CASHRAMP',
                'asset',
                strtolower($symbol),
                CapabilityStatus::AVAILABLE,
                null,
                null,
                [
                    'name' => $asset['name'] ?? null,
                    'networks' => $asset['networks'] ?? [],
                    'contract_address' => $asset['contractAddress'] ?? null,
                ]
            );
            $synced['assets']++;
        }

        return ['synced' => true, 'counts' => $synced];
    }

    public function syncAndLog(?int $adminSessionId = null): array
    {
        $result = $this->sync();
        $this->logSync($result, $adminSessionId);

        return $result;
    }

    private function logSync(array $result, ?int $adminSessionId): void
    {
        try {
            \AmotPay\Database\Database::connection()->prepare(
                'INSERT INTO provider_sync_logs (provider, sync_type, status, counts, admin_session_id)
                 VALUES (?, ?, ?, ?, ?)'
            )->execute([
                'CASHRAMP',
                'capabilities',
                ($result['synced'] ?? false) ? 'SUCCESS' : 'FAILED',
                json_encode($result['counts'] ?? ['reason' => $result['reason'] ?? null]),
                $adminSessionId,
            ]);
        } catch (\PDOException) {
            // Table may not exist until migration 006
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function getCountriesForUser(?string $countryCode = null): array
    {
        if ($countryCode !== null) {
            return $this->capabilities->listByCountry($countryCode);
        }

        return [];
    }
}
