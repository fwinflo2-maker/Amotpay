<?php

declare(strict_types=1);

namespace AmotPay\Core\Eligibility;

use AmotPay\Core\Capability\CapabilityEngine;
use AmotPay\Core\Capability\CapabilityStatus;
use AmotPay\Core\FeatureFlags;
use AmotPay\Identity\KycStatus;

final class AccountEligibilityEngine
{
    public function __construct(
        private CapabilityEngine $capabilities = new CapabilityEngine(),
        private FeatureFlags $flags = new FeatureFlags()
    ) {}

    /** @param array<string, mixed> $user */
    public function evaluate(array $user, string $accountFlag): array
    {
        $kycStatus = (string) ($user['kyc_status'] ?? KycStatus::NOT_STARTED);
        $country = (string) ($user['country_code'] ?? '');

        if (!$this->flags->isEnabled($accountFlag)) {
            return ['status' => CapabilityStatus::DISABLED, 'reason' => 'Product not enabled'];
        }

        if (!KycStatus::isVerified($kycStatus)) {
            return ['status' => CapabilityStatus::PENDING_KYC, 'reason' => 'Complete identity verification first'];
        }

        $productKey = match ($accountFlag) {
            FeatureFlags::USD_ACCOUNT => 'usd_virtual_account',
            FeatureFlags::EUR_ACCOUNT => 'eur_account',
            default => strtolower($accountFlag),
        };

        $capability = $this->capabilities->getCapability('CASHRAMP', 'account', $productKey, $country);

        return [
            'status' => $capability['status'],
            'reason' => $capability['status'] === CapabilityStatus::AVAILABLE ? null : 'Not available for your profile',
            'capability' => $capability,
        ];
    }
}
