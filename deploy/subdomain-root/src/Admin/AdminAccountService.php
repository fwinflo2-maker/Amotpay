<?php

declare(strict_types=1);

namespace AmotPay\Admin;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\ApiException;
use PDO;
use PDOException;

final class AdminAccountService
{
    private const ROW_ID = 1;
    private const MAX_FAILED_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;

    public function __construct(
        private AdminBootstrapService $bootstrap = new AdminBootstrapService(),
        private AdminTotpService $totp = new AdminTotpService()
    ) {}

    /** @return array{username: string, source: string, status: string, totp_enabled: bool, password_change_required: bool} */
    public function getAccountInfo(): array
    {
        $this->bootstrap->bootstrapIfNeeded();
        $stored = $this->fetchStored();
        if ($stored !== null) {
        return [
            'username' => $stored['username'],
            'source' => 'database',
            'status' => $stored['status'],
            'role' => 'SUPER_ADMIN',
            'totp_enabled' => (bool) $stored['totp_enabled'],
            'password_change_required' => $stored['status'] === 'PASSWORD_CHANGE_REQUIRED',
        ];
        }

        return [
            'username' => $this->envUsername(),
            'source' => 'environment',
            'status' => 'ACTIVE',
            'role' => 'SUPER_ADMIN',
            'totp_enabled' => false,
            'password_change_required' => false,
        ];
    }

