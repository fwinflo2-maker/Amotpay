<?php

declare(strict_types=1);

namespace AmotPay;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\Request;
use AmotPay\Http\Response;
use AmotPay\Middleware\AuthMiddleware;
use AmotPay\Middleware\RateLimitMiddleware;
use AmotPay\Services\AuthService;
use AmotPay\Services\CashrampService;
use AmotPay\Services\CryptoService;
use AmotPay\Services\MagmaService;
use AmotPay\Services\TransferService;
use AmotPay\Services\WalletService;

final class Router
{
    public function dispatch(Request $request): void
    {
        if ($request->method === 'OPTIONS') {
            Response::json(['success' => true]);
        }

        (new RateLimitMiddleware())->handle($request);

        $auth = new AuthMiddleware();
        $authService = new AuthService();
        $transferService = new TransferService();
        $cryptoService = new CryptoService();
        $walletService = new WalletService();
        $magma = new MagmaService();
        $cashramp = new CashrampService();

        $path = rtrim($request->path, '/') ?: '/';
        $method = $request->method;

        try {
            match (true) {
                $method === 'GET' && $path === '/api/health' => Response::json([
                    'success' => true,
                    'service' => 'AmotPay',
                    'status' => 'ok',
                    'timestamp' => date('c'),
                ]),

                $method === 'GET' && $path === '/api/health/magma' => Response::json([
                    'success' => true,
                    'provider' => 'MAGMA',
                    'health' => $magma->healthCheck(),
                ]),

                $method === 'GET' && $path === '/api/health/cashramp' => Response::json([
                    'success' => true,
                    'provider' => 'CASHRAMP',
                    'health' => $cashramp->healthCheck(),
                ]),

                $method === 'POST' && $path === '/api/auth/register' => $this->register($authService, $request),
                $method === 'POST' && $path === '/api/auth/login' => $this->login($authService, $request),
                $method === 'POST' && $path === '/api/auth/logout' => $this->logout($auth, $authService, $request),

                $method === 'GET' && $path === '/api/me' => $this->me($auth, $request),

                $method === 'GET' && $path === '/api/countries' => $this->countries(),
                $method === 'GET' && $path === '/api/corridors' => $this->corridors($request, $auth),
                $method === 'GET' && $path === '/api/payment-methods' => $this->paymentMethods($request),

                $method === 'POST' && $path === '/api/beneficiary/check' => $this->checkBeneficiary($auth, $transferService, $request),

                $method === 'POST' && $path === '/api/quote' => $this->fiatQuote($auth, $transferService, $request),
                $method === 'POST' && $path === '/api/transfers' => $this->createTransfer($auth, $transferService, $request),
                $method === 'GET' && $path === '/api/transfers' => $this->listTransfers($auth, $transferService, $request),
                $method === 'GET' && preg_match('#^/api/transfers/(\d+)$#', $path, $m) => $this->getTransfer($auth, $transferService, $request, (int) $m[1]),

                $method === 'POST' && $path === '/api/crypto/quote' => $this->cryptoQuote($auth, $cryptoService, $request),
                $method === 'POST' && $path === '/api/crypto/buy' => $this->cryptoBuy($auth, $cryptoService, $request),
                $method === 'POST' && $path === '/api/crypto/mark-paid' => $this->cryptoMarkPaid($auth, $cryptoService, $request),
                $method === 'GET' && $path === '/api/crypto/assets' => $this->cryptoAssets($cryptoService),
                $method === 'GET' && $path === '/api/crypto/transactions' => $this->cryptoTransactions($auth, $cryptoService, $request),

                $method === 'GET' && $path === '/api/wallets' => $this->wallets($auth, $walletService, $request),
                $method === 'GET' && preg_match('#^/api/wallets/([A-Z0-9]+)$#', $path, $m) => $this->walletDetail($auth, $walletService, $m[1], $request),
                $method === 'GET' && preg_match('#^/api/wallets/([A-Z0-9]+)/transactions$#', $path, $m) => $this->walletTransactions($auth, $walletService, $request, $m[1]),

                $method === 'POST' && $path === '/api/webhooks/magma' => $this->magmaWebhook($transferService, $request),
                $method === 'POST' && $path === '/api/webhooks/cashramp' => $this->cashrampWebhook($cryptoService, $request),

                default => Response::error('Not found', 404, 'NOT_FOUND'),
            };
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 422, 'VALIDATION_ERROR');
        } catch (\Throwable $e) {
            $debug = Env::get('APP_DEBUG', 'false') === 'true';
            Response::error(
                $debug ? $e->getMessage() : 'Internal server error',
                500,
                'SERVER_ERROR'
            );
        }
    }

    private function register(AuthService $auth, Request $request): void
    {
        $result = $auth->register($request->body);
        Response::json(['success' => true, 'data' => $result], 201);
    }

    private function login(AuthService $auth, Request $request): void
    {
        $result = $auth->login($request->body['phone'] ?? '', $request->body['password'] ?? '');
        Response::json(['success' => true, 'data' => $result]);
    }

    private function logout(AuthMiddleware $authMw, AuthService $auth, Request $request): void
    {
        $authMw->handle($request);
        $auth->logout($request->bearerToken() ?? '');
        Response::json(['success' => true]);
    }

    private function me(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        unset($user['password_hash']);
        Response::json(['success' => true, 'data' => $user]);
    }

    private function countries(): void
    {
        $pdo = Database::connection();
        $rows = $pdo->query('SELECT code, name, currency, phone_prefix FROM countries WHERE active = 1')->fetchAll();
        Response::json(['success' => true, 'data' => $rows]);
    }

    private function corridors(Request $request, AuthMiddleware $authMw): void
    {
        $user = $authMw->handle($request);
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT destination_country, provider FROM corridors WHERE source_country = ? AND active = 1'
        );
        $stmt->execute([$user['country_code']]);
        Response::json(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    private function paymentMethods(Request $request): void
    {
        $country = $request->query['country'] ?? '';
        $provider = $request->query['provider'] ?? 'MAGMA';
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT provider_code, name, type, currency, min_amount, max_amount
             FROM payment_methods WHERE country_code = ? AND provider = ? AND active = 1'
        );
        $stmt->execute([$country, $provider]);
        Response::json(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    private function checkBeneficiary(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $authMw->handle($request);
        $result = $svc->checkBeneficiary($request->body);
        Response::json(['success' => true, 'data' => $result]);
    }

    private function fiatQuote(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $quote = $svc->createQuote($user, $request->body);
        Response::json(['success' => true, 'data' => $quote]);
    }

    private function createTransfer(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $tx = $svc->createTransfer($user, $request->body, $request->idempotencyKey());
        Response::json(['success' => true, 'data' => $tx], 201);
    }

    private function listTransfers(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        Response::json(['success' => true, 'data' => $svc->listTransfers((int) $user['id'])]);
    }

    private function getTransfer(AuthMiddleware $authMw, TransferService $svc, Request $request, int $id): void
    {
        $user = $authMw->handle($request);
        $tx = $svc->getTransfer((int) $user['id'], $id);
        if (!$tx) {
            Response::error('Not found', 404);
        }
        Response::json(['success' => true, 'data' => $tx]);
    }

    private function cryptoQuote(AuthMiddleware $authMw, CryptoService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $quote = $svc->createQuote($user, $request->body);
        Response::json(['success' => true, 'data' => $quote]);
    }

    private function cryptoBuy(AuthMiddleware $authMw, CryptoService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $tx = $svc->buy($user, $request->body, $request->idempotencyKey());
        Response::json(['success' => true, 'data' => $tx], 201);
    }

    private function cryptoMarkPaid(AuthMiddleware $authMw, CryptoService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $result = $svc->markPaid((int) $user['id'], $request->body['reference'] ?? '');
        Response::json(['success' => true, 'data' => $result]);
    }

    private function cryptoAssets(CryptoService $svc): void
    {
        Response::json(['success' => true, 'data' => $svc->getAssets()]);
    }

    private function cryptoTransactions(AuthMiddleware $authMw, CryptoService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        Response::json(['success' => true, 'data' => $svc->listTransactions((int) $user['id'])]);
    }

    private function wallets(AuthMiddleware $authMw, WalletService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        Response::json(['success' => true, 'data' => $svc->getUserWallets((int) $user['id'])]);
    }

    private function walletDetail(AuthMiddleware $authMw, WalletService $svc, string $asset, Request $request): void
    {
        $user = $authMw->handle($request);
        $network = $request->query['network'] ?? null;
        $wallet = $svc->getWallet((int) $user['id'], $asset, $network);
        if (!$wallet) {
            Response::error('Wallet not found', 404);
        }
        Response::json(['success' => true, 'data' => $wallet]);
    }

    private function walletTransactions(AuthMiddleware $authMw, WalletService $svc, Request $request, string $asset): void
    {
        $user = $authMw->handle($request);
        Response::json(['success' => true, 'data' => $svc->getTransactions((int) $user['id'], $asset)]);
    }

    private function magmaWebhook(TransferService $svc, Request $request): void
    {
        $this->storeWebhook('MAGMA', $request);
        $svc->handleWebhook($request->body);
        Response::json(['success' => true]);
    }

    private function cashrampWebhook(CryptoService $svc, Request $request): void
    {
        $token = Env::get('CASHRAMP_WEBHOOK_TOKEN', '') ?? '';
        $header = $request->headers['x-cashramp-token'] ?? '';
        if ($token !== '' && !hash_equals($token, $header)) {
            Response::error('Invalid webhook token', 401);
        }

        $this->storeWebhook('CASHRAMP', $request);
        $svc->handleWebhook($request->body);
        Response::json(['success' => true]);
    }

    private function storeWebhook(string $provider, Request $request): void
    {
        $pdo = Database::connection();
        $eventType = $request->body['event_type'] ?? $request->body['type'] ?? 'unknown';
        $ref = $request->body['data']['reference'] ?? $request->body['merchant_transaction_id'] ?? null;

        $pdo->prepare(
            'INSERT INTO webhooks (provider, event_type, provider_reference, payload) VALUES (?, ?, ?, ?)'
        )->execute([$provider, $eventType, $ref, json_encode($request->body)]);
    }
}
