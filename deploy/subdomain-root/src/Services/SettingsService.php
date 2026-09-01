<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Utils\CryptoUtil;

final class SettingsService
{
    private const KEYS = [
        'MAGMA_API_URL',
        'MAGMA_PRIVATE_KEY',
        'MAGMA_SECRET_KEY',
        'MAGMA_WEBHOOK_SECRET',
        'CASHRAMP_API_URL',
        'CASHRAMP_SECRET_KEY',
        'CASHRAMP_PUBLIC_KEY',
        'CASHRAMP_WEBHOOK_TOKEN',
    ];

    public function get(string $key, ?string $envFallback = null): ?string
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT setting_value FROM provider_settings WHERE setting_key = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        if ($row) {
            try {
                return CryptoUtil::decrypt($row['setting_value']);
            } catch (\Throwable) {
                return null;
            }
        }
        $env = Env::get($key, $envFallback);
        return ($env !== null && $env !== '') ? $env : null;
    }

    public function setMany(array $values): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO provider_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()'
        );

        foreach (self::KEYS as $key) {
            if (!array_key_exists($key, $values)) {
                continue;
            }
            $val = trim((string) ($values[$key] ?? ''));
            if ($val === '') {
                $pdo->prepare('DELETE FROM provider_settings WHERE setting_key = ?')->execute([$key]);
                continue;
            }
            $stmt->execute([$key, CryptoUtil::encrypt($val)]);
        }
    }

    public function getMaskedForAdmin(): array
    {
        $out = [];
        foreach (self::KEYS as $key) {
            $val = $this->get($key);
            $out[$key] = [
                'configured' => $val !== null && $val !== '',
                'masked' => CryptoUtil::mask($val),
            ];
        }
        return $out;
    }

    public function getMagmaSetupUrls(): array
    {
        $base = rtrim(Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/');
        return [
            'webhook_url' => $base . '/webhooks/magma',
            'success_url' => $base . '/callbacks/magma/success',
            'error_url' => $base . '/callbacks/magma/error',
            'key_expiry_max_days' => 365,
            'secret_key_rules' => [
                'min_length' => 40,
                'must_include' => 'letters, numbers, special chars (@$!%*#?&-_)',
            ],
            'server_outbound_ip' => $this->detectOutboundIp(),
        ];
    }

    public function getCashrampSetupUrls(): array
    {
        $base = rtrim(Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/');
        return [
            'webhook_url' => $base . '/webhooks/cashramp',
            'staging_api' => 'https://staging.api.useaccrue.com/cashramp/api/graphql',
            'production_api' => 'https://api.useaccrue.com/cashramp/api/graphql',
        ];
    }

    private function detectOutboundIp(): ?string
    {
        $cached = $this->get('_SERVER_OUTBOUND_IP');
        if ($cached) {
            return $cached;
        }
        $ctx = stream_context_create(['http' => ['timeout' => 5]]);
        $ip = @file_get_contents('https://api.ipify.org', false, $ctx);
        if ($ip && filter_var(trim($ip), FILTER_VALIDATE_IP)) {
            $pdo = Database::connection();
            $enc = CryptoUtil::encrypt(trim($ip));
            $pdo->prepare(
                'INSERT INTO provider_settings (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
            )->execute(['_SERVER_OUTBOUND_IP', $enc]);
            return trim($ip);
        }
        return null;
    }
}
