<?php

declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';

use AmotPay\Config\Env;
use AmotPay\Database\Database;

$adminKey = Env::get('APP_SECRET', '');
$provided = $_GET['key'] ?? '';

if ($adminKey === '' || !hash_equals($adminKey, $provided)) {
    http_response_code(401);
    exit('Unauthorized');
}

$pdo = Database::connection();

$stats = [
    'users' => $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
    'fiat_tx' => $pdo->query('SELECT COUNT(*) FROM transactions')->fetchColumn(),
    'crypto_tx' => $pdo->query('SELECT COUNT(*) FROM crypto_transactions')->fetchColumn(),
    'wallets' => $pdo->query('SELECT COUNT(*) FROM wallets')->fetchColumn(),
    'quotes' => $pdo->query('SELECT COUNT(*) FROM crypto_quotes')->fetchColumn(),
    'webhooks' => $pdo->query('SELECT COUNT(*) FROM webhooks')->fetchColumn(),
];

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>AmotPay Admin</title>
  <style>
    body { font-family: system-ui; background: #1B4332; color: #F8F5F0; padding: 2rem; }
    h1 { color: #C9A227; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .card { background: #2D3436; padding: 1.5rem; border-radius: 12px; }
    .card h3 { margin: 0 0 0.5rem; color: #D4A574; font-size: 0.85rem; text-transform: uppercase; }
    .card p { margin: 0; font-size: 2rem; font-weight: 700; }
    a { color: #C9A227; }
  </style>
</head>
<body>
  <h1>AmotPay Administration</h1>
  <div class="grid">
    <?php foreach ($stats as $label => $count): ?>
    <div class="card">
      <h3><?= htmlspecialchars(str_replace('_', ' ', $label)) ?></h3>
      <p><?= (int) $count ?></p>
    </div>
    <?php endforeach; ?>
  </div>
  <p>Providers: <strong>MAGMA</strong> (fiat) | <strong>CASHRAMP</strong> (crypto)</p>
  <p><a href="?key=<?= urlencode($provided) ?>&view=webhooks">Webhooks récents</a></p>
  <?php if (($_GET['view'] ?? '') === 'webhooks'): ?>
  <table style="width:100%;margin-top:1rem;border-collapse:collapse;">
    <tr style="background:#2D3436"><th>Provider</th><th>Event</th><th>Ref</th><th>Processed</th><th>Date</th></tr>
    <?php foreach ($pdo->query('SELECT * FROM webhooks ORDER BY created_at DESC LIMIT 50') as $wh): ?>
    <tr style="border-bottom:1px solid #444">
      <td><?= htmlspecialchars($wh['provider']) ?></td>
      <td><?= htmlspecialchars($wh['event_type']) ?></td>
      <td><?= htmlspecialchars($wh['provider_reference'] ?? '') ?></td>
      <td><?= $wh['processed'] ? '✓' : '—' ?></td>
      <td><?= htmlspecialchars($wh['created_at']) ?></td>
    </tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>
</body>
</html>
