<?php

declare(strict_types=1);

namespace AmotPay\Http;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
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
        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $body = $decoded;
            }
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$name] = $value;
            }
        }

        return new self($method, $uri, $_GET, $body, $headers);
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
}
