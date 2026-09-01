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
        'admin_credentials',
    ];

    /** @return array<string, mixed> */
    public function status(): array
    {
        try {
            $pdo = Database::connection();
            $applied = $this->fetchAppliedMigrations($pdo);
        } catch (\Throwable $e) {
            return $this->pendingStatus('database_unavailable: ' . $e->getMessage());
        }

        if ($applied === null) {
            return $this->pendingStatus('schema_migrations_missing');
        }

        $migration005 = $this->findMigration($applied, '005_global_platform_foundation.sql');
        $migration006 = $this->findMigration($applied, '006_admin_providers_rbac.sql');
        $migration007 = $this->findMigration($applied, '007_reconciliation.sql');
        $migration008 = $this->findMigration($applied, '008_admin_credentials.sql');
        $migration009 = $this->findMigration($applied, '009_admin_sessions_security.sql');
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
                '008_admin_credentials.sql' => [
                    'status' => $migration008 ? 'APPLIED' : 'PENDING',
                    'applied_at' => $migration008['applied_at'] ?? null,
                ],
                '009_admin_sessions_security.sql' => [
                    'status' => $migration009 ? 'APPLIED' : 'PENDING',
                    'applied_at' => $migration009['applied_at'] ?? null,
                ],
            ],
            'tables' => $tables,
            'ready' => $migration005 !== null
                && $migration006 !== null
                && $migration007 !== null
                && $migration008 !== null
                && $migration009 !== null
                && $tables['missing'] === [],
        ];
    }

    /** @return array<int, array<string, mixed>>|null */
    private function fetchAppliedMigrations(\PDO $pdo): ?array
    {
        $exists = $pdo->query(
            "SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'schema_migrations'"
        )->fetchColumn();
        if ((int) $exists === 0) {
            return null;
        }

        return $pdo->query('SELECT migration, applied_at FROM schema_migrations ORDER BY migration')->fetchAll();
    }

    /** @return array<string, mixed> */
    private function pendingStatus(string $reason): array
    {
        $pending = ['status' => 'PENDING', 'applied_at' => null];
        return [
            'migrations' => [
                '005_global_platform_foundation.sql' => $pending,
                '006_admin_providers_rbac.sql' => $pending,
                '007_reconciliation.sql' => $pending,
                '008_admin_credentials.sql' => $pending,
                '009_admin_sessions_security.sql' => $pending,
            ],
            'tables' => ['present' => [], 'missing' => self::REQUIRED_TABLES],
            'ready' => false,
            'note' => $reason,
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
