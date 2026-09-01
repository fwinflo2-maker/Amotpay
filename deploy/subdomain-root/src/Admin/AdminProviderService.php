<?php

declare(strict_types=1);

namespace AmotPay\Admin;

use AmotPay\Database\Database;
use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;
use AmotPay\Http\ApiException;
use AmotPay\Identity\Sumsub\SumsubAdapter;
use AmotPay\Services\AuditService;
use AmotPay\Services\SettingsService;
use AmotPay\Utils\CryptoUtil;

final class AdminProviderService
{
    private const CASHRAMP_KEYS = [
        'CASHRAMP_API_URL',
        'CASHRAMP_PUBLIC_KEY',
        'CASHRAMP_SECRET_KEY',
        'CASHRAMP_WEBHOOK_SECRET',
        'CASHRAMP_ENVIRONMENT',
    ];

    private const SUMSUB_KEYS = [
        'SUMSUB_BASE_URL',
        'SUMSUB_APP_TOKEN',
        'SUMSUB_SECRET_KEY',
        'SUMSUB_WEBHOOK_SECRET',
        'SUMSUB_LEVEL_NAME',
    ];

    public function __construct(private SettingsService $settings = new SettingsService()) {}

  /** @return array<string, mixed> */
    public function getProvidersOverview(): array
    {
        AdminContext::require(AdminPermission::PROVIDER_CREDENTIALS_VIEW);

        return [
            'app_url' => rtrim(\AmotPay\Config\Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/'),
            'webhooks' => $this->settings->getWebhookUrls(),
            'cashramp' => $this->providerCard('CASHRAMP', self::CASHRAMP_KEYS),
            'sumsub' => $this->providerCard('SUMSUB', self::SUMSUB_KEYS),
        ];
    }

    /** @param array<string, mixed> $values */
    public function saveProviderCredentials(string $provider, array $values, ?string $ip): array
    {
        AdminContext::require(AdminPermission::PROVIDER_CREDENTIALS_WRITE);
        $keys = match (strtoupper($provider)) {
            'CASHRAMP' => self::CASHRAMP_KEYS,
            'SUMSUB' => self::SUMSUB_KEYS,
            default => throw new ApiException('Unknown provider', 422, 'VALIDATION_ERROR'),
        };

        $filtered = [];
        foreach ($keys as $key) {
            if (array_key_exists($key, $values)) {
                $filtered[$key] = $values[$key];
            }
        }

        if ($filtered === []) {
            throw new ApiException('No credentials supplied', 422, 'VALIDATION_ERROR');
        }

        $this->settings->setMany($filtered);
        $this->recordHealthCheck(strtoupper($provider), 'configured');

        AuditService::log('admin.provider.credentials.update', null, 'provider', strtoupper($provider), $ip, [
            'keys' => array_keys($filtered),
        ]);

        return $this->getProvidersOverview();
    }

    public function testConnection(string $provider, ?string $ip): array
    {
        AdminContext::require(AdminPermission::PROVIDER_CREDENTIALS_VIEW);
        $provider = strtoupper($provider);
        $start = hrtime(true);

        $result = match ($provider) {
            'CASHRAMP' => (new CashrampAdapter())->healthCheck(),
            'SUMSUB' => (new SumsubAdapter())->healthCheck(),
            default => throw new ApiException('Unknown provider', 422, 'VALIDATION_ERROR'),
        };

        $latencyMs = (int) ((hrtime(true) - $start) / 1_000_000);
        $connected = ($result['status'] ?? '') === 'ok' || ($result['status'] ?? '') === 'configured';
        $status = $connected ? 'CONNECTED' : 'DISCONNECTED';

        $this->recordHealthCheck($provider, strtolower($status), $latencyMs, $result);

        AuditService::log('admin.provider.test', null, 'provider', $provider, $ip, [
            'status' => $status,
            'latency_ms' => $latencyMs,
        ]);

        return [
            'provider' => $provider,
            'status' => $status,
            'latency_ms' => $latencyMs,
            'details' => $this->sanitizeHealthDetails($result),
        ];
    }

    /** @param array<string, mixed> $newSecrets */
    public function rotateCredentials(string $provider, array $newSecrets, ?string $confirmPassword, ?string $ip): array
    {
        AdminContext::require(AdminPermission::PROVIDER_CREDENTIALS_ROTATE);

        if ($confirmPassword === null || $confirmPassword === '') {
            throw new ApiException('Credential rotation requires admin confirmation', 403, 'CONFIRMATION_REQUIRED');
        }

        (new AdminAccountService())->assertPassword($confirmPassword);

        $provider = strtoupper($provider);
        $keys = match ($provider) {
            'CASHRAMP' => ['CASHRAMP_SECRET_KEY', 'CASHRAMP_WEBHOOK_SECRET'],
            'SUMSUB' => ['SUMSUB_SECRET_KEY', 'SUMSUB_WEBHOOK_SECRET'],
            default => throw new ApiException('Unknown provider', 422, 'VALIDATION_ERROR'),
        };

        $toSave = [];
        foreach ($keys as $key) {
            if (!empty($newSecrets[$key])) {
                $toSave[$key] = $newSecrets[$key];
            }
        }

        if ($toSave === []) {
            throw new ApiException('No rotatable secrets supplied', 422, 'VALIDATION_ERROR');
        }

        $this->settings->setMany($toSave);
        $this->markRotated(array_keys($toSave));

        AuditService::log('admin.provider.rotate', null, 'provider', $provider, $ip, [
            'keys_rotated' => array_keys($toSave),
            'result' => 'SUCCESS',
        ]);

        return $this->getProvidersOverview();
    }

    public function disableProvider(string $provider, bool $disabled, ?string $ip): array
    {
        AdminContext::require(AdminPermission::PROVIDER_CREDENTIALS_WRITE);
        $provider = strtoupper($provider);
        $keyMap = match ($provider) {
            'CASHRAMP' => self::CASHRAMP_KEYS,
            'SUMSUB' => self::SUMSUB_KEYS,
            default => throw new ApiException('Unknown provider', 422, 'VALIDATION_ERROR'),
        };

        $pdo = Database::connection();
        foreach ($keyMap as $key) {
            $pdo->prepare('UPDATE provider_settings SET disabled = ? WHERE setting_key = ?')
                ->execute([(int) $disabled, $key]);
        }

        AuditService::log('admin.provider.disable', null, 'provider', $provider, $ip, [
            'disabled' => $disabled,
        ]);

        return $this->getProvidersOverview();
    }

    /** @param list<string> $keys */
    private function providerCard(string $provider, array $keys): array
    {
        $masked = $this->settings->getMaskedForAdmin();
        $credentials = [];
        $configured = false;

        foreach ($keys as $key) {
            $entry = $masked[$key] ?? ['configured' => false, 'masked' => null];
            $credentials[$key] = $entry;
            if ($entry['configured']) {
                $configured = true;
            }
        }

        $lastHealth = $this->lastHealthCheck($provider);
        $lastSync = $provider === 'CASHRAMP' ? $this->lastSync('CASHRAMP') : null;

        return [
            'provider' => $provider,
            'environment' => $this->providerEnvironment($provider, $credentials),
            'configured' => $configured,
            'credentials' => $credentials,
            'status' => $lastHealth['status'] ?? ($configured ? 'unknown' : 'disconnected'),
            'last_successful_request' => $lastHealth['created_at'] ?? null,
            'last_synchronization' => $lastSync['created_at'] ?? null,
            'disabled' => $this->isProviderDisabled($keys),
        ];
    }

    /** @param list<string> $keys */
    private function isProviderDisabled(array $keys): bool
    {
        $pdo = Database::connection();
        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $pdo->prepare(
            "SELECT MAX(disabled) FROM provider_settings WHERE setting_key IN ({$placeholders})"
        );
        $stmt->execute($keys);

        return (bool) $stmt->fetchColumn();
    }

    /** @return array<string, mixed>|null */
    private function lastHealthCheck(string $provider): ?array
    {
        try {
            $stmt = Database::connection()->prepare(
                'SELECT status, latency_ms, created_at FROM provider_health_checks
                 WHERE provider = ? AND status IN ("connected", "ok", "configured")
                 ORDER BY id DESC LIMIT 1'
            );
            $stmt->execute([$provider]);
            $row = $stmt->fetch();

            return $row ?: null;
        } catch (\PDOException) {
            return null;
        }
    }

    /** @return array<string, mixed>|null */
    private function lastSync(string $provider): ?array
    {
        try {
            $stmt = Database::connection()->prepare(
                'SELECT status, counts, created_at FROM provider_sync_logs
                 WHERE provider = ? ORDER BY id DESC LIMIT 1'
            );
            $stmt->execute([$provider]);
            $row = $stmt->fetch();
            if ($row && is_string($row['counts'])) {
                $row['counts'] = json_decode($row['counts'], true);
            }

            return $row ?: null;
        } catch (\PDOException) {
            return null;
        }
    }

    /** @param list<string> $keys */
    private function markRotated(array $keys): void
    {
        $pdo = Database::connection();
        foreach ($keys as $key) {
            $pdo->prepare(
                'UPDATE provider_settings SET rotated_at = NOW(), encryption_version = 2 WHERE setting_key = ?'
            )->execute([$key]);
        }
    }

    private function recordHealthCheck(string $provider, string $status, ?int $latencyMs = null, ?array $details = null): void
    {
        try {
            Database::connection()->prepare(
                'INSERT INTO provider_health_checks (provider, status, latency_ms, details) VALUES (?, ?, ?, ?)'
            )->execute([
                $provider,
                $status,
                $latencyMs,
                $details !== null ? json_encode($this->sanitizeHealthDetails($details)) : null,
            ]);
        } catch (\PDOException) {
            // Table may not exist until migration 006
        }
    }

    /** @param array<string, array<string, mixed>> $credentials */
    private function providerEnvironment(string $provider, array $credentials): ?string
    {
        if ($provider === 'CASHRAMP') {
            $env = $this->settings->get('CASHRAMP_ENVIRONMENT', 'sandbox');

            return $env ?? 'sandbox';
        }
        if ($provider === 'SUMSUB') {
            return $this->settings->get('SUMSUB_LEVEL_NAME', 'id-and-liveness');
        }

        return null;
    }

    /** @param array<string, mixed> $details */
    private function sanitizeHealthDetails(array $details): array
    {
        unset($details['secret'], $details['token'], $details['key']);

        return $details;
    }
}
