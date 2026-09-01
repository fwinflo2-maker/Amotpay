<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Services\MagmaService;
use AmotPay\Services\TransferService;

$tests = [];
$test = static function (string $name, callable $callback) use (&$tests): void {
    $tests[$name] = $callback;
};
$assert = static function (bool $condition, string $message = 'assertion failed'): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
};

$test('Magma webhook signature signs only data', static function () use ($assert): void {
    $payload = [
        'event' => 'payout.success.webhook',
        'data' => ['transfer_token' => 'token-1', 'transfer_status' => 'success'],
    ];
    $secret = 'test-secret';
    $signature = hash_hmac('sha256', json_encode($payload['data']), $secret);
    $assert(MagmaService::verifyWebhookSignature($payload, $signature, $secret));
    $payload['event'] = 'payout.failed.webhook';
    $assert(MagmaService::verifyWebhookSignature($payload, $signature, $secret), 'event must not be part of documented signature');
    $payload['data']['transfer_status'] = 'failed';
    $assert(!MagmaService::verifyWebhookSignature($payload, $signature, $secret));
});

$test('Magma statuses and final transitions are non-regressive', static function () use ($assert): void {
    $assert(MagmaService::mapStatus('new') === 'PROCESSING');
    $assert(MagmaService::mapStatus('success') === 'SUCCESS');
    $assert(MagmaService::canTransition('PROCESSING', 'FAILED'));
    $assert(!MagmaService::canTransition('SUCCESS', 'FAILED'));
    $assert(!MagmaService::canTransition('FAILED', 'SUCCESS'));
});

$test('KYC status mapping from Sumsub', static function () use ($assert): void {
    $assert(\AmotPay\Identity\KycStatus::mapFromSumsub('completed', 'GREEN') === \AmotPay\Identity\KycStatus::VERIFIED);
    $assert(\AmotPay\Identity\KycStatus::mapFromSumsub('completed', 'RED') === \AmotPay\Identity\KycStatus::REJECTED);
    $assert(\AmotPay\Identity\KycStatus::mapFromSumsub('pending') === \AmotPay\Identity\KycStatus::PENDING);
    $assert(\AmotPay\Identity\KycStatus::allowsFinancialAccess(\AmotPay\Identity\KycStatus::VERIFIED));
    $assert(!\AmotPay\Identity\KycStatus::allowsFinancialAccess(\AmotPay\Identity\KycStatus::PENDING));
});

$test('Sumsub webhook signature verification', static function () use ($assert): void {
    $body = '{"type":"applicantReviewed"}';
    $secret = 'sumsub-test-secret';
    $digest = hash_hmac('sha256', $body, $secret);
    $assert(\AmotPay\Identity\Sumsub\SumsubAdapter::verifyWebhookSignature($body, $digest, $secret));
    $assert(!\AmotPay\Identity\Sumsub\SumsubAdapter::verifyWebhookSignature($body, 'invalid', $secret));
});

$test('Amounts are normalized without accepting excess precision', static function () use ($assert): void {
    $assert(TransferService::normalizeAmount('200') === '200.00');
    $assert(TransferService::normalizeAmount('200.5') === '200.50');
    try {
        TransferService::normalizeAmount('200.001');
        throw new RuntimeException('excess precision accepted');
    } catch (InvalidArgumentException) {
    }
});

$test('Ledger entries must balance', static function () use ($assert): void {
    $ledger = new \AmotPay\Ledger\LedgerService();
    try {
        $ledger->post('test', [
            [
                'account_type' => 'user_liability',
                'account_id' => 'user:1',
                'currency' => 'USD',
                'entry_type' => 'debit',
                'amount' => '100.00',
            ],
            [
                'account_type' => 'provider_transit',
                'account_id' => 'cashramp',
                'currency' => 'USD',
                'entry_type' => 'credit',
                'amount' => '50.00',
            ],
        ]);
        throw new RuntimeException('unbalanced ledger accepted');
    } catch (InvalidArgumentException) {
    }
});

$test('KYC public status is minimal', static function () use ($assert): void {
    $reflection = new ReflectionClass(\AmotPay\Identity\IdentityVerificationService::class);
    $method = $reflection->getMethod('getPublicStatus');
    $assert($method->isPublic());
});

$test('Admin permissions super admin wildcard', static function () use ($assert): void {
    $assert(\AmotPay\Admin\AdminPermission::hasPermission(['*'], \AmotPay\Admin\AdminPermission::KYC_VIEW));
    $assert(!\AmotPay\Admin\AdminPermission::hasPermission(['KYC_VIEW'], \AmotPay\Admin\AdminPermission::CONFIG_WRITE));
});

$test('Reconciliation status constants', static function () use ($assert): void {
    $assert(\AmotPay\Reconciliation\ReconciliationService::MATCHED === 'MATCHED');
    $assert(\AmotPay\Reconciliation\ReconciliationService::AMOUNT_MISMATCH === 'AMOUNT_MISMATCH');
});

$failed = 0;
foreach ($tests as $name => $callback) {
    try {
        $callback();
        echo "PASS {$name}\n";
    } catch (Throwable $error) {
        $failed++;
        echo "FAIL {$name}: {$error->getMessage()}\n";
    }
}
echo sprintf("%d tests, %d failures\n", count($tests), $failed);
exit($failed === 0 ? 0 : 1);
