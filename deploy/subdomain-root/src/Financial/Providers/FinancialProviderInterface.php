<?php

declare(strict_types=1);

namespace AmotPay\Financial\Providers;

interface FinancialProviderInterface
{
    public function getProviderCode(): string;

    public function isConfigured(): bool;

    public function healthCheck(): array;

    /** @return array<int, array<string, mixed>> */
    public function getAvailableCountries(): array;

    /** @return array<int, array<string, mixed>> */
    public function getRampableAssets(): array;

    public function createCustomer(string $email, string $firstName, string $lastName, string $countryId): array;

    public function getRampQuote(
        string $customerId,
        float $amount,
        string $currency,
        string $paymentMethodType,
        string $paymentType = 'deposit',
        ?string $country = null
    ): array;
}
