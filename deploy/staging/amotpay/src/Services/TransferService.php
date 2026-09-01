<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Utils\ReferenceGenerator;

final class TransferService
{
    public function __construct(
        private MagmaService $magma = new MagmaService(),
    ) {}

    public function checkBeneficiary(array $data): array
    {
        $payload = [
            'phone_number' => $data['phone_number'] ?? null,
            'account_number' => $data['account_number'] ?? null,
            'country_code' => $data['country_code'],
            'operator_code' => $data['operator_code'] ?? $data['payment_method'],
            'channel' => $data['channel'] ?? 'mobile_money',
        ];

        if ($payload['channel'] === 'mobile_money' && empty($payload['phone_number'])) {
            throw new \InvalidArgumentException('phone_number required for mobile_money');
        }

        return $this->magma->checkAccount(array_filter($payload, fn ($v) => $v !== null));
    }

    public function createQuote(array $user, array $data): array
    {
        $destCountry = $data['destination_country'];
        $amount = (float) ($data['amount'] ?? 0);
        $paymentMethod = $data['payment_method'];

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Invalid amount');
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT * FROM payment_methods WHERE country_code = ? AND provider_code = ? AND provider = "MAGMA" AND active = 1'
        );
        $stmt->execute([$destCountry, $paymentMethod]);
        $method = $stmt->fetch();
        if (!$method) {
            throw new \InvalidArgumentException('Invalid payment method');
        }

        if ($amount < (float) $method['min_amount'] || $amount > (float) $method['max_amount']) {
            throw new \InvalidArgumentException('Amount out of limits');
        }

        $destCurrency = $this->getCountryCurrency($destCountry);
        $feePercent = (float) (Env::get('APPLICATION_FEE_PERCENT', '0.5') ?? '0.5');
        $appFee = round($amount * ($feePercent / 100), 2);

        return [
            'source_country' => $user['country_code'],
            'source_currency' => $user['currency'],
            'destination_country' => $destCountry,
            'destination_currency' => $destCurrency,
            'payment_method' => $paymentMethod,
            'source_amount' => $amount,
            'provider_fee' => 0,
            'application_fee' => $appFee,
            'exchange_rate' => 1,
            'destination_amount' => $amount,
            'total_payable' => $amount + $appFee,
            'provider' => 'MAGMA',
            'expires_at' => date('c', time() + 300),
        ];
    }

    public function createTransfer(array $user, array $data, ?string $idempotencyKey): array
    {
        $pdo = Database::connection();

        if ($idempotencyKey) {
            $existing = $this->findByIdempotency($idempotencyKey);
            if ($existing) {
                return $existing;
            }
        }

        $reference = ReferenceGenerator::fiat();
        $idempotencyKey = $idempotencyKey ?? hash('sha256', $reference);

        $quote = $this->createQuote($user, $data);

        $insert = $pdo->prepare(
            'INSERT INTO transactions
             (user_id, reference, source_country, source_currency, destination_country, destination_currency,
              payment_method, recipient_phone, recipient_first_name, recipient_last_name,
              source_amount, provider_fee, application_fee, exchange_rate, destination_amount,
              total_payable, provider, idempotency_key, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "MAGMA", ?, "PENDING")'
        );

        $insert->execute([
            $user['id'],
            $reference,
            $quote['source_country'],
            $quote['source_currency'],
            $quote['destination_country'],
            $quote['destination_currency'],
            $quote['payment_method'],
            $data['recipient_phone'] ?? null,
            $data['recipient_first_name'],
            $data['recipient_last_name'],
            $quote['source_amount'],
            $quote['provider_fee'],
            $quote['application_fee'],
            $quote['exchange_rate'],
            $quote['destination_amount'],
            $quote['total_payable'],
            $idempotencyKey,
        ]);

        $txId = (int) $pdo->lastInsertId();

        $magmaPayload = [
            'merchant_transaction_id' => $reference,
            'amount' => $quote['destination_amount'],
            'currency' => $quote['destination_currency'],
            'description' => 'AmotPay transfer ' . $reference,
            'channel' => $data['channel'] ?? 'mobile_money',
            'country_code' => $quote['destination_country'],
            'receiver_account' => $data['recipient_phone'] ?? $data['receiver_account'],
            'payment_method' => $quote['payment_method'],
            'receiver_first_name' => $data['recipient_first_name'],
            'receiver_last_name' => $data['recipient_last_name'],
            'webhook_url' => Env::get('APP_URL', '') . '/api/webhooks/magma',
        ];

        if (in_array($user['country_code'], ['CM', 'GH'], true)) {
            $magmaPayload['sender_firstname'] = $user['first_name'];
            $magmaPayload['sender_lastname'] = $user['last_name'];
        }
        if ($user['country_code'] === 'CM') {
            $magmaPayload['sender_phone_number'] = $user['phone'];
        }

        try {
            $result = $this->magma->executeTransfer($magmaPayload);
            $transferToken = $result['data']['transfer_token'] ?? null;
            $status = MagmaService::mapStatus($result['data']['status'] ?? 'new');

            $pdo->prepare(
                'UPDATE transactions SET provider_reference = ?, status = ? WHERE id = ?'
            )->execute([$transferToken, $status === 'SUCCESS' ? 'PROCESSING' : $status, $txId]);
        } catch (\Throwable $e) {
            $pdo->prepare('UPDATE transactions SET status = "FAILED" WHERE id = ?')->execute([$txId]);
            throw $e;
        }

        return $this->getTransfer($user['id'], $txId);
    }

    public function getTransfer(int $userId, int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    public function listTransfers(int $userId, int $limit = 20): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $userId, \PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function handleWebhook(array $payload): void
    {
        $pdo = Database::connection();
        $merchantRef = $payload['merchant_transaction_id'] ?? $payload['data']['merchant_transaction_id'] ?? null;
        $status = $payload['status'] ?? $payload['data']['status'] ?? null;

        if (!$merchantRef || !$status) {
            return;
        }

        $mapped = MagmaService::mapStatus($status);
        $pdo->prepare(
            'UPDATE transactions SET status = ?, updated_at = NOW(), completed_at = IF(? = "SUCCESS", NOW(), completed_at)
             WHERE reference = ?'
        )->execute([$mapped, $mapped, $merchantRef]);
    }

    private function findByIdempotency(string $key): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE idempotency_key = ?');
        $stmt->execute([$key]);
        return $stmt->fetch() ?: null;
    }

    private function getCountryCurrency(string $code): string
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT currency FROM countries WHERE code = ?');
        $stmt->execute([$code]);
        $row = $stmt->fetch();
        return $row['currency'] ?? 'XAF';
    }
}
