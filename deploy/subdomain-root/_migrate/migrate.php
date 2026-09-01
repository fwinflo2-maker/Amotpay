<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Config\Env;
use AmotPay\Database\Database;

Env::load(__DIR__ . '/../amotpay.env');
$pdo = Database::connection();
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        migration VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

$applied = array_fill_keys($pdo->query('SELECT migration FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN), true);
$files = glob(__DIR__ . '/migrations/*.sql') ?: [];
sort($files, SORT_STRING);

foreach ($files as $file) {
    $name = basename($file);
    if (isset($applied[$name])) {
        echo "SKIP {$name}\n";
        continue;
    }

    $sql = file_get_contents($file);
    if ($sql === false) {
        throw new RuntimeException("Cannot read migration {$name}");
    }
    $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
    $statements = array_filter(array_map('trim', preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: []));

    echo "RUN  {$name}\n";
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    $pdo->prepare('INSERT INTO schema_migrations (migration) VALUES (?)')->execute([$name]);
    echo "OK   {$name}\n";
}
