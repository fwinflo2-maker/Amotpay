<?php

declare(strict_types=1);

namespace AmotPay\Http;

use AmotPay\Config\Env;

final class Cors
{
    /** Admin + local dev origins — never use wildcard for admin. */
    private const PRODUCTION_FALLBACK = [
        'https://admin-amotpay.nexustechnologies.cloud',
        'https://admin.amotpay.nexustechnologies.cloud',
        'http://localhost:5174',
    ];

    /** @return list<string> */
    public static function allowedOrigins(): array
    {
        $raw = Env::get('ALLOWED_ORIGINS', '') ?? '';
        $fromEnv = array_values(array_unique(array_filter(array_map('trim', explode(',', $raw)))));
        if ($fromEnv !== []) {
            return $fromEnv;
        }

        $appUrl = (string) (Env::get('APP_URL') ?? '');
        if (str_contains($appUrl, 'amotpay-api.nexustechnologies.cloud')) {
            return self::PRODUCTION_FALLBACK;
        }

        return [];
    }

    public static function apply(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = self::allowedOrigins();

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Idempotency-Key');
        header('Access-Control-Max-Age: 86400');

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
    }
}
