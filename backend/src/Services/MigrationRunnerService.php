<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Database\Database;
use PDO;
use RuntimeException;

final class MigrationRunnerService
{
    /** @return list<string> */
    public function applyPending(?string $migrationsDir = null): array
    {
        $dir = $migrationsDir ?? dirname(__DIR__, 2) . '/migrations';
        if (!is_dir($dir)) {
            $dir = dirname(__DIR__, 2) . '/_migrate/migrations';
        }
        if (!is_dir($dir)) {
            throw new RuntimeException('Migrations directory not found');
        }

        $pdo = Database::connection();
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                migration VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $this->bootstrapLegacyMigrations($pdo);
        $this->ensurePayoutEnabledColumn($pdo);

        $applied = array_fill_keys(
            $pdo->query('SELECT migration FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN),
            true
        );

        $files = glob($dir . '/*.sql') ?: [];
        sort($files, SORT_STRING);
        $ran = [];

        foreach ($files as $file) {
            $name = basename($file);
            if (isset($applied[$name])) {
                continue;
            }

            $sql = file_get_contents($file);
            if ($sql === false) {
                throw new RuntimeException("Cannot read migration {$name}");
            }
            $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
            $statements = array_filter(array_map('trim', preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: []));

            foreach ($statements as $statement) {
                $pdo->exec($statement);
            }
            $pdo->prepare('INSERT INTO schema_migrations (migration) VALUES (?)')->execute([$name]);
            $ran[] = $name;
        }

        return $ran;
    }

    private function bootstrapLegacyMigrations(\PDO $pdo): void
    {
        $hasUsers = $this->tableExists($pdo, 'users');
        if (!$hasUsers) {
            return;
        }

        $legacy = [
            '001_initial_schema.sql' => 'users',
            '002_seed_data.sql' => 'users',
            '003_provider_settings.sql' => 'provider_settings',
        ];

        foreach ($legacy as $migration => $markerTable) {
            if (!$this->tableExists($pdo, $markerTable)) {
                continue;
            }
            $stmt = $pdo->prepare('INSERT IGNORE INTO schema_migrations (migration) VALUES (?)');
            $stmt->execute([$migration]);
        }
    }

    private function tableExists(\PDO $pdo, string $table): bool
    {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = ?'
        );
        $stmt->execute([$table]);
        return (int) $stmt->fetchColumn() > 0;
    }

    private function ensurePayoutEnabledColumn(\PDO $pdo): void
    {
        if (!$this->tableExists($pdo, 'users')) {
            return;
        }

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
        );
        $stmt->execute(['users', 'payout_enabled']);
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $pdo->exec('ALTER TABLE users ADD COLUMN payout_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER status');
    }
}
