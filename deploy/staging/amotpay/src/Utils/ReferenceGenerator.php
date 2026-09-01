<?php

declare(strict_types=1);

namespace AmotPay\Utils;

final class ReferenceGenerator
{
    public static function fiat(): string
    {
        return 'AMOTPAY-FIAT-' . strtoupper(bin2hex(random_bytes(4)));
    }

    public static function crypto(): string
    {
        return 'AMOTPAY-CRYPTO-' . strtoupper(bin2hex(random_bytes(4)));
    }

    public static function wallet(): string
    {
        return 'AMOTPAY-WTX-' . strtoupper(bin2hex(random_bytes(4)));
    }
}
