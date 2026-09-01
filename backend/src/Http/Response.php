<?php

declare(strict_types=1);

namespace AmotPay\Http;

use AmotPay\Config\Env;

final class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = array_filter(array_map('trim', explode(',', Env::get('ALLOWED_ORIGINS', '') ?? '')));
        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Idempotency-Key');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    public static function error(string $message, int $status = 400, ?string $code = null): void
    {
        self::json([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code ?? 'ERROR',
            ],
        ], $status);
    }
}
