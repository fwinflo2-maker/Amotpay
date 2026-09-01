<?php

declare(strict_types=1);

namespace AmotPay\Admin;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use PDO;
use PDOException;

final class AdminBootstrapService
{
    private const ROW_ID = 1;

    /** Create initial admin from BOOTSTRAP_* env when no row exists. Returns true if created. */
    public function bootstrapIfNeeded(): bool
    {
        if (!$this->tableExists() || $this->hasStoredAdmin()) {
            return false;
        }

        $username = trim((string) (Env::get('BOOTSTRAP_ADMIN_USERNAME', '') ?? ''));
        if ($username === '') {
            $username = trim((string) (Env::get('ADMIN_USERNAME', 'admin') ?? 'admin'));
        }
        $password = (string) (Env::get('BOOTSTRAP_ADMIN_PASSWORD', '') ?? '');
        if ($password === '' || strlen($password) < 8) {
            return false;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO admin_credentials (id, username, password_hash, status)
             VALUES (?, ?, ?, ?)'
        )->execute([self::ROW_ID, $username, $hash, 'PASSWORD_CHANGE_REQUIRED']);

        \AmotPay\Services\AuditService::log('admin.bootstrap', null, 'admin_account', (string) self::ROW_ID, null, [
            'username' => $username,
        ]);

        return true;
    }

    private function tableExists(): bool
    {
        try {
            $stmt = Database::connection()->query(
                "SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = 'admin_credentials'"
            );

            return (int) $stmt->fetchColumn() > 0;
        } catch (PDOException) {
            return false;
        }
    }

    private function hasStoredAdmin(): bool
    {
        try {
            $stmt = Database::connection()->prepare('SELECT id FROM admin_credentials WHERE id = ?');
            $stmt->execute([self::ROW_ID]);

            return (bool) $stmt->fetch();
        } catch (PDOException) {
            return false;
        }
    }
}
