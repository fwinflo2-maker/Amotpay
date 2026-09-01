<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\ApiException;
use AmotPay\Utils\ReferenceGenerator;
use PDO;
use PDOException;

final class TransferService
{
    public function __construct(private MagmaService $magma = new MagmaService()) {}

    public function checkBeneficiary(array $user, array $data): array
    {
        $validated = $this->validateTransferInput($user, $data, false, false);
        $payload = [
            'country_code' => $validated['destination_country'],
            'operator_code' => $validated['payment_method'],
            'channel' => $validated['channel'],
        ];
        if ($validated['channel'] === 'bank_account') {
            $payload['account_number'] = $validated['receiver_account'];
        } else {
            $payload['phone_number'] = $validated['receiver_account'];
        }
        return $this->magma->checkAccount($payload);
    }

    public function createQuote(array $user, array $data): array
    {
        $validated = $this->validateTransferInput($user, $data, false, true, false);
        $sourceCurrency = strtoupper((string) $user['currency']);
        if ($sourceCurrency !== $validated['destination_currency']) {
            throw new ApiException(
                'No documented FX quote provider is configured for this currency pair',
                422,
                'QUOTE_UNAVAILABLE'
            );
        }

        return [
            'source_country' => $user['country_code'],
            'source_currency' => $sourceCurrency,
            'destination_country' => $validated['destination_country'],
            'destination_currency' => $validated['destination_currency'],
            'payment_method' => $validated['payment_method'],
            'channel' => $validated['channel'],
            'source_amount' => $validated['amount'],
            'destination_amount' => $validated['amount'],
            'provider_fee' => null,
            'application_fee' => '0.00',
            'exchange_rate' => '1.00000000',
            'total_payable' => $validated['amount'],
            'provider' => 'MAGMA',
            'funding_source' => 'prefunded_magma_merchant_balance',
            'fees_disclosed_by_provider' => false,
            'expires_at' => date('c', time() + 300),
        ];
    }

