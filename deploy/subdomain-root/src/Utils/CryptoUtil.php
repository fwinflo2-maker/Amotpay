<?php

declare(strict_types=1);

namespace AmotPay\Utils;

use AmotPay\Config\Env;

final class CryptoUtil
{
    public static function encrypt(string $plain): string
    {
        $key = hash('sha256', Env::require('APP_SECRET'), true);
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false) {
            throw new \RuntimeException('Encryption failed');
        }
        return 'v2:' . base64_encode($iv . $tag . $cipher);
    }

    public static function decrypt(string $encoded): string
    {
        if (str_starts_with($encoded, 'v2:')) {
            $raw = base64_decode(substr($encoded, 3), true);
            if ($raw === false || strlen($raw) < 29) {
                throw new \RuntimeException('Invalid encrypted payload');
            }
            $key = hash('sha256', Env::require('APP_SECRET'), true);
            $plain = openssl_decrypt(
                substr($raw, 28),
                'aes-256-gcm',
                $key,
                OPENSSL_RAW_DATA,
                substr($raw, 0, 12),
                substr($raw, 12, 16)
            );
            if ($plain === false) {
                throw new \RuntimeException('Decryption failed');
            }
            return $plain;
        }

        // Existing provider settings used CBC; retain read support so credentials can be rotated in place.
        $raw = base64_decode($encoded, true);
        if ($raw === false || strlen($raw) < 17) {
            throw new \RuntimeException('Invalid encrypted payload');
        }
        $key = hash('sha256', Env::require('APP_SECRET'), true);
        $iv = substr($raw, 0, 16);
        $cipher = substr($raw, 16);
        $plain = openssl_decrypt($cipher, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($plain === false) {
            throw new \RuntimeException('Decryption failed');
        }
        return $plain;
    }

    public static function mask(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $len = strlen($value);
        if ($len <= 8) {
            return str_repeat('*', $len);
        }
        return substr($value, 0, 4) . str_repeat('*', max(4, $len - 8)) . substr($value, -4);
    }
}
