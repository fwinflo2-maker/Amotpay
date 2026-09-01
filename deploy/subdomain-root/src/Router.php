<?php

declare(strict_types=1);

namespace AmotPay;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\Request;
use AmotPay\Http\Response;
use AmotPay\Http\ApiException;
use AmotPay\Middleware\AdminMiddleware;
use AmotPay\Middleware\AuthMiddleware;
use AmotPay\Middleware\RateLimitMiddleware;
use AmotPay\Services\AdminService;
use AmotPay\Services\AuthService;
use AmotPay\Services\AuditService;
use AmotPay\Services\MagmaService;
use AmotPay\Services\SettingsService;
use AmotPay\Services\TransferService;
use AmotPay\Services\WalletService;
use AmotPay\Services\MigrationStatusService;
use AmotPay\Services\MigrationRunnerService;
use AmotPay\Admin\AdminProviderService;
use AmotPay\Admin\AdminDashboardService;
use AmotPay\Core\Capability\CashrampCapabilityEngine;
use AmotPay\Core\Eligibility\EligibilityEngine;
use AmotPay\Core\Routing\UniversalTransferEngine;
use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;
use AmotPay\Identity\IdentityVerificationService;
use AmotPay\Identity\Sumsub\SumsubAdapter;
use AmotPay\Financial\Cashramp\CashrampCustomerService;
use AmotPay\Reconciliation\ReconciliationService;
use AmotPay\Core\FeatureFlags;

