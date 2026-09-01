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

$envFile = getenv('AMOTPAY_ENV_FILE') ?: (__DIR__ . '/../amotpay.env');
Env::load($envFile);
$localBootstrap = dirname(__DIR__) . '/bootstrap.local.cfg';
if (is_file($localBootstrap)) {
    Env::load($localBootstrap);
}

$runner = new MigrationRunnerService();
$ran = $runner->applyPending();
$runner->afterMigrations($ran);

$bootstrap = new AdminBootstrapService();
$created = $bootstrap->bootstrapIfNeeded();

if ($ran !== []) {
    echo 'Applied migrations: ' . implode(', ', $ran) . PHP_EOL;
} else {
    echo "No pending migrations.\n";
}

if ($created) {
    $username = trim((string) (Env::get('BOOTSTRAP_ADMIN_USERNAME', '') ?? ''));
    if ($username === '') {
        $username = 'admin';
    }
    echo "Admin created in database.\n";
    echo "Username: {$username}\n";
    echo "Password: value of BOOTSTRAP_ADMIN_PASSWORD (Hostinger env only — not stored in Git).\n";
    echo "Status: PASSWORD_CHANGE_REQUIRED — change it in Admin → Settings after first login.\n";
    exit(0);
}

if ($bootstrap->hasAdmin()) {
    echo "Admin account already exists in database (admin_credentials).\n";
    exit(0);
}

fwrite(STDERR, "No admin in database. Set BOOTSTRAP_ADMIN_PASSWORD in Hostinger amotpay.env (min 8 chars) and re-run.\n");
exit(1);
