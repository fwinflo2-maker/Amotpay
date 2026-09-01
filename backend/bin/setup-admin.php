<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Admin\AdminBootstrapService;
use AmotPay\Config\Env;
use AmotPay\Services\MigrationRunnerService;

$root = dirname(__DIR__);
Env::load($root . '/amotpay.env');
$localBootstrap = $root . '/bootstrap.local.cfg';
if (is_file($localBootstrap)) {
    Env::load($localBootstrap);
}

$runner = new MigrationRunnerService();
$ran = $runner->applyPending();
$runner->afterMigrations($ran);

$bootstrap = new AdminBootstrapService();
$created = $bootstrap->bootstrapIfNeeded();

$log = [];
if ($ran !== []) {
    $log[] = 'migrations=' . implode(',', $ran);
}
$log[] = $created ? 'admin_created=1' : ($bootstrap->hasAdmin() ? 'admin_exists=1' : 'admin_missing=1');

file_put_contents($root . '/bootstrap-run.log', date('c') . ' ' . implode(' ', $log) . PHP_EOL, FILE_APPEND);

echo implode(PHP_EOL, $log) . PHP_EOL;
exit($bootstrap->hasAdmin() ? 0 : 1);
