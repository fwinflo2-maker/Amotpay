<?php

declare(strict_types=1);

namespace AmotPay\Http;

use AmotPay\Config\Env;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public readonly string $rawBody = '',
    ) {}

    public static function capture(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $uri = preg_replace('#^/amotpay/(?:api|rest)#', '/api', $uri) ?? $uri;
        if (!str_starts_with($uri, '/api')) {
            $uri = '/api' . ($uri === '/' ? '/health' : $uri);
        }

        $body = [];
        $raw = file_get_contents('php://input') ?: '';
        $maxBytes = (int) (Env::get('MAX_REQUEST_BODY_BYTES', '65536') ?? '65536');
        if (strlen($raw) > $maxBytes) {
            throw new ApiException('Request body too large', 413, 'PAYLOAD_TOO_LARGE');
        }
        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
                throw new ApiException('Invalid JSON body', 400, 'INVALID_JSON');
            }
            $body = $decoded;
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$name] = $value;
            }
        }
        if (!isset($headers['authorization']) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers['authorization'] = (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return new self(strtoupper($method), $uri, $_GET, $body, $headers, $raw);
    }

    public function bearerToken(): ?string
    {
        $auth = $this->headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public function idempotencyKey(): ?string
    {
        return $this->headers['x-idempotency-key'] ?? $this->body['idempotency_key'] ?? null;
    }

    public function clientIp(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown';
    }

    public function userAgent(): ?string
    {
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

        return $ua !== '' ? $ua : null;
    }
}
