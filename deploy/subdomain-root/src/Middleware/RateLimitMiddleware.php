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
        try {
            $this->apply($request);
        } catch (\Throwable) {
            try {
                $pdo = Database::connection();
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
            } catch (\Throwable) {
            }
            if (preg_match('#^/api/(auth|admin|transfers|webhooks)#', $request->path)) {
                Response::error('Service temporarily unavailable', 503, 'RATE_LIMIT_UNAVAILABLE');
            }
        }
    }

    private function apply(Request $request): void
    {
        $limitKey = match (true) {
            str_starts_with($request->path, '/api/auth/'), $request->path === '/api/admin/login' => 'AUTH_RATE_LIMIT_PER_MINUTE',
            $request->path === '/api/transfers' => 'TRANSFER_RATE_LIMIT_PER_MINUTE',
            str_starts_with($request->path, '/api/webhooks/') => 'WEBHOOK_RATE_LIMIT_PER_MINUTE',
            default => 'RATE_LIMIT_PER_MINUTE',
        };
        $limit = max(1, (int) (Env::get($limitKey, '60') ?? '60'));
        $ip = $request->clientIp();
        $key = hash('sha256', $ip . ':' . $request->path);

        $pdo = Database::connection();
        $pdo->prepare('INSERT IGNORE INTO rate_limits (key_hash, count) VALUES (?, 0)')->execute([$key]);
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT count, window_start FROM rate_limits WHERE key_hash = ? FOR UPDATE');
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        $windowStart = strtotime($row['window_start']);
        if (time() - $windowStart > 60) {
            $pdo->prepare('UPDATE rate_limits SET count = 1, window_start = NOW() WHERE key_hash = ?')->execute([$key]);
            $pdo->commit();
            return;
        }

        if ((int) $row['count'] >= $limit) {
            $pdo->rollBack();
            Response::error('Rate limit exceeded', 429, 'RATE_LIMIT');
        }

        $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE key_hash = ?')->execute([$key]);
        $pdo->commit();
    }
}
