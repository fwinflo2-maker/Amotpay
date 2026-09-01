<?php

declare(strict_types=1);

namespace AmotPay\Core\Eligibility;

use AmotPay\Core\Capability\CapabilityEngine;
use AmotPay\Core\Capability\CapabilityStatus;
use AmotPay\Core\FeatureFlags;
use AmotPay\Identity\KycStatus;

final class EligibilityEngine
{
    public function __construct(
        private CapabilityEngine $capabilities = new CapabilityEngine(),
        private FeatureFlags $flags = new FeatureFlags(),
        private AccountEligibilityEngine $accounts = new AccountEligibilityEngine()
    ) {}

    /** @param array<string, mixed> $user */
    public function evaluateUser(array $user): array
    {
        $kycStatus = (string) ($user['kyc_status'] ?? KycStatus::NOT_STARTED);
        $country = (string) ($user['country_code'] ?? '');
        $kycVerified = KycStatus::isVerified($kycStatus);

        return [
            'kyc_status' => $kycStatus,
            'kyc_verified' => $kycVerified,
            'country_code' => $country,
            'features' => [
                'international_transfer' => $this->canAccessFeature(
                    FeatureFlags::INTERNATIONAL_TRANSFER,
                    $kycStatus,
                    $country,
                    'transfer',
                    'international'
                ),
                'crypto' => $this->canAccessFeature(FeatureFlags::CRYPTO, $kycStatus, $country, 'crypto', 'buy'),
                'usd_account' => $this->accounts->evaluate($user, 'USD_ACCOUNT'),
                'eur_account' => $this->accounts->evaluate($user, 'EUR_ACCOUNT'),
                'virtual_card' => $this->canAccessFeature(
                    FeatureFlags::VIRTUAL_CARD,
                    $kycStatus,
                    $country,
                    'card',
                    'virtual'
                ),
                'onchain_withdrawal' => $this->canAccessFeature(
                    FeatureFlags::ONCHAIN_WITHDRAWAL,
                    $kycStatus,
                    $country,
                    'crypto',
                    'withdraw_onchain'
                ),
            ],
        ];
    }

    public function canAccessFeature(
        string $flagKey,
        string $kycStatus,
        string $countryCode,
        string $capabilityType,
        string $capabilityKey
    ): array {
        if (!$this->flags->isEnabled($flagKey)) {
            return $this->result(CapabilityStatus::DISABLED, 'Feature flag disabled');
        }

        if (!KycStatus::allowsFinancialAccess($kycStatus)) {
            return $this->result(CapabilityStatus::PENDING_KYC, 'Identity verification required');
        }

        $capability = $this->capabilities->getCapability('CASHRAMP', $capabilityType, $capabilityKey, $countryCode);

        if ($capability['status'] === CapabilityStatus::UNAVAILABLE) {
            return $this->result(CapabilityStatus::UNAVAILABLE, 'Not available in your country');
        }

        return $this->result($capability['status'], null, $capability);
    }

    /** @return array{status: string, reason: string|null, capability?: array<string, mixed>} */
    private function result(string $status, ?string $reason, ?array $capability = null): array
    {
        $out = ['status' => $status, 'reason' => $reason];
        if ($capability !== null) {
            $out['capability'] = $capability;
        }

        return $out;
    }
}
