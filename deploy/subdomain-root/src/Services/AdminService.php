<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;

final class AdminService
{
    public function login(string $pin): array
    {
        $expected = Env::require('ADMIN_PIN');
        if (!hash_equals($expected, $pin)) {
            throw new \InvalidArgumentException('Code admin incorrect');
        }

        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 24 HOUR))'
        )->execute([$hash]);

        return ['token' => $token, 'expires_in_hours' => 24];
    }

    public function validateToken(?string $token): bool
    {
        if ($token === null || $token === '') {
            return false;
        }
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT id FROM admin_sessions WHERE token_hash = ? AND expires_at > NOW()'
        );
        $stmt->execute([hash('sha256', $token)]);
        return (bool) $stmt->fetch();
    }

    public function logout(?string $token): void
    {
        if (!$token) {
            return;
        }
        $pdo = Database::connection();
        $pdo->prepare('DELETE FROM admin_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }
}
