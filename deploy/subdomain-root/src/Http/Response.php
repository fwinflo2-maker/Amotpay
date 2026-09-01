<?php

declare(strict_types=1);

namespace AmotPay\Http;

final class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Idempotency-Key');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
