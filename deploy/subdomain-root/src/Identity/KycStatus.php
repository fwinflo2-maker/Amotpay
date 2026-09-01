<?php

declare(strict_types=1);

namespace AmotPay\Identity;

final class KycStatus
{
    public const NOT_STARTED = 'NOT_STARTED';
    public const PENDING = 'PENDING';
    public const IN_REVIEW = 'IN_REVIEW';
    public const VERIFIED = 'VERIFIED';
    public const REJECTED = 'REJECTED';
    public const RETRY_REQUIRED = 'RETRY_REQUIRED';
    public const EXPIRED = 'EXPIRED';
    public const SUSPENDED = 'SUSPENDED';

    public static function isVerified(string $status): bool
    {
        return $status === self::VERIFIED;
    }

    public static function allowsFinancialAccess(string $status): bool
    {
        return $status === self::VERIFIED;
    }

    public static function mapFromSumsub(string $reviewStatus, ?string $reviewAnswer = null): string
    {
        $status = strtolower($reviewStatus);
        $answer = strtolower((string) $reviewAnswer);

        return match (true) {
            $status === 'init' => self::NOT_STARTED,
            $status === 'pending' => self::PENDING,
            $status === 'queued', $status === 'onhold' => self::IN_REVIEW,
            $status === 'completed' && $answer === 'green' => self::VERIFIED,
            $status === 'completed' && $answer === 'red' => self::REJECTED,
            $status === 'completed' && $answer === 'retry' => self::RETRY_REQUIRED,
            default => self::PENDING,
        };
    }
}
