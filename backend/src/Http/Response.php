<?php

declare(strict_types=1);

namespace AmotPay\Http;

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
        Cors::apply();
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
