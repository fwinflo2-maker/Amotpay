<?php

declare(strict_types=1);

namespace AmotPay\Financial\Quotes;

use AmotPay\Database\Database;
use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;
use AmotPay\Http\ApiException;
use AmotPay\Utils\ReferenceGenerator;

final class QuoteEngine
{
    public function __construct(private CashrampAdapter $provider = new CashrampAdapter()) {}

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     */
    public function createQuote(array $user, array $input): array
    {
        if (!$this->provider->isConfigured()) {
            throw new ApiException('Financial provider is not configured', 503, 'PROVIDER_NOT_CONFIGURED');
        }

        $sourceAmount = $this->normalizeAmount($input['source_amount'] ?? $input['amount'] ?? null);
        $sourceCurrency = strtoupper((string) ($input['source_currency'] ?? $user['currency'] ?? ''));
        $destinationCurrency = strtoupper((string) ($input['destination_currency'] ?? ''));
        $destinationCountry = strtoupper((string) ($input['destination_country'] ?? ''));
        $paymentMethod = (string) ($input['payment_method'] ?? $input['payment_method_type'] ?? '');

        if (!preg_match('/^[A-Z]{3}$/', $sourceCurrency) || !preg_match('/^[A-Z]{3}$/', $destinationCurrency)) {
            throw new \InvalidArgumentException('Invalid currency code');
        }
        if ($paymentMethod === '') {
            throw new \InvalidArgumentException('Payment method is required');
        }

        $customerId = (string) ($user['cashramp_customer_id'] ?? '');
        if ($customerId === '') {
            throw new ApiException('Cashramp customer profile required', 422, 'CUSTOMER_NOT_READY');
        }

        $providerQuote = $this->provider->getRampQuote(
            $customerId,
            (float) $sourceAmount,
            $sourceCurrency,
            $paymentMethod,
            (string) ($input['payment_type'] ?? 'deposit'),
            $destinationCountry !== '' ? $destinationCountry : null
        );

        $quoteData = $providerQuote['data']['rampQuote'] ?? null;
        if (!is_array($quoteData)) {
            throw new ApiException('Unable to obtain a live quote', 422, 'QUOTE_UNAVAILABLE');
        }

        $exchangeRate = (string) ($quoteData['exchangeRate'] ?? '0');
        $destinationAmount = $this->computeDestinationAmount($sourceAmount, $exchangeRate);
        $providerFee = null;
        $networkFee = null;
        $platformFee = '0.00';
        $totalDebit = $sourceAmount;
        $expiresAt = date('Y-m-d H:i:s', time() + 300);
        $quoteRef = ReferenceGenerator::generate('QTE');

        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO quotes (
                quote_ref, user_id, source_country, source_currency, source_amount,
                destination_country, destination_currency, destination_amount,
                exchange_rate, provider_fee, network_fee, platform_fee,
                total_debit, net_receive, provider, provider_quote_id, expires_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $quoteRef,
            (int) $user['id'],
            $user['country_code'] ?? null,
            $sourceCurrency,
            $sourceAmount,
            $destinationCountry !== '' ? $destinationCountry : null,
            $destinationCurrency,
            $destinationAmount,
            $exchangeRate,
            $providerFee,
            $networkFee,
            $platformFee,
            $totalDebit,
            $destinationAmount,
            'CASHRAMP',
            $quoteData['id'] ?? null,
            $expiresAt,
        ]);

        return [
            'quote_ref' => $quoteRef,
            'source_amount' => $sourceAmount,
            'source_currency' => $sourceCurrency,
            'destination_amount' => $destinationAmount,
            'destination_currency' => $destinationCurrency,
            'exchange_rate' => $exchangeRate,
            'provider_fee' => $providerFee,
            'network_fee' => $networkFee,
            'platform_fee' => $platformFee,
            'total_debit' => $totalDebit,
            'net_receive' => $destinationAmount,
            'expires_at' => date('c', strtotime($expiresAt)),
            'provider' => 'CASHRAMP',
        ];
    }

    public function getActiveQuote(string $quoteRef, int $userId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT * FROM quotes WHERE quote_ref = ? AND user_id = ? AND status = ? AND expires_at > NOW()'
        );
        $stmt->execute([$quoteRef, $userId, 'ACTIVE']);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    private function normalizeAmount(mixed $amount): string
    {
        if (!is_numeric($amount) || (float) $amount <= 0) {
            throw new \InvalidArgumentException('Invalid amount');
        }
        $normalized = number_format((float) $amount, 2, '.', '');
        if (!preg_match('/^\d+\.\d{2}$/', $normalized)) {
            throw new \InvalidArgumentException('Amount precision not supported');
        }

        return $normalized;
    }

    private function computeDestinationAmount(string $sourceAmount, string $rate): string
    {
        $result = bcmul($sourceAmount, $rate, 8);

        return number_format((float) $result, 2, '.', '');
    }
}