    public function verify(string $username, string $password, ?string $totpCode = null): bool
    {
        $this->bootstrap->bootstrapIfNeeded();
        $username = trim($username);
        if ($username === '' || $password === '') {
            return false;
        }

        $stored = $this->fetchStored();
        if ($stored !== null) {
            if (!hash_equals(strtolower($stored['username']), strtolower($username))) {
                return false;
            }
            if (!password_verify($password, $stored['password_hash'])) {
                $this->recordFailedLogin();

                return false;
            }
            if ($stored['totp_enabled'] && $stored['totp_secret']) {
                if ($totpCode === null || !$this->totp->verify($stored['totp_secret'], $totpCode)) {
                    return false;
                }
            }
            $this->clearFailedLogin();

            return true;
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

    public function assertCanAuthenticate(string $username): void
    {
        $stored = $this->fetchStored();
        if ($stored === null) {
            return;
        }
        if (!hash_equals(strtolower($stored['username']), strtolower(trim($username)))) {
            throw new ApiException('Invalid admin credentials', 401, 'INVALID_ADMIN_CREDENTIALS');
        }
        if ($stored['status'] === 'DISABLED') {
            throw new ApiException('Admin account is disabled', 403, 'ADMIN_DISABLED');
        }
        if ($stored['status'] === 'LOCKED' && $this->isLocked($stored)) {
            throw new ApiException('Admin account is temporarily locked', 403, 'ADMIN_LOCKED');
        }
        if ($stored['status'] === 'LOCKED' && !$this->isLocked($stored)) {
            $this->upsertCredentials(
                $stored['username'],
                $stored['password_hash'],
                'ACTIVE',
                0,
                $stored['totp_secret'],
                (bool) $stored['totp_enabled'],
                null
            );
        }
    }

    public function assertPassword(string $password): void
    {
        $info = $this->getAccountInfo();
        if (!$this->verify($info['username'], $password)) {
            throw new ApiException('Invalid admin password', 403, 'INVALID_CONFIRMATION');
        }
    }

    /** @return array{username: string, updated: bool} */
    public function changeUsername(string $currentPassword, string $newUsername, ?string $ip = null): array
    {
        $this->assertPassword($currentPassword);
        $newUsername = $this->validateUsername($newUsername);

        $hash = $this->requireStoredPasswordHash();
        $this->upsertCredentials($newUsername, $hash, $this->currentStatus(), null, null, false);

        \AmotPay\Services\AuditService::log('admin.username.changed', null, 'admin_account', (string) self::ROW_ID, $ip, [
            'username' => $newUsername,
        ]);

        return ['username' => $newUsername, 'updated' => true];
    }

    /** @return array{username: string, updated: bool, password_change_required: bool} */
    public function changePassword(
        string $currentPassword,
        string $newPassword,
        ?string $confirmPassword = null,
        ?string $ip = null,
        bool $revokeOtherSessions = false
    ): array {
        if ($confirmPassword !== null && $newPassword !== $confirmPassword) {
            throw new ApiException('Passwords do not match', 422, 'VALIDATION_ERROR');
        }
        $this->assertPassword($currentPassword);
        $this->validatePassword($newPassword);

        $info = $this->getAccountInfo();
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->upsertCredentials($info['username'], $hash, 'ACTIVE', 0, null, null);

        \AmotPay\Services\AuditService::log('admin.password.changed', null, 'admin_account', (string) self::ROW_ID, $ip, [
            'username' => $info['username'],
            'revoke_other_sessions' => $revokeOtherSessions,
        ]);

        return [
            'username' => $info['username'],
            'updated' => true,
            'password_change_required' => false,
        ];
    }

    /** @return array{username: string, updated: bool} */
    public function updateCredentials(
        string $currentPassword,
        string $newUsername,
        string $newPassword,
        ?string $ip = null
    ): array {
        $this->assertPassword($currentPassword);
        $newUsername = $this->validateUsername($newUsername);
        $this->validatePassword($newPassword);

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->upsertCredentials($newUsername, $hash, 'ACTIVE', 0, null, null);

        \AmotPay\Services\AuditService::log('admin.credentials.update', null, 'admin_account', (string) self::ROW_ID, $ip, [
            'username' => $newUsername,
        ]);

        return ['username' => $newUsername, 'updated' => true];
    }

    /** @return array{secret: string, provisioning_uri: string} */
    public function setupTwoFactor(string $currentPassword): array
    {
        $this->assertPassword($currentPassword);
        $info = $this->getAccountInfo();
        $secret = $this->totp->generateSecret();
        $hash = $this->requireStoredPasswordHash();
        $this->upsertCredentials(
            $info['username'],
            $hash,
            $this->currentStatus(),
            null,
            $secret,
            false
        );

        return [
            'secret' => $secret,
            'provisioning_uri' => $this->totp->provisioningUri('AMOTPay Admin', $info['username'], $secret),
        ];
    }

    public function enableTwoFactor(string $currentPassword, string $code, ?string $ip = null): array
    {
        $this->assertPassword($currentPassword);
        $stored = $this->fetchStored();
        if ($stored === null || empty($stored['totp_secret'])) {
            throw new ApiException('2FA setup required before enable', 422, 'TOTP_SETUP_REQUIRED');
        }
        if (!$this->totp->verify($stored['totp_secret'], $code)) {
            throw new ApiException('Invalid 2FA code', 403, 'INVALID_TOTP');
        }

        $this->upsertCredentials(
            $stored['username'],
            $stored['password_hash'],
            $stored['status'],
            (int) $stored['failed_login_attempts'],
            $stored['totp_secret'],
            true
        );

        \AmotPay\Services\AuditService::log('admin.2fa.enabled', null, 'admin_account', (string) self::ROW_ID, $ip);

        return ['totp_enabled' => true];
    }

    public function disableTwoFactor(string $currentPassword, string $code, ?string $ip = null): array
    {
        $this->assertPassword($currentPassword);
        $stored = $this->fetchStored();
        if ($stored === null || !(bool) $stored['totp_enabled']) {
            throw new ApiException('2FA is not enabled', 422, 'TOTP_NOT_ENABLED');
        }
        if (!$this->totp->verify((string) $stored['totp_secret'], $code)) {
            throw new ApiException('Invalid 2FA code', 403, 'INVALID_TOTP');
        }

        $this->upsertCredentials(
            $stored['username'],
            $stored['password_hash'],
            $stored['status'],
            (int) $stored['failed_login_attempts'],
            null,
            false
        );

        \AmotPay\Services\AuditService::log('admin.2fa.disabled', null, 'admin_account', (string) self::ROW_ID, $ip);

        return ['totp_enabled' => false];
    }

    public function isConfigured(): bool
    {
        $this->bootstrap->bootstrapIfNeeded();
        if ($this->fetchStored() !== null) {
            return true;
        }

        return $this->envPassword() !== null && strlen($this->envPassword() ?? '') >= 8;
    }

    public function requiresPasswordChange(): bool
    {
        $stored = $this->fetchStored();

        return $stored !== null && $stored['status'] === 'PASSWORD_CHANGE_REQUIRED';
    }

    public function requiresTotp(): bool
    {
        $stored = $this->fetchStored();

        return $stored !== null && (bool) $stored['totp_enabled'];
    }

    /** @return array{username: string, password_hash: string, status: string, failed_login_attempts: int, locked_until: ?string, totp_secret: ?string, totp_enabled: bool}|null */
    private function fetchStored(): ?array
    {
        try {
            $stmt = Database::connection()->prepare(
                'SELECT username, password_hash, status, failed_login_attempts, locked_until, totp_secret, totp_enabled
                 FROM admin_credentials WHERE id = ?'
            );
            $stmt->execute([self::ROW_ID]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || empty($row['username']) || empty($row['password_hash'])) {
                return null;
            }

            return [
                'username' => (string) $row['username'],
                'password_hash' => (string) $row['password_hash'],
                'status' => (string) ($row['status'] ?? 'ACTIVE'),
                'failed_login_attempts' => (int) ($row['failed_login_attempts'] ?? 0),
                'locked_until' => $row['locked_until'] !== null ? (string) $row['locked_until'] : null,
                'totp_secret' => $row['totp_secret'] !== null ? (string) $row['totp_secret'] : null,
                'totp_enabled' => (bool) ($row['totp_enabled'] ?? false),
            ];
        } catch (PDOException) {
            return null;
        }
    }

    private function recordFailedLogin(): void
    {
        $stored = $this->fetchStored();
        if ($stored === null) {
            return;
        }
        $attempts = (int) $stored['failed_login_attempts'] + 1;
        $lockedUntil = null;
        $status = $stored['status'];
        if ($attempts >= self::MAX_FAILED_ATTEMPTS) {
            $lockedUntil = date('Y-m-d H:i:s', time() + (self::LOCK_MINUTES * 60));
            $status = 'LOCKED';
        }
        $this->upsertCredentials(
            $stored['username'],
            $stored['password_hash'],
            $status,
            $attempts,
            $stored['totp_secret'],
            (bool) $stored['totp_enabled'],
            $lockedUntil
        );
    }

    private function clearFailedLogin(): void
    {
        $stored = $this->fetchStored();
        if ($stored === null) {
            return;
        }
        $status = $stored['status'] === 'LOCKED' ? 'ACTIVE' : $stored['status'];
        $this->upsertCredentials(
            $stored['username'],
            $stored['password_hash'],
            $status,
            0,
            $stored['totp_secret'],
            (bool) $stored['totp_enabled'],
            null
        );
    }

    private function isLocked(array $stored): bool
    {
        if ($stored['locked_until'] === null) {
            return false;
        }

        return strtotime($stored['locked_until']) > time();
    }

    private function currentStatus(): string
    {
        $stored = $this->fetchStored();

        return $stored['status'] ?? 'ACTIVE';
    }

    private function requireStoredPasswordHash(): string
    {
        $stored = $this->fetchStored();
        if ($stored === null) {
            throw new ApiException('Save credentials to database first', 422, 'ADMIN_NOT_PERSISTED');
        }

        return $stored['password_hash'];
    }

    private function validateUsername(string $username): string
    {
        $username = trim($username);
        if (strlen($username) < 3 || strlen($username) > 100) {
            throw new ApiException('Username must be between 3 and 100 characters', 422, 'VALIDATION_ERROR');
        }
        if (!preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
            throw new ApiException('Username may only contain letters, numbers, dot, dash and underscore', 422, 'VALIDATION_ERROR');
        }

        return $username;
    }

    private function validatePassword(string $password): void
    {
        if (strlen($password) < 8) {
            throw new ApiException('Password must be at least 8 characters', 422, 'VALIDATION_ERROR');
        }
        if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
            throw new ApiException('Password must include letters and numbers', 422, 'VALIDATION_ERROR');
        }
    }

    private function upsertCredentials(
        string $username,
        string $passwordHash,
        string $status,
        ?int $failedAttempts = null,
        ?string $totpSecret = null,
        ?bool $totpEnabled = null,
        ?string $lockedUntil = null
    ): void {
        $stored = $this->fetchStored();
        $failedAttempts ??= $stored['failed_login_attempts'] ?? 0;
        $totpSecret = $totpSecret ?? ($stored['totp_secret'] ?? null);
        $totpEnabled = $totpEnabled ?? (bool) ($stored['totp_enabled'] ?? false);
        $lockedUntil = $lockedUntil ?? ($stored['locked_until'] ?? null);

        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO admin_credentials
                (id, username, password_hash, status, failed_login_attempts, locked_until, totp_secret, totp_enabled)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                password_hash = VALUES(password_hash),
                status = VALUES(status),
                failed_login_attempts = VALUES(failed_login_attempts),
                locked_until = VALUES(locked_until),
                totp_secret = VALUES(totp_secret),
                totp_enabled = VALUES(totp_enabled),
                updated_at = NOW()'
        )->execute([
            self::ROW_ID,
            $username,
            $passwordHash,
            $status,
            $failedAttempts,
            $lockedUntil,
            $totpSecret,
            (int) $totpEnabled,
        ]);
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
