<?php

declare(strict_types=1);

namespace AmotPay\Utils;

use AmotPay\Config\Env;

final class CryptoUtil
{
    public static function encrypt(string $plain): string
    {
        $key = hash('sha256', Env::require('APP_SECRET'), true);
        $iv = random_bytes(16);
        $cipher = openssl_encrypt($plain, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($cipher === false) {
            throw new \RuntimeException('Encryption failed');
        }
        return base64_encode($iv . $cipher);
    }

    public static function decrypt(string $encoded): string
    {
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
