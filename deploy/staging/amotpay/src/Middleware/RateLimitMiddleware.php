<?php

declare(strict_types=1);

namespace AmotPay\Middleware;

use AmotPay\Database\Database;
use AmotPay\Http\Request;
use AmotPay\Http\Response;
use AmotPay\Config\Env;

final class RateLimitMiddleware
{
    public function handle(Request $request): void
    {
        $limit = (int) (Env::get('RATE_LIMIT_PER_MINUTE', '60') ?? '60');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = hash('sha256', $ip . ':' . $request->path);

        $pdo = Database::connection();
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS rate_limits (
                key_hash VARCHAR(64) PRIMARY KEY,
                count INT NOT NULL DEFAULT 1,
                window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )'
        );

        $stmt = $pdo->prepare('SELECT count, window_start FROM rate_limits WHERE key_hash = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        if (!$row) {
            $pdo->prepare('INSERT INTO rate_limits (key_hash, count) VALUES (?, 1)')->execute([$key]);
            return;
        }

        $windowStart = strtotime($row['window_start']);
        if (time() - $windowStart > 60) {
            $pdo->prepare('UPDATE rate_limits SET count = 1, window_start = NOW() WHERE key_hash = ?')->execute([$key]);
            return;
        }

        if ((int) $row['count'] >= $limit) {
            Response::error('Rate limit exceeded', 429, 'RATE_LIMIT');
        }

        $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE key_hash = ?')->execute([$key]);
    }
}
