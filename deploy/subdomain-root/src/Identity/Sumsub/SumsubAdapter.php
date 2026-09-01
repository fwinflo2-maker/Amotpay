<?php

declare(strict_types=1);

namespace AmotPay\Identity\Sumsub;

use AmotPay\Config\Env;
use AmotPay\Services\SettingsService;

/**
 * Sumsub REST API adapter.
 * Docs: https://docs.sumsub.com/reference/about-sumsub-api
 */
final class SumsubAdapter
{
    private string $baseUrl;
    private string $appToken;
    private string $secretKey;
    private string $levelName;

    public function __construct(?SettingsService $settings = null)
    {
        $settings ??= new SettingsService();
        $this->baseUrl = rtrim(
            $settings->get('SUMSUB_BASE_URL', 'https://api.sumsub.com') ?? 'https://api.sumsub.com',
            '/'
        );
        $this->appToken = $settings->get('SUMSUB_APP_TOKEN') ?? '';
        $this->secretKey = $settings->get('SUMSUB_SECRET_KEY') ?? '';
        $this->levelName = $settings->get('SUMSUB_LEVEL_NAME', 'id-and-liveness') ?? 'id-and-liveness';
    }

    public function isConfigured(): bool
    {
        return $this->appToken !== '' && $this->secretKey !== '';
    }

    public function getLevelName(): string
    {
        return $this->levelName;
    }

    public function createApplicant(string $externalUserId, array $info = []): array
    {
        $body = [
            'externalUserId' => $externalUserId,
            'info' => $info,
        ];

        return $this->request('POST', '/resources/applicants?levelName=' . urlencode($this->levelName), $body);
    }

    public function getApplicant(string $applicantId): array
    {
        return $this->request('GET', '/resources/applicants/' . urlencode($applicantId) . '/one');
    }

    public function getApplicantByExternalUserId(string $externalUserId): array
    {
        return $this->request(
            'GET',
            '/resources/applicants/-;externalUserId=' . urlencode($externalUserId) . '/one'
        );
    }

    public function generateAccessToken(string $externalUserId, ?string $levelName = null): array
    {
        $level = $levelName ?? $this->levelName;
        $path = '/resources/accessTokens?userId=' . urlencode($externalUserId)
            . '&levelName=' . urlencode($level)
            . '&ttlInSecs=600';

        return $this->request('POST', $path);
    }

    public function healthCheck(): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 'not_configured', 'message' => 'Sumsub credentials missing'];
        }

        return ['status' => 'configured', 'level_name' => $this->levelName];
    }

    public static function verifyWebhookSignature(string $rawBody, string $digestHeader, string $secret): bool
    {
        if ($secret === '' || $digestHeader === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);

        return hash_equals(strtolower($expected), strtolower($digestHeader));
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('Sumsub is not configured');
        }

        $url = $this->baseUrl . $path;
        $ts = (string) time();
        $payload = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
        $signature = $this->signRequest($ts, $method, $path, $payload);

        $headers = [
            'X-App-Token: ' . $this->appToken,
            'X-App-Access-Ts: ' . $ts,
            'X-App-Access-Sig: ' . $signature,
            'Content-Type: application/json',
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
        ]);

        if ($payload !== '') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException('Sumsub request failed: ' . $error);
        }

        $decoded = json_decode($response, true) ?? [];

        if ($httpCode >= 400) {
            $msg = $decoded['description'] ?? $decoded['error'] ?? $response;
            throw new \RuntimeException('Sumsub API error: ' . (is_string($msg) ? $msg : json_encode($msg)));
        }

        return $decoded;
    }

    private function signRequest(string $ts, string $method, string $path, string $body): string
    {
        $data = $ts . strtoupper($method) . $path . $body;

        return hash_hmac('sha256', $data, $this->secretKey);
    }
}
