<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Config\Env;
use AmotPay\Services\MigrationStatusService;

Env::load(__DIR__ . '/../.env');

$status = (new MigrationStatusService())->status();

echo "AMOTPay Migration Status\n";
echo "========================\n\n";

foreach ($status['migrations'] as $name => $info) {
    echo "{$name}\n";
    echo "  Status: {$info['status']}\n";
    if ($info['applied_at']) {
        echo "  Applied: {$info['applied_at']}\n";
    }
    echo "\n";
}

echo "Tables present: " . count($status['tables']['present']) . "\n";
if ($status['tables']['missing'] !== []) {
    echo "Tables missing: " . implode(', ', $status['tables']['missing']) . "\n";
}

echo "\nPlatform ready: " . ($status['ready'] ? 'YES' : 'NO') . "\n";

exit($status['ready'] ? 0 : 1);