final class Router
{
    public function dispatch(Request $request): void
    {
        if ($request->method === 'OPTIONS') {
            Response::json(['success' => true]);
        }

        $path = rtrim($request->path, '/') ?: '/';
        $method = $request->method;

        try {
            (new RateLimitMiddleware())->handle($request);
            $auth = new AuthMiddleware();
            $authService = new AuthService();
            $transferService = new TransferService();
            $walletService = new WalletService();
            $magma = new MagmaService();
            $adminSvc = new AdminService();
            $adminMw = new AdminMiddleware($adminSvc);
            $settingsSvc = new SettingsService();

            match (true) {
                $method === 'GET' && $path === '/api/health' => Response::json([
                    'success' => true,
                    'service' => 'AmotPay',
                    'status' => 'ok',
                    'version' => Version::STRING,
                    'api' => Version::API,
                    'environment' => Env::get('APP_ENV', 'production') ?? 'production',
                    'timestamp' => date('c'),
                ]),

                $method === 'GET' && $path === '/api/health/magma' => Response::json([
                    'success' => true,
                    'provider' => 'MAGMA',
                    'status' => $magma->isConfigured() ? 'available' : 'unavailable',
                ]),

                $method === 'GET' && $path === '/api/health/cashramp' => Response::json([
                    'success' => true,
                    'provider' => 'CASHRAMP',
                    'status' => (new CashrampAdapter())->isConfigured() ? 'available' : 'unavailable',
                ]),

                $method === 'GET' && $path === '/api/health/sumsub' => Response::json([
                    'success' => true,
                    'provider' => 'SUMSUB',
                    'status' => (new SumsubAdapter())->isConfigured() ? 'available' : 'unavailable',
                ]),

                $method === 'GET' && $path === '/api/health/migrations' => Response::json([
                    'success' => true,
                    'data' => (new MigrationStatusService())->status(),
                ]),

                $method === 'POST' && $path === '/api/auth/register' => $this->register($authService, $request),
                $method === 'POST' && $path === '/api/auth/login' => $this->login($authService, $request),
                $method === 'POST' && $path === '/api/auth/logout' => $this->logout($auth, $authService, $request),

                $method === 'GET' && $path === '/api/me' => $this->me($auth, $request),

                $method === 'GET' && $path === '/api/kyc/status' => $this->kycStatus($auth, $request),
                $method === 'POST' && $path === '/api/kyc/start' => $this->kycStart($auth, $request),
                $method === 'GET' && $path === '/api/eligibility' => $this->eligibility($auth, $request),
                $method === 'GET' && $path === '/api/capabilities' => $this->capabilities($auth, $request),

                $method === 'POST' && $path === '/api/v2/quote' => $this->universalQuote($auth, $request),
                $method === 'POST' && $path === '/api/v2/transfers' => $this->universalTransfer($auth, $request),
                $method === 'POST' && $path === '/api/onboarding/cashramp' => $this->onboardingCashramp($auth, $request),

                $method === 'GET' && $path === '/api/v2/transfers' => $this->listV2Transfers($auth, $request),
                $method === 'GET' && preg_match('#^/api/v2/transfers/([A-Z0-9]+)$#', $path, $m) => $this->getV2Transfer($auth, $request, $m[1]),

                $method === 'GET' && $path === '/api/countries' => $this->countries(),
                $method === 'GET' && $path === '/api/corridors' => $this->corridors($request, $auth),
                $method === 'GET' && $path === '/api/payment-methods' => $this->paymentMethods($request),

                $method === 'POST' && $path === '/api/beneficiary/check' => $this->checkBeneficiary($auth, $transferService, $request),

                $method === 'POST' && $path === '/api/quote' => $this->fiatQuote($auth, $transferService, $request),
                $method === 'POST' && $path === '/api/transfers' => $this->createTransfer($auth, $transferService, $request),
                $method === 'GET' && $path === '/api/transfers' => $this->listTransfers($auth, $transferService, $request),
                $method === 'GET' && preg_match('#^/api/transfers/(\d+)$#', $path, $m) => $this->getTransfer($auth, $transferService, $request, (int) $m[1]),

                $method === 'POST' && $path === '/api/crypto/quote' => $this->featureDisabled(),
                $method === 'POST' && $path === '/api/crypto/buy' => $this->featureDisabled(),
                $method === 'POST' && $path === '/api/crypto/mark-paid' => $this->featureDisabled(),
                $method === 'GET' && $path === '/api/crypto/assets' => $this->featureDisabled(),
                $method === 'GET' && $path === '/api/crypto/transactions' => $this->cryptoTransactions($auth, $request),

                $method === 'GET' && $path === '/api/wallets' => $this->wallets($auth, $walletService, $request),
                $method === 'GET' && preg_match('#^/api/wallets/([A-Z0-9]+)$#', $path, $m) => $this->walletDetail($auth, $walletService, $m[1], $request),
                $method === 'GET' && preg_match('#^/api/wallets/([A-Z0-9]+)/transactions$#', $path, $m) => $this->walletTransactions($auth, $walletService, $request, $m[1]),

                $method === 'POST' && $path === '/api/webhooks/magma' => $this->magmaWebhook($transferService, $request),
                $method === 'POST' && $path === '/api/webhooks/cashramp' => $this->cashrampWebhook($request),
                $method === 'POST' && $path === '/api/webhooks/sumsub' => $this->sumsubWebhook($request),

                $method === 'POST' && $path === '/api/admin/login' => $this->adminLogin($adminSvc, $request),
                $method === 'POST' && $path === '/api/admin/logout' => $this->adminLogout($adminMw, $adminSvc, $request),
                $method === 'GET' && $path === '/api/admin/account' => $this->adminGetAccount($adminMw, $adminSvc, $request),
                $method === 'PUT' && $path === '/api/admin/account/credentials' => $this->adminUpdateCredentials($adminMw, $adminSvc, $request),
                $method === 'PUT' && $path === '/api/admin/account/username' => $this->adminChangeUsername($adminMw, $adminSvc, $request),
                $method === 'PUT' && $path === '/api/admin/account/password' => $this->adminChangePassword($adminMw, $adminSvc, $request),
                $method === 'GET' && $path === '/api/admin/account/sessions' => $this->adminListSessions($adminMw, $adminSvc, $request),
                $method === 'DELETE' && preg_match('#^/api/admin/account/sessions/(\d+)$#', $path, $m) => $this->adminRevokeSession($adminMw, $adminSvc, $request, (int) $m[1]),
                $method === 'POST' && $path === '/api/admin/account/sessions/revoke-others' => $this->adminRevokeOtherSessions($adminMw, $adminSvc, $request),
                $method === 'POST' && $path === '/api/admin/account/2fa/setup' => $this->adminSetupTwoFactor($adminMw, $adminSvc, $request),
                $method === 'POST' && $path === '/api/admin/account/2fa/enable' => $this->adminEnableTwoFactor($adminMw, $adminSvc, $request),
                $method === 'POST' && $path === '/api/admin/account/2fa/disable' => $this->adminDisableTwoFactor($adminMw, $adminSvc, $request),
                $method === 'GET' && $path === '/api/admin/providers' => $this->adminGetProviders($adminMw, $settingsSvc, $request),
                $method === 'PUT' && $path === '/api/admin/providers' => $this->adminSaveProviders($adminMw, $settingsSvc, $request),
                $method === 'GET' && $path === '/api/admin/magma-setup' => $this->adminMagmaSetup($adminMw, $settingsSvc, $request),
                $method === 'GET' && $path === '/api/admin/health-check' => $this->adminHealthCheck($adminMw, $request, $magma),
                $method === 'GET' && $path === '/api/admin/dashboard' => $this->adminDashboard($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/providers/overview' => $this->adminProvidersOverview($adminMw, $request),
                $method === 'PUT' && $path === '/api/admin/providers/cashramp' => $this->adminSaveProvider($adminMw, $request, 'CASHRAMP'),
                $method === 'PUT' && $path === '/api/admin/providers/sumsub' => $this->adminSaveProvider($adminMw, $request, 'SUMSUB'),
                $method === 'POST' && preg_match('#^/api/admin/providers/(cashramp|sumsub)/test$#', $path, $m) => $this->adminTestProvider($adminMw, $request, strtoupper($m[1])),
                $method === 'POST' && preg_match('#^/api/admin/providers/(cashramp|sumsub)/rotate$#', $path, $m) => $this->adminRotateProvider($adminMw, $request, strtoupper($m[1])),
                $method === 'POST' && preg_match('#^/api/admin/providers/(cashramp|sumsub)/disable$#', $path, $m) => $this->adminDisableProvider($adminMw, $request, strtoupper($m[1])),
                $method === 'GET' && $path === '/api/admin/capabilities' => $this->adminCapabilities($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/countries' => $this->adminCountries($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/payment-methods' => $this->adminPaymentMethods($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/migrations' => $this->adminMigrations($adminMw, $request),
                $method === 'POST' && $path === '/api/admin/migrations/apply' => $this->adminApplyMigrations($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/transfers/v2' => $this->adminV2Transfers($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/ledger' => $this->adminLedger($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/reconciliation' => $this->adminReconciliation($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/feature-flags' => $this->adminFeatureFlags($adminMw, $request),
                $method === 'PATCH' && preg_match('#^/api/admin/feature-flags/([A-Z_]+)$#', $path, $m) => $this->adminSetFeatureFlag($adminMw, $request, $m[1]),
                $method === 'GET' && $path === '/api/admin/kyc' => $this->adminList($adminMw, $request, $adminSvc, 'kyc'),
                $method === 'POST' && $path === '/api/admin/capabilities/sync' => $this->adminSyncCapabilities($adminMw, $request),
                $method === 'GET' && $path === '/api/admin/users' => $this->adminList($adminMw, $request, $adminSvc, 'users'),
                $method === 'PATCH' && preg_match('#^/api/admin/users/(\d+)$#', $path, $m) => $this->adminUpdateUser($adminMw, $adminSvc, $request, (int) $m[1]),
                $method === 'GET' && $path === '/api/admin/transfers' => $this->adminList($adminMw, $request, $adminSvc, 'transfers'),
                $method === 'GET' && $path === '/api/admin/webhooks' => $this->adminList($adminMw, $request, $adminSvc, 'webhooks'),
                $method === 'GET' && $path === '/api/admin/audits' => $this->adminList($adminMw, $request, $adminSvc, 'audits'),
                $method === 'GET' && $path === '/api/admin/errors' => $this->adminList($adminMw, $request, $adminSvc, 'errors'),
                $method === 'GET' && $path === '/api/admin/magma/balance' => $this->adminMagma($adminMw, $request, $magma, 'balance'),
                $method === 'GET' && $path === '/api/admin/magma/methods' => $this->adminMagma($adminMw, $request, $magma, 'methods'),
                $method === 'GET' && $path === '/api/admin/magma/history' => $this->adminMagma($adminMw, $request, $magma, 'history'),

                default => Response::error('Not found', 404, 'NOT_FOUND'),
            };
        } catch (ApiException $e) {
            Response::error($e->getMessage(), $e->status, $e->errorCode);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 422, 'VALIDATION_ERROR');
        } catch (\Throwable $e) {
            $incident = bin2hex(random_bytes(8));
            AuditService::error($incident, $e, $path);
            Response::error('Internal server error (incident ' . $incident . ')', 500, 'SERVER_ERROR');
        }
    }

    private function register(AuthService $auth, Request $request): void
    {
        $result = $auth->register($request->body);
        AuditService::log('auth.register', (int) $result['user']['id'], 'user', (string) $result['user']['id'], $request->clientIp());
        Response::json(['success' => true, 'data' => $result], 201);
    }

    private function login(AuthService $auth, Request $request): void
    {
        $result = $auth->login($request->body['phone'] ?? '', $request->body['password'] ?? '');
        AuditService::log('auth.login', (int) $result['user']['id'], 'user', (string) $result['user']['id'], $request->clientIp());
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
        $country = strtoupper(trim((string) $country));
        if (!preg_match('/^[A-Z]{2}$/', $country)) {
            throw new \InvalidArgumentException('Invalid country');
        }
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT provider_code, name, type, currency, min_amount, max_amount
             FROM payment_methods WHERE country_code = ? AND provider = ? AND active = 1'
        );
        $stmt->execute([$country, 'CASHRAMP']);
        Response::json(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    private function checkBeneficiary(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $result = $svc->checkBeneficiary($user, $request->body);
        Response::json(['success' => true, 'data' => $result]);
    }

    private function fiatQuote(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $quote = $svc->createQuote($user, $request->body);
        $quote['legacy'] = true;
        $quote['provider'] = 'MAGMA';
        Response::json(['success' => true, 'data' => $quote]);
    }

    private function createTransfer(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $tx = $svc->createTransfer($user, $request->body, $request->idempotencyKey());
        AuditService::log('transfer.create', (int) $user['id'], 'transaction', (string) $tx['id'], $request->clientIp(), ['reference' => $tx['reference']]);
        Response::json(['success' => true, 'data' => $tx], 201);
    }

    private function listTransfers(AuthMiddleware $authMw, TransferService $svc, Request $request): void
    {
        $user = $authMw->handle($request);
        $limit = max(1, min((int) ($request->query['limit'] ?? 20), 100));
        Response::json(['success' => true, 'data' => $svc->listTransfers((int) $user['id'], $limit)]);
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

    private function cryptoTransactions(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $stmt = Database::connection()->prepare(
            'SELECT id, reference, asset, network, source_currency, source_amount, destination_amount,
             provider, provider_reference, tx_hash, status, created_at, updated_at, completed_at
             FROM crypto_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
        );
        $stmt->execute([(int) $user['id']]);
        Response::json(['success' => true, 'data' => $stmt->fetchAll(), 'legacy_read_only' => true]);
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
        $settings = new SettingsService();
        $secret = $settings->get('MAGMA_WEBHOOK_SECRET') ?? '';
        $signature = trim((string) ($request->headers['x-signature'] ?? ''));
        if (!MagmaService::verifyWebhookSignature($request->body, $signature, $secret)) {
            Response::error('Invalid webhook signature', 401, 'INVALID_WEBHOOK_SIGNATURE');
        }
        $processed = $svc->handleWebhook($request->body);
        Response::json(['success' => true, 'duplicate' => !$processed]);
    }

    private function adminLogin(AdminService $admin, Request $request): void
    {
        $body = $request->body;
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? $body['pin'] ?? '');
        $totpCode = isset($body['totp_code']) ? (string) $body['totp_code'] : null;
        if ($username === '' && isset($body['pin'])) {
            $username = trim((string) (\AmotPay\Config\Env::get('ADMIN_USERNAME', 'admin') ?? 'admin'));
        }
        $result = $admin->login($username, $password, $totpCode, $request->clientIp(), $request->userAgent());
        AuditService::log('admin.login', null, 'admin_session', (string) ($result['session_id'] ?? ''), $request->clientIp());
        Response::json(['success' => true, 'data' => $result]);
    }

    private function adminGetAccount(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => $admin->getAccountInfo()]);
    }

    private function adminUpdateCredentials(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $body = $request->body;
        $result = $admin->updateCredentials(
            (string) ($body['current_password'] ?? ''),
            (string) ($body['username'] ?? ''),
            (string) ($body['password'] ?? ''),
            $request->clientIp()
        );
        Response::json(['success' => true, 'data' => $result]);
    }

    private function adminChangeUsername(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $body = $request->body;
        $result = $admin->changeUsername(
            (string) ($body['current_password'] ?? ''),
            (string) ($body['username'] ?? ''),
            $request->clientIp()
        );
        Response::json(['success' => true, 'data' => $result]);
    }

    private function adminChangePassword(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $body = $request->body;
        $result = $admin->changePassword(
            (string) ($body['current_password'] ?? ''),
            (string) ($body['password'] ?? ''),
            isset($body['confirm_password']) ? (string) $body['confirm_password'] : null,
            $request->clientIp(),
            (bool) ($body['revoke_other_sessions'] ?? false),
            $request->bearerToken()
        );
        Response::json(['success' => true, 'data' => $result]);
    }

    private function adminListSessions(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => $admin->listSessions($request->bearerToken())]);
    }

    private function adminRevokeSession(AdminMiddleware $mw, AdminService $admin, Request $request, int $sessionId): void
    {
        $mw->handle($request);
        $admin->revokeSession($sessionId, $request->bearerToken());
        Response::json(['success' => true]);
    }

    private function adminRevokeOtherSessions(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $count = $admin->revokeOtherSessions($request->bearerToken());
        Response::json(['success' => true, 'data' => ['revoked' => $count]]);
    }

    private function adminSetupTwoFactor(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $body = $request->body;
        Response::json([
            'success' => true,
            'data' => $admin->setupTwoFactor((string) ($body['current_password'] ?? '')),
        ]);
    }

    private function adminEnableTwoFactor(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $body = $request->body;
        Response::json([
            'success' => true,
            'data' => $admin->enableTwoFactor(
                (string) ($body['current_password'] ?? ''),
                (string) ($body['totp_code'] ?? ''),
                $request->clientIp()
            ),
        ]);
    }

    private function adminDisableTwoFactor(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $body = $request->body;
        Response::json([
            'success' => true,
            'data' => $admin->disableTwoFactor(
                (string) ($body['current_password'] ?? ''),
                (string) ($body['totp_code'] ?? ''),
                $request->clientIp()
            ),
        ]);
    }

    private function adminLogout(AdminMiddleware $mw, AdminService $admin, Request $request): void
    {
        $mw->handle($request);
        $admin->logout($request->bearerToken());
        Response::json(['success' => true]);
    }

    private function adminGetProviders(AdminMiddleware $mw, SettingsService $settings, Request $request): void
    {
        $mw->handle($request);
        Response::json([
            'success' => true,
            'data' => [
                'providers' => $settings->getMaskedForAdmin(),
                'magma_setup' => $settings->getMagmaSetupUrls(),
                'cashramp_setup' => $settings->getCashrampSetupUrls(),
                'sumsub_setup' => $settings->getSumsubSetupUrls(),
                'webhooks' => $settings->getWebhookUrls(),
            ],
        ]);
    }

    private function adminSaveProviders(
        AdminMiddleware $mw,
        SettingsService $settings,
        Request $request
    ): void {
        $mw->handle($request);
        $settings->setMany($request->body);
        AuditService::log('admin.providers.update', null, 'provider', 'MAGMA', $request->clientIp());
        Response::json([
            'success' => true,
            'data' => [
                'providers' => $settings->getMaskedForAdmin(),
                'health' => ['magma' => (new MagmaService())->healthCheck()],
            ],
        ]);
    }

    private function adminMagmaSetup(AdminMiddleware $mw, SettingsService $settings, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => $settings->getMagmaSetupUrls()]);
    }

    private function adminHealthCheck(
        AdminMiddleware $mw,
        Request $request,
        MagmaService $magma
    ): void {
        $mw->handle($request);
        Response::json([
            'success' => true,
            'data' => [
                'magma' => $magma->healthCheck(true),
                'cashramp' => (new CashrampAdapter())->healthCheck(),
                'sumsub' => (new SumsubAdapter())->healthCheck(),
                'app_url' => rtrim(Env::get('APP_URL', 'https://amotpay-api.nexustechnologies.cloud') ?? '', '/'),
            ],
        ]);
    }

    private function adminList(AdminMiddleware $mw, Request $request, AdminService $admin, string $resource): void
    {
        $mw->handle($request);
        $data = match ($resource) {
            'users' => $admin->listUsers($request->query),
            'transfers' => $admin->listTransfers($request->query),
            'webhooks' => $admin->listWebhooks($request->query),
            'audits' => $admin->listAudits($request->query),
            'errors' => $admin->listErrors($request->query),
            'kyc' => $admin->listKyc($request->query),
        };
        Response::json(['success' => true, 'data' => $data]);
    }

    private function adminUpdateUser(AdminMiddleware $mw, AdminService $admin, Request $request, int $id): void
    {
        $mw->handle($request);
        $user = $admin->updateUser($id, $request->body);
        if (!$user) {
            Response::error('User not found', 404, 'NOT_FOUND');
        }
        AuditService::log('admin.user.update', null, 'user', (string) $id, $request->clientIp(), [
            'status' => $user['status'],
            'payout_enabled' => (bool) $user['payout_enabled'],
        ]);
        Response::json(['success' => true, 'data' => $user]);
    }

    private function adminMagma(AdminMiddleware $mw, Request $request, MagmaService $magma, string $resource): void
    {
        $mw->handle($request);
        $data = match ($resource) {
            'balance' => $magma->getBalance(),
            'methods' => $magma->getAvailableMethods(),
            'history' => $magma->getTransferHistory($request->query),
        };
        Response::json(['success' => true, 'data' => $data]);
    }

    private function featureDisabled(): void
    {
        Response::error('Crypto features are no longer available', 410, 'FEATURE_DISABLED');
    }

    private function kycStatus(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $svc = new IdentityVerificationService();
        Response::json(['success' => true, 'data' => $svc->getStatus((int) $user['id'])]);
    }

    private function kycStart(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $svc = new IdentityVerificationService();
        $result = $svc->startVerification($user);
        AuditService::log('kyc.start', (int) $user['id'], 'user', (string) $user['id'], $request->clientIp());
        Response::json(['success' => true, 'data' => $result]);
    }

    private function eligibility(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $engine = new EligibilityEngine();
        Response::json(['success' => true, 'data' => $engine->evaluateUser($user)]);
    }

    private function capabilities(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $engine = new CashrampCapabilityEngine();
        Response::json([
            'success' => true,
            'data' => $engine->getCountriesForUser((string) $user['country_code']),
        ]);
    }

    private function universalQuote(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $engine = new UniversalTransferEngine();
        $quote = $engine->quote($user, $request->body);
        Response::json(['success' => true, 'data' => $quote]);
    }

    private function sumsubWebhook(Request $request): void
    {
        $digest = trim((string) ($request->headers['x-payload-digest'] ?? ''));
        $handler = new SumsubWebhookHandler();
        try {
            $processed = $handler->handle($request->rawBody, $digest);
            Response::json(['success' => true, 'duplicate' => !$processed]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 401, 'INVALID_WEBHOOK_SIGNATURE');
        }
    }

    private function cashrampWebhook(Request $request): void
    {
        $handler = new \AmotPay\Webhooks\CashrampWebhookHandler();
        try {
            $processed = $handler->handle($request);
            Response::json(['success' => true, 'duplicate' => !$processed]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 401, 'INVALID_WEBHOOK_SIGNATURE');
        }
    }

    private function adminSyncCapabilities(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        $engine = new CashrampCapabilityEngine();
        $result = $engine->syncAndLog();
        AuditService::log('admin.capabilities.sync', null, 'provider', 'CASHRAMP', $request->clientIp(), $result);
        Response::json(['success' => true, 'data' => $result]);
    }

    private function universalTransfer(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $engine = new UniversalTransferEngine();
        $tx = $engine->execute($user, $request->body, $request->idempotencyKey());
        AuditService::log('transfer.v2.create', (int) $user['id'], 'transfer_order', $tx['reference'], $request->clientIp());
        Response::json(['success' => true, 'data' => $tx], 201);
    }

    private function adminDashboard(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminDashboardService())->overview()]);
    }

    private function adminProvidersOverview(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminProviderService())->getProvidersOverview()]);
    }

    private function adminSaveProvider(AdminMiddleware $mw, Request $request, string $provider): void
    {
        $mw->handle($request);
        $data = (new AdminProviderService())->saveProviderCredentials($provider, $request->body, $request->clientIp());
        Response::json(['success' => true, 'data' => $data]);
    }

    private function adminTestProvider(AdminMiddleware $mw, Request $request, string $provider): void
    {
        $mw->handle($request);
        Response::json([
            'success' => true,
            'data' => (new AdminProviderService())->testConnection($provider, $request->clientIp()),
        ]);
    }

    private function adminRotateProvider(AdminMiddleware $mw, Request $request, string $provider): void
    {
        $mw->handle($request);
        $confirmPassword = $request->body['confirm_password'] ?? $request->body['confirm_pin'] ?? $request->body['pin'] ?? null;
        $data = (new AdminProviderService())->rotateCredentials(
            $provider,
            $request->body,
            is_string($confirmPassword) ? $confirmPassword : null,
            $request->clientIp()
        );
        Response::json(['success' => true, 'data' => $data]);
    }

    private function adminDisableProvider(AdminMiddleware $mw, Request $request, string $provider): void
    {
        $mw->handle($request);
        $disabled = (bool) ($request->body['disabled'] ?? true);
        $data = (new AdminProviderService())->disableProvider($provider, $disabled, $request->clientIp());
        Response::json(['success' => true, 'data' => $data]);
    }

    private function adminCapabilities(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminDashboardService())->listCapabilities($request->query)]);
    }

    private function adminCountries(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminDashboardService())->listCountries()]);
    }

    private function adminPaymentMethods(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminDashboardService())->listPaymentMethods($request->query)]);
    }

    private function adminMigrations(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new MigrationStatusService())->status()]);
    }

    private function adminApplyMigrations(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        $ran = (new MigrationRunnerService())->applyPending();
        Response::json([
            'success' => true,
            'data' => [
                'applied' => $ran,
                'status' => (new MigrationStatusService())->status(),
            ],
        ]);
    }

    private function onboardingCashramp(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $customerId = (new CashrampCustomerService())->ensureCustomer((int) $user['id'], $request->clientIp());
        Response::json(['success' => true, 'data' => ['cashramp_customer_id' => $customerId, 'ready' => true]]);
    }

    private function listV2Transfers(AuthMiddleware $authMw, Request $request): void
    {
        $user = $authMw->handle($request);
        $stmt = Database::connection()->prepare(
            'SELECT reference, source_currency, source_amount, destination_currency, destination_amount,
                    status, provider_reference, created_at, completed_at
             FROM transfer_orders WHERE user_id = ? ORDER BY id DESC LIMIT 50'
        );
        $stmt->execute([(int) $user['id']]);
        Response::json(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    private function getV2Transfer(AuthMiddleware $authMw, Request $request, string $reference): void
    {
        $user = $authMw->handle($request);
        $stmt = Database::connection()->prepare(
            'SELECT * FROM transfer_orders WHERE user_id = ? AND reference = ?'
        );
        $stmt->execute([(int) $user['id'], $reference]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Not found', 404);
        }
        unset($row['recipient']);
        Response::json(['success' => true, 'data' => $row]);
    }

    private function adminV2Transfers(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminService())->listV2Transfers($request->query)]);
    }

    private function adminLedger(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new AdminService())->listLedger($request->query)]);
    }

    private function adminReconciliation(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json([
            'success' => true,
            'data' => (new ReconciliationService())->listRecent((int) ($request->query['limit'] ?? 50)),
        ]);
    }

    private function adminFeatureFlags(AdminMiddleware $mw, Request $request): void
    {
        $mw->handle($request);
        Response::json(['success' => true, 'data' => (new FeatureFlags())->allDetailed()]);
    }

    private function adminSetFeatureFlag(AdminMiddleware $mw, Request $request, string $key): void
    {
        $mw->handle($request);
        (new FeatureFlags())->setEnabled($key, (bool) ($request->body['enabled'] ?? false));
        AuditService::log('admin.feature_flag.update', null, 'feature_flag', $key, $request->clientIp(), [
            'enabled' => (bool) ($request->body['enabled'] ?? false),
        ]);
        Response::json(['success' => true, 'data' => (new FeatureFlags())->allDetailed()]);
    }
}
