<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Database\Database;

final class MigrationStatusService
{
    private const REQUIRED_TABLES = [
        'kyc_profiles',
        'kyc_verifications',
        'kyc_events',
        'feature_flags',
        'provider_capabilities',
        'country_capabilities',
        'product_limits',
        'quotes',
        'ledger_transactions',
        'ledger_entries',
        'provider_sync_logs',
        'provider_health_checks',
        'admin_roles',
        'transfer_orders',
        'reconciliation_records',
    ];

    /** @return array<string, mixed> */
    public function status(): array
    {
        $pdo = Database::connection();
        $applied = $pdo->query('SELECT migration, applied_at FROM schema_migrations ORDER BY migration')
            ->fetchAll();

        $migration005 = $this->findMigration($applied, '005_global_platform_foundation.sql');
        $migration006 = $this->findMigration($applied, '006_admin_providers_rbac.sql');

        $migration007 = $this->findMigration($applied, '007_reconciliation.sql');

        $tables = $this->verifyTables($pdo);

        return [
            'migrations' => [
                '005_global_platform_foundation.sql' => [
                    'status' => $migration005 ? 'APPLIED' : 'PENDING',
                    'applied_at' => $migration005['applied_at'] ?? null,
                ],
                '006_admin_providers_rbac.sql' => [
                    'status' => $migration006 ? 'APPLIED' : 'PENDING',
                    'applied_at' => $migration006['applied_at'] ?? null,
                ],
                '007_reconciliation.sql' => [
                    'status' => $migration007 ? 'APPLIED' : 'PENDING',
                    'applied_at' => $migration007['applied_at'] ?? null,
                ],
            ],
            'tables' => $tables,
            'ready' => $migration005 !== null
                && $migration006 !== null
                && $tables['missing'] === [],
        ];
    }

    /** @param array<int, array<string, mixed>> $applied */
    private function findMigration(array $applied, string $name): ?array
    {
        foreach ($applied as $row) {
            if ($row['migration'] === $name) {
                return $row;
            }
        }

        return null;
    }

    /** @return array{present: list<string>, missing: list<string>} */
    private function verifyTables(\PDO $pdo): array
    {
        $present = [];
        $missing = [];

        foreach (self::REQUIRED_TABLES as $table) {
            $stmt = $pdo->prepare(
                'SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = ?'
            );
            $stmt->execute([$table]);
            if ((int) $stmt->fetchColumn() > 0) {
                $present[] = $table;
            } else {
                $missing[] = $table;
            }
        }

        return ['present' => $present, 'missing' => $missing];
    }
}
