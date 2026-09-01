<?php

declare(strict_types=1);

namespace AmotPay\Admin;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\ApiException;

final class AdminAccountService
{
    private const ROW_ID = 1;

    /** @return array{username: string, source: string} */
    public function getAccountInfo(): array
    {
        $stored = $this->fetchStored();
        if ($stored !== null) {
            return ['username' => $stored['username'], 'source' => 'database'];
        }

        return ['username' => $this->envUsername(), 'source' => 'environment'];
    }

    public function verify(string $username, string $password): bool
    {
        $username = trim($username);
        if ($username === '' || $password === '') {
            return false;
        }

        $stored = $this->fetchStored();
        if ($stored !== null) {
            return hash_equals(strtolower($stored['username']), strtolower($username))
                && password_verify($password, $stored['password_hash']);
        }

        if (!hash_equals(strtolower($this->envUsername()), strtolower($username))) {
            return false;
        }

        $envPassword = $this->envPassword();
        if ($envPassword === null) {
            return false;
        }

        return hash_equals($envPassword, $password);
    }

    public function assertPassword(string $password): void
    {
        $info = $this->getAccountInfo();
        if (!$this->verify($info['username'], $password)) {
            throw new ApiException('Invalid admin password', 403, 'INVALID_CONFIRMATION');
        }
    }

    /** @return array{username: string, updated: bool} */
    public function updateCredentials(
        string $currentPassword,
        string $newUsername,
        string $newPassword,
        ?string $ip = null
    ): array {
        $info = $this->getAccountInfo();
        if (!$this->verify($info['username'], $currentPassword)) {
            throw new ApiException('Current password is incorrect', 403, 'INVALID_CURRENT_PASSWORD');
        }

        $newUsername = trim($newUsername);
        if (strlen($newUsername) < 3 || strlen($newUsername) > 100) {
            throw new ApiException('Username must be between 3 and 100 characters', 422, 'VALIDATION_ERROR');
        }
        if (!preg_match('/^[a-zA-Z0-9._-]+$/', $newUsername)) {
            throw new ApiException('Username may only contain letters, numbers, dot, dash and underscore', 422, 'VALIDATION_ERROR');
        }
        if (strlen($newPassword) < 8) {
            throw new ApiException('Password must be at least 8 characters', 422, 'VALIDATION_ERROR');
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO admin_credentials (id, username, password_hash)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash), updated_at = NOW()'
        )->execute([self::ROW_ID, $newUsername, $hash]);

        \AmotPay\Services\AuditService::log('admin.credentials.update', null, 'admin_account', (string) self::ROW_ID, $ip, [
            'username' => $newUsername,
        ]);

        return ['username' => $newUsername, 'updated' => true];
    }

    public function isConfigured(): bool
    {
        if ($this->fetchStored() !== null) {
            return true;
        }

        return $this->envPassword() !== null && strlen($this->envPassword() ?? '') >= 8;
    }

    /** @return array{username: string, password_hash: string}|null */
    private function fetchStored(): ?array
    {
        try {
            $stmt = Database::connection()->prepare(
                'SELECT username, password_hash FROM admin_credentials WHERE id = ?'
            );
            $stmt->execute([self::ROW_ID]);
            $row = $stmt->fetch();
            if (!$row || empty($row['username']) || empty($row['password_hash'])) {
                return null;
            }

            return ['username' => (string) $row['username'], 'password_hash' => (string) $row['password_hash']];
        } catch (\PDOException) {
            return null;
        }
    }

    private function envUsername(): string
    {
        $username = trim((string) (Env::get('ADMIN_USERNAME', '') ?? ''));
        if ($username !== '') {
            return $username;
        }

        return 'admin';
    }

    private function envPassword(): ?string
    {
        $password = Env::get('ADMIN_PASSWORD', '') ?? '';
        if ($password !== '' && strlen($password) >= 8) {
            return $password;
        }

        $pin = Env::get('ADMIN_PIN', '') ?? '';
        if ($pin !== '' && strlen($pin) >= 8) {
            return $pin;
        }

        return null;
    }
}
