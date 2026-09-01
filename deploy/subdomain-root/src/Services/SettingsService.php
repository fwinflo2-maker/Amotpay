<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Utils\CryptoUtil;

final class SettingsService
{
    private const KEYS = [
        // Legacy Magma (read-only / historical)
        'MAGMA_API_URL',
        'MAGMA_PRIVATE_KEY',
        'MAGMA_SECRET_KEY',
        'MAGMA_WEBHOOK_SECRET',
        // Cashramp — sole financial provider
        'CASHRAMP_API_URL',
        'CASHRAMP_PUBLIC_KEY',
        'CASHRAMP_SECRET_KEY',
        'CASHRAMP_WEBHOOK_SECRET',
        'CASHRAMP_ENVIRONMENT',
        // Sumsub — identity / KYC
        'SUMSUB_APP_TOKEN',
        'SUMSUB_SECRET_KEY',
        'SUMSUB_WEBHOOK_SECRET',
        'SUMSUB_LEVEL_NAME',
        'SUMSUB_BASE_URL',
    ];

    public function get(string $key, ?string $envFallback = null): ?string
    {
        $pdo = Database::connection();
        $row = $this->fetchSettingRow($pdo, $key);
        if ($row) {
            if (!empty($row['disabled'])) {
                return null;
            }
            try {
                return CryptoUtil::decrypt($row['setting_value']);
            } catch (\Throwable) {
                return null;
            }
        }
        $env = Env::get($key, $envFallback);
        return ($env !== null && $env !== '') ? $env : null;
    }

    /** @return array<string, mixed>|null */
    private function fetchSettingRow(\PDO $pdo, string $key): ?array
    {
        try {
            $stmt = $pdo->prepare('SELECT setting_value, disabled FROM provider_settings WHERE setting_key = ?');
            $stmt->execute([$key]);
            $row = $stmt->fetch();

            return $row ?: null;
        } catch (\PDOException) {
            $stmt = $pdo->prepare('SELECT setting_value FROM provider_settings WHERE setting_key = ?');
            $stmt->execute([$key]);
            $row = $stmt->fetch();

            return $row ?: null;
        }
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
            $this->validateKey($key, $val);
            $stmt->execute([$key, CryptoUtil::encrypt($val)]);
            $pdo->prepare(
                'UPDATE provider_settings SET encryption_version = 2, rotated_at = NULL, disabled = 0 WHERE setting_key = ?'
            )->execute([$key]);
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

    public function getWebhookUrls(): array
    {
        $base = rtrim(Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/');

        return [
            'cashramp' => $base . '/api/webhooks/cashramp',
            'sumsub' => $base . '/api/webhooks/sumsub',
            'magma_legacy' => $base . '/api/webhooks/magma',
        ];
    }

    public function getMagmaSetupUrls(): array
    {
        $base = rtrim(Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/');
        return [
            'webhook_url' => $base . '/api/webhooks/magma',
            'legacy' => true,
            'secret_key_rules' => [
                'min_length' => 40,
                'must_include' => 'letters, numbers, special chars (@$!%*#?&-_)',
            ],
            'server_outbound_ip' => $this->detectOutboundIp(),
        ];
    }

    public function getSumsubSetupUrls(): array
    {
        return [
            'webhook_url' => $this->getWebhookUrls()['sumsub'],
            'level_name' => $this->get('SUMSUB_LEVEL_NAME', 'id-and-liveness'),
        ];
    }

    public function getCashrampSetupUrls(): array
    {
        return [
            'webhook_url' => $this->getWebhookUrls()['cashramp'],
            'environment' => $this->get('CASHRAMP_ENVIRONMENT', 'sandbox'),
            'api_url' => $this->get(
                'CASHRAMP_API_URL',
                'https://staging.api.useaccrue.com/cashramp/api/graphql'
            ),
        ];
    }

    private function validateKey(string $key, string $val): void
    {
        if ($key === 'MAGMA_API_URL' && !filter_var($val, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('Invalid MAGMA_API_URL');
        }
        if ($key === 'MAGMA_API_URL' && parse_url($val, PHP_URL_SCHEME) !== 'https') {
            throw new \InvalidArgumentException('MAGMA_API_URL must use HTTPS');
        }
        if ($key === 'CASHRAMP_API_URL' && !filter_var($val, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('Invalid CASHRAMP_API_URL');
        }
        if ($key === 'SUMSUB_BASE_URL' && !filter_var($val, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('Invalid SUMSUB_BASE_URL');
        }
        if ($key === 'CASHRAMP_ENVIRONMENT' && !in_array($val, ['sandbox', 'production'], true)) {
            throw new \InvalidArgumentException('CASHRAMP_ENVIRONMENT must be sandbox or production');
        }
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
