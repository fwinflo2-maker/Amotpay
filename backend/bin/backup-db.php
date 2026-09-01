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

$backupDir = dirname(__DIR__, 2) . '/private/backups';
if (!is_dir($backupDir) && !mkdir($backupDir, 0700, true) && !is_dir($backupDir)) {
    throw new RuntimeException('Cannot create backup directory');
}

$file = $backupDir . '/amotpay_' . gmdate('Ymd_His') . '.sql';
$pdo = Database::connection();
$handle = fopen($file, 'wb');
if ($handle === false) {
    throw new RuntimeException('Cannot open backup file');
}

fwrite($handle, "-- AMOTPay PDO backup " . gmdate('c') . PHP_EOL);
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    $create = $pdo->query('SHOW CREATE TABLE `' . str_replace('`', '``', $table) . '`')->fetch(PDO::FETCH_ASSOC);
    fwrite($handle, PHP_EOL . 'DROP TABLE IF EXISTS `' . $table . '`;' . PHP_EOL);
    fwrite($handle, $create['Create Table'] . ';' . PHP_EOL);
    $rows = $pdo->query('SELECT * FROM `' . str_replace('`', '``', $table) . '`');
    while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
        $columns = array_map(static fn ($c) => '`' . str_replace('`', '``', $c) . '`', array_keys($row));
        $values = array_map(static function ($value) use ($pdo) {
            if ($value === null) {
                return 'NULL';
            }
            return $pdo->quote((string) $value);
        }, array_values($row));
        fwrite($handle, 'INSERT INTO `' . $table . '` (' . implode(',', $columns) . ') VALUES (' . implode(',', $values) . ');' . PHP_EOL);
    }
}
fclose($handle);

echo 'BACKUP_OK ' . $file . PHP_EOL;
