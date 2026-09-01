<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Config\Env;
use AmotPay\Services\MigrationRunnerService;

$envFile = getenv('AMOTPAY_ENV_FILE') ?: (__DIR__ . '/../.env');
Env::load($envFile);

$runner = new MigrationRunnerService();
$ran = $runner->applyPending();
$runner->afterMigrations($ran);

foreach ($ran as $name) {
    echo "OK   {$name}\n";
}

if ($ran === []) {
    echo "No pending migrations.\n";
}
