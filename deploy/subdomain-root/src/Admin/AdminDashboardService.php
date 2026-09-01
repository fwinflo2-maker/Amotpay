<?php

declare(strict_types=1);

namespace AmotPay\Admin;

use AmotPay\Core\Capability\CapabilityEngine;
use AmotPay\Database\Database;
use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;
use AmotPay\Services\MigrationStatusService;

final class AdminDashboardService
{
    public function __construct(
        private CapabilityEngine $capabilities = new CapabilityEngine(),
        private MigrationStatusService $migrations = new MigrationStatusService()
    ) {}

    /** @return array<string, mixed> */
    public function overview(): array
    {
        AdminContext::require(AdminPermission::TRANSFER_VIEW);
        $pdo = Database::connection();

        $todayTransfers = $this->safeCount(
            $pdo,
            "SELECT COUNT(*) FROM transfer_orders WHERE DATE(created_at) = CURDATE()"
        );
        $legacyToday = $this->safeCount(
            $pdo,
            "SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURDATE()"
        );

        $completed = $this->safeCount(
            $pdo,
            "SELECT COUNT(*) FROM transfer_orders WHERE status = 'COMPLETED' AND DATE(created_at) = CURDATE()"
        );
        $failed = $this->safeCount(
            $pdo,
            "SELECT COUNT(*) FROM transfer_orders WHERE status = 'FAILED' AND DATE(created_at) = CURDATE()"
        );

        $total = $todayTransfers + $legacyToday;
        $successRate = $total > 0 ? round(($completed / max(1, $todayTransfers)) * 100, 1) : null;

        $kycPending = (int) $pdo->query(
            "SELECT COUNT(*) FROM users WHERE kyc_status IN ('PENDING','IN_REVIEW','RETRY_REQUIRED')"
        )->fetchColumn();

        $cashramp = (new CashrampAdapter())->healthCheck();

        return [
            'system' => [
                'app_url' => rtrim(\AmotPay\Config\Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/'),
                'migrations' => $this->migrations->status(),
            ],
            'transactions_today' => $total,
            'volume_today' => null,
            'success_rate' => $successRate,
            'pending_transfers' => $this->safeCount($pdo, "SELECT COUNT(*) FROM transfer_orders WHERE status IN ('PROCESSING','PAYOUT_PENDING','PAYMENT_PENDING')"),
            'failed_transfers' => $failed,
            'kyc_pending' => $kycPending,
            'providers' => [
                'cashramp' => $cashramp['status'] ?? 'unknown',
                'sumsub' => (new \AmotPay\Identity\Sumsub\SumsubAdapter())->isConfigured() ? 'configured' : 'not_configured',
            ],
            'risk_alerts' => 0,
        ];
    }

    /** @return array<string, mixed> */
    public function listCapabilities(array $filters): array
    {
        AdminContext::require(AdminPermission::CONFIG_WRITE);
        $pdo = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (($filters['provider'] ?? '') !== '') {
            $where[] = 'provider = ?';
            $params[] = strtoupper((string) $filters['provider']);
        }
        if (($filters['country'] ?? '') !== '' && preg_match('/^[A-Z]{2}$/', (string) $filters['country'])) {
            $where[] = '(country_code = ? OR country_code IS NULL)';
            $params[] = $filters['country'];
        }
        if (($filters['type'] ?? '') !== '') {
            $where[] = 'capability_type = ?';
            $params[] = $filters['type'];
        }

        $limit = max(1, min((int) ($filters['limit'] ?? 100), 500));
        $stmt = $pdo->prepare(
            'SELECT provider, capability_type, capability_key, country_code, currency, status,
                    min_amount, max_amount, metadata, synced_at, updated_at
             FROM provider_capabilities WHERE ' . implode(' AND ', $where) . ' ORDER BY capability_type, capability_key LIMIT ?'
        );
        $i = 1;
        foreach ($params as $p) {
            $stmt->bindValue($i++, $p);
        }
        $stmt->bindValue($i, $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();
        foreach ($items as &$row) {
            if (is_string($row['metadata'])) {
                $row['metadata'] = json_decode($row['metadata'], true);
            }
        }

        return ['items' => $items, 'grouped' => $this->groupCapabilities($items)];
    }

    /** @return array<string, mixed> */
    public function listCountries(): array
    {
        AdminContext::require(AdminPermission::CONFIG_WRITE);
        $pdo = Database::connection();
        $countries = $pdo->query(
            'SELECT code, name, currency, active FROM countries ORDER BY name'
        )->fetchAll();

        foreach ($countries as &$country) {
            $caps = $this->capabilities->listByCountry($country['code']);
            $available = array_filter($caps, static fn ($c) => ($c['status'] ?? '') === 'AVAILABLE');
            $country['capabilities_count'] = count($caps);
            $country['operations_available'] = count($available) > 0;
            $country['display_status'] = $country['active'] && count($available) > 0
                ? 'Active'
                : ($country['active'] ? 'Limited' : 'Inactive');
        }

        return ['items' => $countries];
    }

    /** @return array<string, mixed> */
    public function listPaymentMethods(array $filters): array
    {
        AdminContext::require(AdminPermission::CONFIG_WRITE);
        $where = ['provider = ?'];
        $params = ['CASHRAMP'];

        if (preg_match('/^[A-Z]{2}$/', (string) ($filters['country'] ?? ''))) {
            $where[] = 'country_code = ?';
            $params[] = $filters['country'];
        }

        $stmt = Database::connection()->prepare(
            'SELECT country_code, provider_code, name, type, currency, min_amount, max_amount, active
             FROM payment_methods WHERE ' . implode(' AND ', $where) . ' ORDER BY country_code, name'
        );
        $stmt->execute($params);

        return ['items' => $stmt->fetchAll()];
    }

    /** @param array<int, array<string, mixed>> $items */
    private function groupCapabilities(array $items): array
    {
        $groups = [
            'countries' => [],
            'currencies' => [],
            'payment_methods' => [],
            'payout_methods' => [],
            'assets' => [],
            'networks' => [],
            'accounts' => [],
            'cards' => [],
            'other' => [],
        ];

        foreach ($items as $item) {
            $type = $item['capability_type'] ?? 'other';
            $bucket = match ($type) {
                'country' => 'countries',
                'currency' => 'currencies',
                'payment_method' => 'payment_methods',
                'payout_method' => 'payout_methods',
                'asset' => 'assets',
                'network' => 'networks',
                'account' => 'accounts',
                'card' => 'cards',
                default => 'other',
            };
            $groups[$bucket][] = $item;
        }

        return $groups;
    }

    private function safeCount(\PDO $pdo, string $sql): int
    {
        try {
            return (int) $pdo->query($sql)->fetchColumn();
        } catch (\PDOException) {
            return 0;
        }
    }
}
