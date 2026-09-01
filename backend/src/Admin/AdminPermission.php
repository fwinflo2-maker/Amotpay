<?php

declare(strict_types=1);

namespace AmotPay\Admin;

final class AdminPermission
{
    public const PROVIDER_CREDENTIALS_VIEW = 'PROVIDER_CREDENTIALS_VIEW';
    public const PROVIDER_CREDENTIALS_WRITE = 'PROVIDER_CREDENTIALS_WRITE';
    public const PROVIDER_CREDENTIALS_ROTATE = 'PROVIDER_CREDENTIALS_ROTATE';
    public const KYC_VIEW = 'KYC_VIEW';
    public const KYC_REVIEW = 'KYC_REVIEW';
    public const TRANSFER_VIEW = 'TRANSFER_VIEW';
    public const LEDGER_VIEW = 'LEDGER_VIEW';
    public const RECONCILIATION_VIEW = 'RECONCILIATION_VIEW';
    public const CONFIG_WRITE = 'CONFIG_WRITE';
    public const AUDIT_VIEW = 'AUDIT_VIEW';

    /** @return list<string> */
    public static function superAdmin(): array
    {
        return ['*'];
    }

    public static function hasPermission(array $permissions, string $required): bool
    {
        if (in_array('*', $permissions, true)) {
            return true;
        }

        return in_array($required, $permissions, true);
    }
}
