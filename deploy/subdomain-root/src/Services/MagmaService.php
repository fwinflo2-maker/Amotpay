<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Services\SettingsService;

/**
 * Magma OnePay API client — fiat transfers only.
 * Docs: https://docs.magmaonepay.com/
 */
final class MagmaService
{
    private string $baseUrl;
    private string $privateKey;
    private string $secretKey;

    public function __construct(?SettingsService $settings = null)
    {
        $settings ??= new SettingsService();
        $this->baseUrl = rtrim($settings->get('MAGMA_API_URL', 'https://api.magmaonepay.com') ?? 'https://api.magmaonepay.com', '/');
        $this->privateKey = $settings->get('MAGMA_PRIVATE_KEY') ?? '';
        $this->secretKey = $settings->get('MAGMA_SECRET_KEY') ?? '';
    }

    public function isConfigured(): bool
    {
        return $this->privateKey !== '' && $this->secretKey !== '';
    }

    public function checkAccount(array $params): array
    {
        return $this->post('/v1/misc/check-account', $params);
    }

    public function executeTransfer(array $payload): array
    {
        return $this->post('/v1/payout/transfer', $payload);
    }

    public function getTransferStatus(string $transferToken): array
    {
        return $this->get('/v1/payout/transfer/' . rawurlencode($transferToken));
    }

    public function getTransferByReference(string $merchantTransactionId): array
    {
        return $this->get('/v1/payout/transfer/reference/' . rawurlencode($merchantTransactionId));
    }

    public function getBalance(): array
    {
        return $this->get('/v1/misc/balance');
    }

    public function getAvailableMethods(): array
    {
        return $this->get('/v1/misc/payout/services');
    }

    public function getTransferHistory(array $filters = []): array
    {
        $allowed = array_intersect_key($filters, array_flip(['start_date', 'end_date', 'channel', 'currency', 'status']));
        foreach (['start_date', 'end_date'] as $field) {
            if (isset($allowed[$field])) {
                $date = \DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', (string) $allowed[$field]);
                if (!$date || $date->format('Y-m-d H:i:s') !== $allowed[$field]) {
                    throw new \InvalidArgumentException("Invalid {$field}");
                }
            }
        }
        if (isset($allowed['channel']) && !in_array($allowed['channel'], ['mobile_money', 'airtime', 'wave', 'bank_account'], true)) {
            throw new \InvalidArgumentException('Invalid channel');
        }
        if (isset($allowed['status']) && !in_array($allowed['status'], ['new', 'pending', 'success', 'failed'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }
        if (isset($allowed['currency']) && !preg_match('/^[A-Z]{3}$/', (string) $allowed['currency'])) {
            throw new \InvalidArgumentException('Invalid currency');
        }
        $query = $allowed === [] ? '' : '?' . http_build_query($allowed, '', '&', PHP_QUERY_RFC3986);
        return $this->get('/v1/payout/transfer/history' . $query);
    }

    public function healthCheck(bool $remote = false): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 'not_configured', 'message' => 'Magma credentials missing'];
        }
        if (!$remote) {
            return ['status' => 'configured'];
        }
        try {
            $this->getAvailableMethods();
            return ['status' => 'available'];
        } catch (\Throwable) {
            return ['status' => 'unavailable'];
        }
    }

    public static function mapStatus(string $magmaStatus): string
    {
        return match (strtolower($magmaStatus)) {
            'success' => 'SUCCESS',
            'pending', 'new' => 'PROCESSING',
            'failed' => 'FAILED',
            default => throw new \InvalidArgumentException('Unsupported Magma transfer status'),
        };
    }

    public static function canTransition(string $current, string $next): bool
    {
        if ($current === $next) {
            return true;
        }
        return !in_array($current, ['SUCCESS', 'FAILED', 'CANCELLED'], true)
            && in_array($next, ['PROCESSING', 'SUCCESS', 'FAILED'], true);
    }

    public static function verifyWebhookSignature(array $payload, string $signature, string $secret): bool
    {
        if ($secret === '' || !preg_match('/^[a-f0-9]{64}$/i', $signature) || !isset($payload['data']) || !is_array($payload['data'])) {
            return false;
        }
        // Magma documents signing the JSON encoding of the data object, not the full envelope.
        $signedPayload = json_encode($payload['data']);
        return $signedPayload !== false
            && hash_equals(hash_hmac('sha256', $signedPayload, $secret), strtolower($signature));
    }

    private function get(string $path): array
    {
        return $this->request('GET', $path);
    }

    private function post(string $path, array $body): array
    {
        return $this->request('POST', $path, $body);
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('Magma is not configured');
        }
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);

        $headers = [
            'Authorization: Bearer ' . $this->privateKey,
            'X-User-Secret: ' . $this->secretKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ]);

        if ($body !== null) {
            $encoded = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $encoded);
        }

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException('Magma request failed: ' . $error);
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Magma returned an invalid response');
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException(
                'Magma API error (' . $httpCode . '): ' . substr((string) ($decoded['message'] ?? 'request rejected'), 0, 200)
            );
        }

        return $decoded;
    }
}
