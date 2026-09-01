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

    public function bootstrapIfNeeded(): bool
    {
        if (!$this->tableExists() || $this->hasStoredAdmin()) {
            return false;
        }

        $username = trim((string) (Env::get('BOOTSTRAP_ADMIN_USERNAME', '') ?? ''));
        if ($username === '') {
            $username = 'admin';
        }
        $password = (string) (Env::get('BOOTSTRAP_ADMIN_PASSWORD', '') ?? '');
        if ($password === '' || strlen($password) < 8) {
            return false;
        }

        $this->createAdmin($username, $password, 'PASSWORD_CHANGE_REQUIRED');

        return true;
    }

    public function createAdmin(string $username, string $password, string $status = 'ACTIVE'): void
    {
        if (!$this->tableExists()) {
            throw new \RuntimeException('admin_credentials table does not exist — run migration 008 first');
        }
        if ($this->hasStoredAdmin()) {
            throw new \RuntimeException('Admin account already exists in database');
        }

        $username = trim($username);
        if ($username === '' || strlen($password) < 8) {
            throw new \RuntimeException('Invalid bootstrap admin username or password');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO admin_credentials (id, username, password_hash, status)
             VALUES (?, ?, ?, ?)'
        )->execute([self::ROW_ID, $username, $hash, $status]);

        \AmotPay\Services\AuditService::log('admin.bootstrap', null, 'admin_account', (string) self::ROW_ID, null, [
            'username' => $username,
        ]);
    }

    public function credentialsTableExists(): bool
    {
        return $this->tableExists();
    }

    public function hasAdmin(): bool
    {
        return $this->hasStoredAdmin();
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
