<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Utils\ReferenceGenerator;

final class CryptoService
{
    public function __construct(
        private CashrampService $cashramp = new CashrampService(),
        private WalletService $wallet = new WalletService(),
    ) {}

    public function getAssets(): array
    {
        $pdo = Database::connection();
        $local = $pdo->query('SELECT * FROM crypto_assets WHERE active = 1 ORDER BY symbol, network')->fetchAll();

        if ($this->cashramp->isConfigured()) {
            try {
                $remote = $this->cashramp->getRampableAssets();
                $this->syncRampableAssets($remote);
                $local = $pdo->query('SELECT * FROM crypto_assets WHERE active = 1 ORDER BY symbol, network')->fetchAll();
            } catch (\Throwable) {
                // Fall back to local seed data
            }
        }

        $grouped = [];
        foreach ($local as $row) {
            $sym = $row['symbol'];
            if (!isset($grouped[$sym])) {
                $grouped[$sym] = [
                    'symbol' => $sym,
                    'name' => $row['name'],
                    'buy_enabled' => (bool) $row['buy_enabled'],
                    'sell_enabled' => (bool) $row['sell_enabled'],
                    'networks' => [],
                ];
            }
            $grouped[$sym]['networks'][] = [
                'network' => $row['network'],
                'contract_address' => $row['contract_address'],
                'buy_enabled' => (bool) $row['buy_enabled'],
            ];
            if ($row['buy_enabled']) {
                $grouped[$sym]['buy_enabled'] = true;
            }
        }

        return array_values($grouped);
    }

    public function ensureCashrampCustomer(array $user): string
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT cashramp_customer_id FROM cashramp_customers WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        $existing = $stmt->fetch();
        if ($existing) {
            return $existing['cashramp_customer_id'];
        }

        $countries = $this->cashramp->getAvailableCountries();
        $countryId = null;
        foreach ($countries as $c) {
            if (($c['code'] ?? '') === $user['country_code']) {
                $countryId = $c['id'];
                break;
            }
        }
        if (!$countryId) {
            throw new \RuntimeException('Country not supported by Cashramp: ' . $user['country_code']);
        }

        $email = $user['email'] ?? ($user['phone'] . '@amotpay.local');
        $result = $this->cashramp->createCustomer(
            $email,
            $user['first_name'],
            $user['last_name'],
            $countryId
        );

        $customerId = $result['data']['createCustomer']['id'] ?? null;
        if (!$customerId) {
            throw new \RuntimeException('Failed to create Cashramp customer');
        }

        $pdo->prepare(
            'INSERT INTO cashramp_customers (user_id, cashramp_customer_id, country, email) VALUES (?, ?, ?, ?)'
        )->execute([$user['id'], $customerId, $user['country_code'], $email]);

