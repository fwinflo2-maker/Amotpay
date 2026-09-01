<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Config\Env;
use AmotPay\Database\Database;

$root = dirname(__DIR__);
Env::load($root . '/amotpay.env');
$localBootstrap = $root . '/bootstrap.local.cfg';
if (is_file($localBootstrap)) {
    Env::load($localBootstrap);
}

$username = trim((string) (Env::get('BOOTSTRAP_ADMIN_USERNAME', '') ?? ''));
if ($username === '') {
    $username = 'admin';
}
$password = (string) (Env::get('BOOTSTRAP_ADMIN_PASSWORD', '') ?? '');
if ($password === '' || strlen($password) < 8) {
    fwrite(STDERR, "Set BOOTSTRAP_ADMIN_PASSWORD (min 8 chars) in bootstrap.local.cfg or amotpay.env.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo = Database::connection();
$pdo->prepare(
    'INSERT INTO admin_credentials
        (id, username, password_hash, status, failed_login_attempts, locked_until, totp_secret, totp_enabled)
     VALUES (1, ?, ?, ?, 0, NULL, NULL, 0)
     ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        password_hash = VALUES(password_hash),
        status = VALUES(status),
        failed_login_attempts = 0,
        locked_until = NULL,
        totp_secret = NULL,
        totp_enabled = 0,
        updated_at = NOW()'
)->execute([$username, $hash, 'PASSWORD_CHANGE_REQUIRED']);

echo "Admin reset OK\n";
echo "Username: {$username}\n";
echo "Status: PASSWORD_CHANGE_REQUIRED\n";
exit(0);
