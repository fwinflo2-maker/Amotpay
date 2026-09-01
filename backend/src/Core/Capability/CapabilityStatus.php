<?php

declare(strict_types=1);

namespace AmotPay\Core\Capability;

final class CapabilityStatus
{
    public const AVAILABLE = 'AVAILABLE';
    public const UNAVAILABLE = 'UNAVAILABLE';
    public const LIMITED = 'LIMITED';
    public const PENDING_KYC = 'PENDING_KYC';
    public const PENDING_PROVIDER = 'PENDING_PROVIDER';
    public const DISABLED = 'DISABLED';

    public static function all(): array
    {
        return [
            self::AVAILABLE,
            self::UNAVAILABLE,
            self::LIMITED,
            self::PENDING_KYC,
            self::PENDING_PROVIDER,
            self::DISABLED,
        ];
    }
}
