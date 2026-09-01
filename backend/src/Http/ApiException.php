<?php

declare(strict_types=1);

namespace AmotPay\Http;

final class ApiException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status,
        public readonly string $errorCode,
    ) {
        parent::__construct($message);
    }
}
