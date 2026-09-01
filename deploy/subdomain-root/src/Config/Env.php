<?php

declare(strict_types=1);

namespace AmotPay\Config;

final class Env
{
    private static array $cache = [];

    public static function load(string $path): void
    {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            self::$cache[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return self::$cache[$key] ?? $_ENV[$key] ?? getenv($key) ?: $default;
    }

    public static function require(string $key): string
    {
        $value = self::get($key);
        if ($value === null || $value === '') {
            throw new \RuntimeException("Missing required env: {$key}");
        }
        return $value;
    }
}