    public function createTransfer(array $user, array $data, ?string $idempotencyKey): array
    {
        if (Env::get('MAGMA_PAYOUTS_ENABLED', 'false') !== 'true') {
            throw new ApiException('Fiat payouts are not enabled', 503, 'PAYOUTS_DISABLED');
        }
        if (!(bool) ($user['payout_enabled'] ?? false)) {
            throw new ApiException('This account is not approved for payouts', 403, 'PAYOUT_NOT_APPROVED');
        }
        $appUrl = rtrim(Env::get('APP_URL', '') ?? '', '/');
        if (!filter_var($appUrl, FILTER_VALIDATE_URL) || parse_url($appUrl, PHP_URL_SCHEME) !== 'https') {
            throw new ApiException('A public HTTPS webhook URL is required', 503, 'WEBHOOK_URL_NOT_CONFIGURED');
        }
        $webhookUrl = $appUrl . '/api/webhooks/magma';
        $idempotencyKey = trim((string) $idempotencyKey);
        if (!preg_match('/^[A-Za-z0-9._:-]{16,64}$/', $idempotencyKey)) {
            throw new ApiException('A 16-64 character idempotency key is required', 422, 'INVALID_IDEMPOTENCY_KEY');
        }

        $validated = $this->validateTransferInput($user, $data, true);
        $quote = $this->createQuote($user, $data);
        $requestHash = hash('sha256', $this->canonicalJson($validated));
        $pdo = Database::connection();

        $existing = $this->findByIdempotency((int) $user['id'], $idempotencyKey);
        if ($existing) {
            $this->assertSameRequest($existing, $requestHash);
            return $this->publicTransfer($existing);
        }
        if (in_array($validated['channel'], ['mobile_money', 'bank_account'], true)) {
            try {
                $this->checkBeneficiary($user, $data);
            } catch (ApiException $e) {
                throw $e;
            } catch (\Throwable) {
                throw new ApiException('Beneficiary could not be validated by Magma', 502, 'BENEFICIARY_CHECK_FAILED');
            }
        }

        $pdo->beginTransaction();
        try {
            $existing = $this->findByIdempotency((int) $user['id'], $idempotencyKey, true);
            if ($existing) {
                $this->assertSameRequest($existing, $requestHash);
                $pdo->commit();
                return $this->publicTransfer($existing);
            }

            $reference = ReferenceGenerator::fiat();
            $insert = $pdo->prepare(
                'INSERT INTO transactions
                 (user_id, reference, source_country, source_currency, destination_country, destination_currency,
                  payment_method, recipient_phone, recipient_first_name, recipient_last_name,
                  source_amount, provider_fee, application_fee, exchange_rate, destination_amount,
                  total_payable, provider, idempotency_key, request_hash, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 1, ?, ?, "MAGMA", ?, ?, "PENDING")'
            );
            $insert->execute([
                $user['id'],
                $reference,
                $quote['source_country'],
                $quote['source_currency'],
                $quote['destination_country'],
                $quote['destination_currency'],
                $quote['payment_method'],
                $validated['receiver_account'],
                $validated['recipient_first_name'],
                $validated['recipient_last_name'],
                $quote['source_amount'],
                $quote['destination_amount'],
                $quote['total_payable'],
                $idempotencyKey,
                $requestHash,
            ]);
            $txId = (int) $pdo->lastInsertId();
            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if ((string) $e->getCode() !== '23000') {
                throw $e;
            }
            $existing = $this->findByIdempotency((int) $user['id'], $idempotencyKey);
            if (!$existing) {
                throw $e;
            }
            $this->assertSameRequest($existing, $requestHash);
            return $this->publicTransfer($existing);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $payload = [
            'merchant_transaction_id' => $reference,
            'amount' => (float) $quote['destination_amount'],
            'currency' => $quote['destination_currency'],
            'description' => 'AmotPay transfer ' . $reference,
            'channel' => $validated['channel'],
            'country_code' => $quote['destination_country'],
            'receiver_account' => $validated['receiver_account'],
            'payment_method' => $quote['payment_method'],
            'receiver_first_name' => $validated['recipient_first_name'],
            'receiver_last_name' => $validated['recipient_last_name'],
            'webhook_url' => $webhookUrl,
        ];
        if ($validated['channel'] === 'bank_account') {
            unset($payload['receiver_account']);
            $payload += [
                'receiver_account_number' => $validated['receiver_account'],
                'receiver_bank_name' => $validated['receiver_bank_name'],
                'receiver_bank_short_code' => $validated['receiver_bank_short_code'],
            ];
        }
        if (in_array($user['country_code'], ['CM', 'GH'], true)) {
            $payload['sender_firstname'] = $user['first_name'];
            $payload['sender_lastname'] = $user['last_name'];
        }
        if ($user['country_code'] === 'CM') {
            $payload['sender_phone_number'] = $user['phone'];
        }

        try {
            $result = $this->magma->executeTransfer($payload);
            $providerData = $result['data'] ?? [];
            $token = is_array($providerData) ? ($providerData['transfer_token'] ?? null) : null;
            if (!is_string($token) || $token === '' || strlen($token) > 100) {
                throw new \RuntimeException('Magma transfer response has no valid transfer token');
            }
            if (isset($providerData['merchant_transaction_id']) && !hash_equals($reference, (string) $providerData['merchant_transaction_id'])) {
                throw new \RuntimeException('Magma transfer response reference mismatch');
            }
            if (isset($providerData['currency']) && strtoupper((string) $providerData['currency']) !== $quote['destination_currency']) {
                throw new \RuntimeException('Magma transfer response currency mismatch');
            }
            if (isset($providerData['amount']) && self::normalizeAmount($providerData['amount']) !== $quote['destination_amount']) {
                throw new \RuntimeException('Magma transfer response amount mismatch');
            }
            $status = MagmaService::mapStatus((string) ($providerData['status'] ?? 'new'));
            $pdo->prepare(
                'UPDATE transactions
                 SET provider_reference = COALESCE(provider_reference, ?),
                     status = IF(status IN ("SUCCESS", "FAILED", "CANCELLED"), status, ?),
                     completed_at = IF(? IN ("SUCCESS", "FAILED"), COALESCE(completed_at, NOW()), completed_at)
                 WHERE id = ?'
            )->execute([$token, $status, $status, $txId]);
        } catch (\Throwable $e) {
            // A timeout can occur after provider acceptance; keep the row reconcilable, never retry blindly.
            $pdo->prepare(
                'UPDATE transactions SET status = IF(status IN ("SUCCESS", "FAILED", "CANCELLED"), status, "PROCESSING") WHERE id = ?'
            )->execute([$txId]);
            throw new ApiException('Magma transfer submission is awaiting reconciliation', 502, 'PROVIDER_UNCERTAIN');
        }

        return $this->getTransfer((int) $user['id'], $txId);
    }

    public function getTransfer(int $userId, int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, user_id, reference, source_country, source_currency, destination_country, destination_currency,
             payment_method, recipient_phone, recipient_first_name, recipient_last_name, source_amount, provider_fee,
             application_fee, exchange_rate, destination_amount, total_payable, provider, provider_reference, status,
             created_at, updated_at, completed_at FROM transactions WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    public function listTransfers(int $userId, int $limit = 20): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, user_id, reference, source_country, source_currency, destination_country, destination_currency,
             payment_method, recipient_phone, recipient_first_name, recipient_last_name, source_amount, provider_fee,
             application_fee, exchange_rate, destination_amount, total_payable, provider, provider_reference, status,
             created_at, updated_at, completed_at FROM transactions
             WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, max(1, min($limit, 100)), PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function handleWebhook(array $payload): bool
    {
        $event = (string) ($payload['event'] ?? '');
        $data = $payload['data'] ?? null;
        if (!is_array($data) || !preg_match('/^payout\.(new|pending|success|failed)\.webhook$/', $event, $match)) {
            throw new ApiException('Invalid Magma webhook payload', 422, 'INVALID_WEBHOOK');
        }
        $status = strtolower((string) ($data['transfer_status'] ?? ''));
        if ($status !== $match[1]) {
            throw new ApiException('Inconsistent Magma webhook status', 422, 'INVALID_WEBHOOK');
        }
        $reference = trim((string) ($data['merchant_transaction_id'] ?? ''));
        $providerReference = trim((string) ($data['transfer_token'] ?? ''));
        if ($reference === '' || strlen($reference) > 100 || $providerReference === '' || strlen($providerReference) > 100) {
            throw new ApiException('Invalid Magma webhook reference', 422, 'INVALID_WEBHOOK');
        }

        $eventHash = hash('sha256', $event . "\n" . json_encode($data, JSON_UNESCAPED_SLASHES));
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare(
                'INSERT INTO webhooks (provider, event_type, provider_reference, event_hash, payload)
                 VALUES ("MAGMA", ?, ?, ?, ?)'
            );
            $insert->execute([$event, $providerReference, $eventHash, json_encode($this->redactWebhook($payload))]);
            $webhookId = (int) $pdo->lastInsertId();

            $stmt = $pdo->prepare('SELECT * FROM transactions WHERE reference = ? FOR UPDATE');
            $stmt->execute([$reference]);
            $tx = $stmt->fetch();
            if (!$tx) {
                throw new ApiException('Unknown transfer reference', 409, 'UNKNOWN_TRANSFER');
            }
            if ($tx['provider_reference'] && !hash_equals((string) $tx['provider_reference'], $providerReference)) {
                throw new ApiException('Magma transfer token mismatch', 409, 'WEBHOOK_MISMATCH');
            }
            if (isset($data['currency']) && strtoupper((string) $data['currency']) !== $tx['destination_currency']) {
                throw new ApiException('Magma webhook currency mismatch', 409, 'WEBHOOK_MISMATCH');
            }
            if (isset($data['amount']) && self::normalizeAmount($data['amount']) !== self::normalizeAmount($tx['destination_amount'])) {
                throw new ApiException('Magma webhook amount mismatch', 409, 'WEBHOOK_MISMATCH');
            }

            $mapped = MagmaService::mapStatus($status);
            $lastError = null;
            if (MagmaService::canTransition($tx['status'], $mapped)) {
                $pdo->prepare(
                    'UPDATE transactions SET provider_reference = COALESCE(provider_reference, ?), status = ?,
                     completed_at = IF(? IN ("SUCCESS", "FAILED"), COALESCE(completed_at, NOW()), completed_at)
                     WHERE id = ?'
                )->execute([$providerReference, $mapped, $mapped, $tx['id']]);
            } else {
                $lastError = 'final_status_transition_ignored';
            }
            $pdo->prepare('UPDATE webhooks SET processed = 1, processed_at = NOW(), last_error = ? WHERE id = ?')
                ->execute([$lastError, $webhookId]);
            $pdo->commit();
            return true;
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if ((string) $e->getCode() === '23000') {
                return false;
            }
            throw $e;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function normalizeAmount(mixed $amount): string
    {
        $value = trim((string) $amount);
        if (!preg_match('/^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/', $value, $match)) {
            throw new \InvalidArgumentException('Invalid amount');
        }
        return $match[1] . '.' . str_pad($match[2] ?? '', 2, '0');
    }

    private function validateTransferInput(
        array $user,
        array $data,
        bool $withRecipient,
        bool $requireAmount = true,
        bool $requireAccount = true,
    ): array
    {
        $source = strtoupper(trim((string) ($data['source_country'] ?? $user['country_code'] ?? '')));
        $destination = strtoupper(trim((string) ($data['destination_country'] ?? $data['country_code'] ?? '')));
        $paymentMethod = strtoupper(trim((string) ($data['payment_method'] ?? $data['operator_code'] ?? '')));
        if ($source !== ($user['country_code'] ?? '') || !preg_match('/^[A-Z]{2}$/', $destination)) {
            throw new \InvalidArgumentException('Invalid source or destination country');
        }

        $pdo = Database::connection();
        $corridor = $pdo->prepare(
            'SELECT 1 FROM corridors WHERE source_country = ? AND destination_country = ? AND provider = "MAGMA" AND active = 1'
        );
        $corridor->execute([$source, $destination]);
        if (!$corridor->fetchColumn()) {
            throw new ApiException('Corridor is not available', 422, 'INVALID_CORRIDOR');
        }

        $methodStmt = $pdo->prepare(
            'SELECT * FROM payment_methods
             WHERE country_code = ? AND provider_code = ? AND provider = "MAGMA" AND active = 1'
        );
        $methodStmt->execute([$destination, $paymentMethod]);
        $method = $methodStmt->fetch();
        if (!$method) {
            throw new ApiException('Payment method is not available for this country', 422, 'INVALID_PAYMENT_METHOD');
        }
        $methodChannel = $method['type'] === 'bank_transfer' ? 'bank_account' : $method['type'];
        $channel = strtolower(trim((string) ($data['channel'] ?? $methodChannel)));
        if ($channel !== $methodChannel || !in_array($channel, ['mobile_money', 'wave', 'bank_account'], true)) {
            throw new ApiException('Invalid channel for payment method', 422, 'INVALID_PAYMENT_METHOD');
        }

        $amount = $requireAmount ? self::normalizeAmount($data['amount'] ?? '') : '0.00';
        if ($requireAmount && !$this->amountInRange($amount, (string) $method['min_amount'], (string) $method['max_amount'])) {
            throw new ApiException('Amount is outside payment method limits', 422, 'AMOUNT_OUT_OF_RANGE');
        }
        $result = [
            'destination_country' => $destination,
            'destination_currency' => strtoupper((string) $method['currency']),
            'payment_method' => $paymentMethod,
            'channel' => $channel,
            'amount' => $amount,
        ];
        if (!$withRecipient) {
            $account = trim((string) ($data['phone_number'] ?? $data['account_number'] ?? $data['recipient_phone'] ?? ''));
        } else {
            $account = trim((string) ($data['recipient_phone'] ?? $data['receiver_account'] ?? $data['receiver_account_number'] ?? ''));
            $result['recipient_first_name'] = $this->validName($data['recipient_first_name'] ?? '', 'recipient_first_name');
            $result['recipient_last_name'] = $this->validName($data['recipient_last_name'] ?? '', 'recipient_last_name');
        }
        if (!$requireAccount) {
            return $result;
        }
        if ($channel === 'bank_account') {
            if (!preg_match('/^[A-Za-z0-9 -]{5,34}$/', $account)) {
                throw new \InvalidArgumentException('Invalid bank account');
            }
            if ($withRecipient) {
                $result['receiver_bank_name'] = $this->validName($data['receiver_bank_name'] ?? '', 'receiver_bank_name');
                $result['receiver_bank_short_code'] = strtoupper(trim((string) ($data['receiver_bank_short_code'] ?? '')));
                if (!preg_match('/^[A-Z0-9]{2,10}$/', $result['receiver_bank_short_code'])) {
                    throw new \InvalidArgumentException('Invalid receiver_bank_short_code');
                }
            }
        } elseif (!preg_match('/^\+[1-9]\d{7,14}$/', $account)) {
            throw new \InvalidArgumentException('Recipient phone must use E.164 format');
        }
        $result['receiver_account'] = $account;
        return $result;
    }

    private function validName(mixed $value, string $field): string
    {
        $name = trim((string) $value);
        if (strlen($name) < 2 || strlen($name) > 100 || preg_match('/[\x00-\x1F\x7F]/', $name)) {
            throw new \InvalidArgumentException("Invalid {$field}");
        }
        return $name;
    }

    private function amountInRange(string $amount, string $minimum, string $maximum): bool
    {
        $toMinor = static function (string $value): string {
            $normalized = self::normalizeAmount($value);
            return ltrim(str_replace('.', '', $normalized), '0') ?: '0';
        };
        $compare = static function (string $left, string $right): int {
            return strlen($left) <=> strlen($right) ?: strcmp($left, $right);
        };
        $minor = $toMinor($amount);
        return $compare($minor, $toMinor($minimum)) >= 0 && $compare($minor, $toMinor($maximum)) <= 0;
    }

    private function findByIdempotency(int $userId, string $key, bool $lock = false): ?array
    {
        $sql = 'SELECT * FROM transactions WHERE user_id = ? AND idempotency_key = ?' . ($lock ? ' FOR UPDATE' : '');
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute([$userId, $key]);
        return $stmt->fetch() ?: null;
    }

    private function assertSameRequest(array $existing, string $requestHash): void
    {
        if ($existing['request_hash'] && !hash_equals($existing['request_hash'], $requestHash)) {
            throw new ApiException('Idempotency key was already used for another request', 409, 'IDEMPOTENCY_CONFLICT');
        }
    }

    private function publicTransfer(array $transaction): array
    {
        unset($transaction['idempotency_key'], $transaction['request_hash']);
        return $transaction;
    }

    private function canonicalJson(array $data): string
    {
        ksort($data);
        return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    private function redactWebhook(array $payload): array
    {
        foreach (['payee', 'receiver_account'] as $field) {
            if (isset($payload['data'][$field])) {
                $payload['data'][$field] = '[redacted]';
            }
        }
        return $payload;
    }
}