        return $customerId;
    }

    public function createQuote(array $user, array $data): array
    {
        $asset = strtoupper($data['asset'] ?? '');
        $network = strtoupper($data['network'] ?? '');
        $amount = (float) ($data['amount'] ?? 0);
        $paymentMethod = $data['payment_method'] ?? 'mtn_momo_cm';

        if ($asset === 'BTC') {
            throw new \InvalidArgumentException('BTC achat direct indisponible avec notre infrastructure actuelle.');
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT * FROM crypto_assets WHERE symbol = ? AND network = ? AND buy_enabled = 1'
        );
        $stmt->execute([$asset, $network]);
        if (!$stmt->fetch()) {
            throw new \InvalidArgumentException('Asset/network not available for purchase');
        }

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Invalid amount');
        }

        $customerId = $this->ensureCashrampCustomer($user);

        $result = $this->cashramp->getRampQuote(
            $customerId,
            $amount,
            'local_currency',
            $paymentMethod,
            'deposit',
            $user['country_code']
        );

        $quote = $result['data']['rampQuote'] ?? null;
        if (!$quote) {
            throw new \RuntimeException('Unable to obtain quote from Cashramp');
        }

        $rate = (float) ($quote['exchangeRate'] ?? 0);
        $destAmount = $rate > 0 ? round($amount / $rate, 8) : 0;
        $feePercent = (float) (Env::get('APPLICATION_FEE_PERCENT', '0.5') ?? '0.5');
        $appFee = round($amount * ($feePercent / 100), 2);
        $expiresAt = date('Y-m-d H:i:s', time() + 120);

        $insert = $pdo->prepare(
            'INSERT INTO crypto_quotes
             (user_id, provider_quote_id, source_currency, source_amount, asset, network, rate,
              provider_fee, application_fee, destination_amount, provider, status, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, "CASHRAMP", "ACTIVE", ?)'
        );
        $insert->execute([
            $user['id'],
            $quote['id'],
            $user['currency'],
            $amount,
            $asset,
            $network,
            $rate,
            $appFee,
            $destAmount,
            $expiresAt,
        ]);

        return [
            'quote_id' => (int) Database::connection()->lastInsertId(),
            'provider_quote_id' => $quote['id'],
            'source_amount' => $amount,
            'source_currency' => $user['currency'],
            'asset' => $asset,
            'network' => $network,
            'rate' => $rate,
            'fees' => $appFee,
            'destination_amount' => $destAmount,
            'expires_at' => $expiresAt,
            'provider' => 'CASHRAMP',
        ];
    }

    public function buy(array $user, array $data, ?string $idempotencyKey): array
    {
        $pdo = Database::connection();

        if ($idempotencyKey) {
            $stmt = $pdo->prepare('SELECT * FROM crypto_transactions WHERE idempotency_key = ?');
            $stmt->execute([$idempotencyKey]);
            if ($row = $stmt->fetch()) {
                return $row;
            }
        }

        $quoteId = (int) ($data['quote_id'] ?? 0);
        $stmt = $pdo->prepare(
            'SELECT * FROM crypto_quotes WHERE id = ? AND user_id = ? AND status = "ACTIVE" AND expires_at > NOW()'
        );
        $stmt->execute([$quoteId, $user['id']]);
        $quote = $stmt->fetch();

        if (!$quote) {
            throw new \InvalidArgumentException('QUOTE_EXPIRED');
        }

        $reference = ReferenceGenerator::crypto();
        $idempotencyKey = $idempotencyKey ?? hash('sha256', $reference);

        $wallet = $this->wallet->getOrCreateWallet($user['id'], $quote['asset'], $quote['network']);

        $onchain = null;
        if (!empty($wallet['address'])) {
            $onchain = [
                'address' => $wallet['address'],
                'cryptocurrency' => CashrampService::symbolToCashrampCrypto($quote['asset']),
                'network' => strtolower($quote['network']),
            ];
        }

        $result = $this->cashramp->initiateRampQuoteDeposit(
            $quote['provider_quote_id'],
            $reference,
            $user['phone'],
            $onchain
        );

        $deposit = $result['data']['initiateRampQuoteDeposit'] ?? null;
        if (!$deposit) {
            throw new \RuntimeException('Failed to initiate deposit');
        }

        $pdo->prepare('UPDATE crypto_quotes SET status = "USED" WHERE id = ?')->execute([$quoteId]);

        $insert = $pdo->prepare(
            'INSERT INTO crypto_transactions
             (user_id, reference, asset, network, source_currency, source_amount, provider_fee,
              application_fee, destination_amount, provider, provider_reference, wallet_address,
              status, idempotency_key, quote_id, payment_details)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, "CASHRAMP", ?, ?, "CREATED", ?, ?, ?)'
        );
        $insert->execute([
            $user['id'],
            $reference,
            $quote['asset'],
            $quote['network'],
            $quote['source_currency'],
            $quote['source_amount'],
            $quote['application_fee'],
            $quote['destination_amount'],
            $deposit['id'],
            $wallet['address'] ?? null,
            $idempotencyKey,
            $quoteId,
            $deposit['paymentDetails'] ?? null,
        ]);

        $txId = (int) $pdo->lastInsertId();

        return [
            'id' => $txId,
            'reference' => $reference,
            'status' => 'CREATED',
            'payment_details' => $deposit['paymentDetails'] ?? null,
            'amount_local' => $deposit['amountLocal'] ?? $quote['source_amount'],
            'amount_usd' => $deposit['amountUsd'] ?? $quote['destination_amount'],
            'expires_at' => $deposit['expiresAt'] ?? null,
            'provider' => 'CASHRAMP',
        ];
    }

    public function markPaid(int $userId, string $reference): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM crypto_transactions WHERE reference = ? AND user_id = ?');
        $stmt->execute([$reference, $userId]);
        $tx = $stmt->fetch();
        if (!$tx) {
            throw new \InvalidArgumentException('Transaction not found');
        }

        $this->cashramp->markDepositAsPaid($tx['provider_reference']);
        $pdo->prepare('UPDATE crypto_transactions SET status = "PROCESSING" WHERE id = ?')->execute([$tx['id']]);

        return ['reference' => $reference, 'status' => 'PROCESSING'];
    }

    public function handleWebhook(array $payload): void
    {
        $eventType = $payload['event_type'] ?? '';
        $data = $payload['data'] ?? [];

        if ($eventType === 'payment_request.updated') {
            $this->handlePaymentUpdate($data);
        }
    }

    private function handlePaymentUpdate(array $data): void
    {
        $reference = $data['reference'] ?? null;
        $status = $data['status'] ?? null;
        if (!$reference || !$status) {
            return;
        }

        $mapped = CashrampService::mapPaymentStatus($status);
        $pdo = Database::connection();

        $stmt = $pdo->prepare('SELECT * FROM crypto_transactions WHERE reference = ?');
        $stmt->execute([$reference]);
        $tx = $stmt->fetch();
        if (!$tx || $tx['status'] === 'SUCCESS') {
            return;
        }

        $pdo->prepare(
            'UPDATE crypto_transactions SET status = ?, updated_at = NOW(),
             completed_at = IF(? = "SUCCESS", NOW(), completed_at) WHERE id = ?'
        )->execute([$mapped, $mapped, $tx['id']]);

        if ($mapped === 'SUCCESS') {
            $this->wallet->credit(
                (int) $tx['user_id'],
                $tx['asset'],
                $tx['network'],
                (float) $tx['destination_amount'],
                'BUY',
                $tx['provider_reference']
            );
        }
    }

    public function listTransactions(int $userId, int $limit = 20): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT * FROM crypto_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $userId, \PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    private function syncRampableAssets(array $remote): void
    {
        $pdo = Database::connection();
        $symbolMap = ['USDC' => 'USDC', 'USDT' => 'USDT', 'CUSD' => 'CUSD'];

        foreach ($remote as $asset) {
            $symbol = strtoupper($asset['symbol'] ?? '');
            if (!isset($symbolMap[$symbol]) && $symbol !== 'USDT' && $symbol !== 'USDC') {
                continue;
            }
            $networks = $asset['networks'] ?? [];
            foreach ($networks as $network) {
                $pdo->prepare(
                    'INSERT INTO crypto_assets (symbol, name, network, contract_address, provider, active, buy_enabled)
                     VALUES (?, ?, ?, ?, "CASHRAMP", 1, 1)
                     ON DUPLICATE KEY UPDATE contract_address = VALUES(contract_address), buy_enabled = 1, active = 1'
                )->execute([
                    $symbol,
                    $asset['name'] ?? $symbol,
                    strtoupper($network),
                    $asset['contractAddress'] ?? null,
                ]);
            }
        }
    }
}
