<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;

final class AuthService
{
    public function register(array $data): array
    {
        $pdo = Database::connection();

        $country = $data['country_code'] ?? '';
        $stmt = $pdo->prepare('SELECT code, currency FROM countries WHERE code = ? AND active = 1');
        $stmt->execute([$country]);
        $countryRow = $stmt->fetch();
        if (!$countryRow) {
            throw new \InvalidArgumentException('Invalid country');
        }

        $phone = preg_replace('/\s+/', '', $data['phone'] ?? '');
        if ($phone === '') {
            throw new \InvalidArgumentException('Phone required');
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE phone = ?');
        $check->execute([$phone]);
        if ($check->fetch()) {
            throw new \InvalidArgumentException('Phone already registered');
        }

        $hash = password_hash($data['password'] ?? '', PASSWORD_BCRYPT);
        if ($hash === false) {
            throw new \RuntimeException('Password hash failed');
        }

        $insert = $pdo->prepare(
            'INSERT INTO users (first_name, last_name, phone, email, password_hash, country_code, currency)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            trim($data['first_name'] ?? ''),
            trim($data['last_name'] ?? ''),
            $phone,
            $data['email'] ?? null,
            $hash,
            $countryRow['code'],
            $countryRow['currency'],
        ]);

        $userId = (int) $pdo->lastInsertId();
        $this->initWallets($userId);

        return $this->issueToken($userId);
    }

    public function login(string $phone, string $password): array
    {
        $pdo = Database::connection();
        $phone = preg_replace('/\s+/', '', $phone);

        $stmt = $pdo->prepare('SELECT id, password_hash, status FROM users WHERE phone = ?');
        $stmt->execute([$phone]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \InvalidArgumentException('Invalid credentials');
        }
        if ($user['status'] !== 'active') {
            throw new \InvalidArgumentException('Account suspended');
        }

        return $this->issueToken((int) $user['id']);
    }

    public function logout(string $token): void
    {
        $pdo = Database::connection();
        $hash = hash('sha256', $token);
        $pdo->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([$hash]);
    }

    public function userFromToken(?string $token): ?array
    {
        if ($token === null || $token === '') {
            return null;
        }

        $pdo = Database::connection();
        $hash = hash('sha256', $token);
        $stmt = $pdo->prepare(
            'SELECT u.* FROM users u
             JOIN user_sessions s ON s.user_id = u.id
             WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = "active"'
        );
        $stmt->execute([$hash]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    private function issueToken(int $userId): array
    {
        $pdo = Database::connection();
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $hours = (int) (Env::get('JWT_EXPIRY_HOURS', '168') ?? '168');

        $pdo->prepare(
            'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))'
        )->execute([$userId, $hash, $hours]);

        $stmt = $pdo->prepare('SELECT id, first_name, last_name, phone, country_code, currency FROM users WHERE id = ?');
        $stmt->execute([$userId]);

        return [
            'token' => $token,
            'expires_in_hours' => $hours,
            'user' => $stmt->fetch(),
        ];
    }

    private function initWallets(int $userId): void
    {
        $pdo = Database::connection();
        $assets = [
            ['USDT', 'CELO'],
            ['USDC', 'CELO'],
            ['BTC', 'BTC'],
        ];

        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO wallets (user_id, asset, network, balance, available_balance) VALUES (?, ?, ?, 0, 0)'
        );
        foreach ($assets as [$asset, $network]) {
            $stmt->execute([$userId, $asset, $network]);
        }
    }
}
