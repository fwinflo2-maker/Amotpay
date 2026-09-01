<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
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
        return $this->get("/v1/payout/transfer/{$transferToken}");
    }

    public function getTransferByReference(string $merchantTransactionId): array
    {
        return $this->get("/v1/payout/transfer/reference/{$merchantTransactionId}");
    }

    public function healthCheck(): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 'not_configured', 'message' => 'Magma credentials missing'];
        }
        return ['status' => 'configured', 'message' => 'Credentials present'];
    }

    public static function mapStatus(string $magmaStatus): string
    {
        return match (strtolower($magmaStatus)) {
            'success' => 'SUCCESS',
            'pending', 'new' => 'PROCESSING',
            'failed' => 'FAILED',
            default => 'PENDING',
        };
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
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException('Magma request failed: ' . $error);
        }

        $decoded = json_decode($response, true) ?? ['raw' => $response];

        if ($httpCode >= 400) {
            throw new \RuntimeException(
                'Magma API error (' . $httpCode . '): ' . ($decoded['message'] ?? $response)
            );
        }

        return $decoded;
    }
}
