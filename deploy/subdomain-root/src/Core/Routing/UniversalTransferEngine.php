<?php

declare(strict_types=1);

namespace AmotPay\Core\Routing;

use AmotPay\Core\Eligibility\EligibilityEngine;
use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;
use AmotPay\Financial\Quotes\QuoteEngine;
use AmotPay\Http\ApiException;
use AmotPay\Ledger\LedgerService;
use AmotPay\Utils\ReferenceGenerator;

/**
 * Universal corridor engine — no hardcoded country pairs.
 * Internal crypto routes are never exposed to the user.
 */
final class UniversalTransferEngine
{
    public function __construct(
        private EligibilityEngine $eligibility = new EligibilityEngine(),
        private QuoteEngine $quotes = new QuoteEngine(),
        private CashrampAdapter $cashramp = new CashrampAdapter(),
        private LedgerService $ledger = new LedgerService()
    ) {}

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     */
    public function quote(array $user, array $input): array
    {
        $eligibility = $this->eligibility->evaluateUser($user);
        $transferAccess = $eligibility['features']['international_transfer'] ?? [];
        if (($transferAccess['status'] ?? 'UNAVAILABLE') !== 'AVAILABLE') {
            throw new ApiException(
                (string) ($transferAccess['reason'] ?? 'Transfer not available'),
                403,
                'TRANSFER_NOT_ELIGIBLE'
            );
        }

        $quote = $this->quotes->createQuote($user, [
            'source_amount' => $input['source_amount'] ?? $input['amount'] ?? null,
            'source_currency' => $input['source_currency'] ?? $user['currency'] ?? null,
            'destination_country' => $input['destination_country'] ?? null,
            'destination_currency' => $input['destination_currency'] ?? null,
            'payment_method' => $input['payment_method'] ?? $input['payout_method'] ?? null,
            'payment_type' => $input['payment_type'] ?? 'deposit',
        ]);

        return [
            'you_send' => [
                'amount' => $quote['source_amount'],
                'currency' => $quote['source_currency'],
            ],
            'recipient_gets' => [
                'amount' => $quote['destination_amount'],
                'currency' => $quote['destination_currency'],
            ],
            'fee' => [
                'provider' => $quote['provider_fee'],
                'platform' => $quote['platform_fee'],
                'total' => $quote['provider_fee'] ?? $quote['platform_fee'],
                'currency' => $quote['source_currency'],
            ],
            'exchange_rate' => $quote['exchange_rate'],
            'expires_at' => $quote['expires_at'],
            'quote_id' => $quote['quote_ref'],
            'provider' => 'CASHRAMP',
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     */
    public function execute(array $user, array $input, ?string $idempotencyKey): array
    {
        $quoteRef = trim((string) ($input['quote_ref'] ?? $input['quote_id'] ?? ''));
        if ($quoteRef === '') {
            throw new \InvalidArgumentException('quote_ref is required');
        }

        $idempotencyKey = trim((string) $idempotencyKey);
        if (!preg_match('/^[A-Za-z0-9._:-]{16,64}$/', $idempotencyKey)) {
            throw new ApiException('Valid Idempotency-Key header is required', 422, 'IDEMPOTENCY_KEY_REQUIRED');
        }

        $quote = $this->quotes->getActiveQuote($quoteRef, (int) $user['id']);
        if (!$quote) {
            throw new ApiException('This quote has expired. Get a new quote.', 422, 'QUOTE_EXPIRED');
        }

        $recipient = $input['recipient'] ?? [];
        if (!is_array($recipient) || $recipient === []) {
            throw new \InvalidArgumentException('recipient is required');
        }

        $requestHash = hash('sha256', json_encode([
            'quote' => $quoteRef,
            'recipient' => $recipient,
            'user' => (int) $user['id'],
        ]));

        $pdo = \AmotPay\Database\Database::connection();
        $existing = $pdo->prepare(
            'SELECT reference, status FROM transfer_orders WHERE user_id = ? AND idempotency_key = ?'
        );
        $existing->execute([(int) $user['id'], $idempotencyKey]);
        $dup = $existing->fetch();
        if ($dup) {
            return $this->formatTransferResponse($dup['reference'], (string) $dup['status']);
        }

        $reference = ReferenceGenerator::generate('TRF');
        $pdo->prepare(
            'INSERT INTO transfer_orders (
                user_id, quote_id, reference, idempotency_key, request_hash,
                source_country, source_currency, source_amount,
                destination_country, destination_currency, destination_amount,
                payout_method, recipient, provider, provider_reference, status,
                provider_fee, platform_fee
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            (int) $user['id'],
            (int) $quote['id'],
            $reference,
            $idempotencyKey,
            $requestHash,
            $quote['source_country'] ?? $user['country_code'],
            $quote['source_currency'],
            $quote['source_amount'],
            $quote['destination_country'] ?? '',
            $quote['destination_currency'],
            $quote['destination_amount'],
            (string) ($input['payout_method'] ?? 'mobile_money'),
            json_encode($recipient),
            'CASHRAMP',
            $quote['provider_quote_id'],
            'CONFIRMED',
            $quote['provider_fee'],
            $quote['platform_fee'],
        ]);

        $transferId = (int) $pdo->lastInsertId();

        $ledgerRef = $this->ledger->post(
            'transfer',
            [
                [
                    'account_type' => 'user_liability',
                    'account_id' => 'user:' . $user['id'],
                    'currency' => $quote['source_currency'],
                    'entry_type' => 'debit',
                    'amount' => $quote['total_debit'],
                    'balance_type' => 'pending',
                ],
                [
                    'account_type' => 'provider_transit',
                    'account_id' => 'cashramp',
                    'currency' => $quote['source_currency'],
                    'entry_type' => 'credit',
                    'amount' => $quote['total_debit'],
                    'balance_type' => 'in_transit',
                ],
            ],
            (int) $user['id'],
            'transfer_order',
            $transferId,
            'PENDING',
            'Transfer ' . $reference
        );

        $providerRef = (string) ($quote['provider_quote_id'] ?? '');
        $status = 'PAYMENT_PENDING';

        if ($this->cashramp->isConfigured() && $providerRef !== '') {
            try {
                $phone = (string) ($user['phone'] ?? ($recipient['phone'] ?? ''));
                $initiated = $this->cashramp->initiateRampQuoteDeposit(
                    $providerRef,
                    $reference,
                    $phone !== '' ? $phone : null
                );
                $payment = $initiated['data']['initiateRampQuoteDeposit'] ?? [];
                $providerRef = (string) ($payment['id'] ?? $providerRef);
                $status = 'PAYMENT_PENDING';
            } catch (\Throwable $e) {
                $status = 'FAILED';
                $pdo->prepare('UPDATE transfer_orders SET status = ? WHERE id = ?')
                    ->execute([$status, $transferId]);
                throw new ApiException(
                    'Transfer could not be submitted to Cashramp',
                    502,
                    'PROVIDER_EXECUTION_FAILED'
                );
            }
        }

        $pdo->prepare(
            'UPDATE transfer_orders SET status = ?, provider_reference = ? WHERE id = ?'
        )->execute([$status, $providerRef, $transferId]);

        $pdo->prepare('UPDATE quotes SET status = ? WHERE id = ?')->execute(['USED', (int) $quote['id']]);

        return $this->formatTransferResponse($reference, $status, $ledgerRef);
    }

    /** @return array<string, mixed> */
    private function formatTransferResponse(string $reference, string $status, ?string $ledgerRef = null): array
    {
        return [
            'reference' => $reference,
            'status' => $status,
            'provider' => 'CASHRAMP',
            'ledger_reference' => $ledgerRef,
        ];
    }
}
