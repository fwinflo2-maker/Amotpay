<?php

declare(strict_types=1);

namespace AmotPay\Financial\Providers\Cashramp;

use AmotPay\Financial\Providers\FinancialProviderInterface;
use AmotPay\Services\CashrampService;

final class CashrampAdapter implements FinancialProviderInterface
{
    public function __construct(private CashrampService $client = new CashrampService()) {}

    public function getProviderCode(): string
    {
        return 'CASHRAMP';
    }

    public function isConfigured(): bool
    {
        return $this->client->isConfigured();
    }

    public function healthCheck(): array
    {
        return $this->client->healthCheck();
    }

    public function getAvailableCountries(): array
    {
        return $this->client->getAvailableCountries();
    }

    public function getRampableAssets(): array
    {
        return $this->client->getRampableAssets();
    }

    public function createCustomer(string $email, string $firstName, string $lastName, string $countryId): array
    {
        return $this->client->createCustomer($email, $firstName, $lastName, $countryId);
    }

    public function getRampQuote(
        string $customerId,
        float $amount,
        string $currency,
        string $paymentMethodType,
        string $paymentType = 'deposit',
        ?string $country = null
    ): array {
        return $this->client->getRampQuote($customerId, $amount, $currency, $paymentMethodType, $paymentType, $country);
    }

    public function initiateRampQuoteDeposit(
        string $quoteId,
        string $reference,
        ?string $phoneNumber = null,
        ?array $onchainTransferInfo = null
    ): array {
        return $this->client->initiateRampQuoteDeposit($quoteId, $reference, $phoneNumber, $onchainTransferInfo);
    }

    public function getPaymentRequestByReference(string $reference): array
    {
        return $this->client->getPaymentRequestByReference($reference);
    }
}
