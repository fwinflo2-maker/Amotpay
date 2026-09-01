<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Http\ApiException;

final class AdminService
{
    public function login(string $pin): array
    {
        $expected = Env::get('ADMIN_PIN', '') ?? '';
        if (strlen($expected) < 8) {
            throw new ApiException('Admin authentication is not configured', 503, 'ADMIN_NOT_CONFIGURED');
        }
        if (!hash_equals($expected, $pin)) {
            throw new ApiException('Invalid admin credentials', 401, 'INVALID_ADMIN_CREDENTIALS');
        }

        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 24 HOUR))'
        )->execute([$hash]);

        return ['token' => $token, 'expires_in_hours' => 24];
    }

    public function validateToken(?string $token): bool
    {
        if ($token === null || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return false;
        }
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT id FROM admin_sessions WHERE token_hash = ? AND expires_at > NOW()'
        );
        $stmt->execute([hash('sha256', $token)]);
        return (bool) $stmt->fetch();
    }

    public function logout(?string $token): void
    {
        if (!$token) {
            return;
        }
        $pdo = Database::connection();
        $pdo->prepare('DELETE FROM admin_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }

    public function listUsers(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
        }
        if (preg_match('/^[A-Z]{2}$/', (string) ($filters['country'] ?? ''))) {
            $where[] = 'country_code = ?';
            $params[] = $filters['country'];
        }
        if (($filters['q'] ?? '') !== '') {
            $where[] = '(phone LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            $term = '%' . substr((string) $filters['q'], 0, 100) . '%';
            array_push($params, $term, $term, $term, $term);
        }
        return $this->pagedQuery(
            'SELECT id, first_name, last_name, phone, email, country_code, currency, status, payout_enabled, created_at, updated_at
             FROM users WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC',
            $params,
            $filters
        );
    }

    public function updateUser(int $id, array $data): ?array
    {
        $fields = [];
        $params = [];
        if (array_key_exists('status', $data)) {
            if (!in_array($data['status'], ['active', 'suspended', 'pending'], true)) {
                throw new \InvalidArgumentException('Invalid user status');
            }
            $fields[] = 'status = ?';
            $params[] = $data['status'];
        }
        if (array_key_exists('payout_enabled', $data)) {
            if (!is_bool($data['payout_enabled']) && !in_array($data['payout_enabled'], [0, 1], true)) {
                throw new \InvalidArgumentException('payout_enabled must be boolean');
            }
            $fields[] = 'payout_enabled = ?';
            $params[] = (int) (bool) $data['payout_enabled'];
        }
        if ($fields === []) {
            throw new \InvalidArgumentException('No supported user field supplied');
        }
        $params[] = $id;
        Database::connection()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        $stmt = Database::connection()->prepare(
            'SELECT id, first_name, last_name, phone, email, country_code, currency, status, payout_enabled, created_at, updated_at
             FROM users WHERE id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function listTransfers(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        foreach (['status', 'destination_country', 'source_country'] as $field) {
            if (($filters[$field] ?? '') !== '') {
                $where[] = "{$field} = ?";
                $params[] = strtoupper((string) $filters[$field]);
            }
        }
        if (filter_var($filters['user_id'] ?? null, FILTER_VALIDATE_INT)) {
            $where[] = 'user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        if (($filters['from'] ?? '') !== '') {
            $where[] = 'created_at >= ?';
            $params[] = $filters['from'];
        }
        if (($filters['to'] ?? '') !== '') {
            $where[] = 'created_at <= ?';
            $params[] = $filters['to'];
        }
        return $this->pagedQuery(
            'SELECT id, user_id, reference, source_country, source_currency, destination_country, destination_currency,
             payment_method, source_amount, destination_amount, provider, provider_reference, status, created_at, updated_at, completed_at
             FROM transactions WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC',
            $params,
            $filters
        );
    }

    public function listWebhooks(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (($filters['provider'] ?? '') !== '') {
            $where[] = 'provider = ?';
            $params[] = strtoupper((string) $filters['provider']);
        }
        if (($filters['event'] ?? '') !== '') {
            $where[] = 'event_type = ?';
            $params[] = $filters['event'];
        }
        if (isset($filters['processed']) && in_array((string) $filters['processed'], ['0', '1'], true)) {
            $where[] = 'processed = ?';
            $params[] = (int) $filters['processed'];
        }
        return $this->pagedQuery(
            'SELECT id, provider, event_type, provider_reference, processed, last_error, created_at, processed_at
             FROM webhooks WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC',
            $params,
            $filters
        );
    }

    public function listAudits(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (($filters['action'] ?? '') !== '') {
            $where[] = 'action = ?';
            $params[] = $filters['action'];
        }
        if (filter_var($filters['user_id'] ?? null, FILTER_VALIDATE_INT)) {
            $where[] = 'user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        return $this->pagedQuery(
            'SELECT id, user_id, action, resource_type, resource_id, ip_address, metadata, created_at
             FROM audit_logs WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC',
            $params,
            $filters
        );
    }

    public function listErrors(array $filters): array
    {
        return $this->pagedQuery(
            'SELECT id, incident_id, error_class, safe_message, request_path, created_at FROM system_errors ORDER BY id DESC',
            [],
            $filters
        );
    }

    public function listKyc(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'u.kyc_status = ?';
            $params[] = strtoupper((string) $filters['status']);
        }
        if (preg_match('/^[A-Z]{2}$/', (string) ($filters['country'] ?? ''))) {
            $where[] = 'u.country_code = ?';
            $params[] = $filters['country'];
        }
        return $this->pagedQuery(
            'SELECT u.id, u.first_name, u.last_name, u.phone, u.email, u.country_code,
                    u.kyc_status, u.sumsub_applicant_id, u.kyc_verified_at,
                    kp.level_name, kp.review_result, kp.updated_at AS kyc_updated_at
             FROM users u
             LEFT JOIN kyc_profiles kp ON kp.user_id = u.id
             WHERE ' . implode(' AND ', $where) . ' ORDER BY u.id DESC',
            $params,
            $filters
        );
    }

    public function listV2Transfers(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
        }
        if (filter_var($filters['user_id'] ?? null, FILTER_VALIDATE_INT)) {
            $where[] = 'user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        return $this->pagedQuery(
            'SELECT id, user_id, reference, source_country, source_currency, source_amount,
                    destination_country, destination_currency, destination_amount, payout_method,
                    provider, provider_reference, status, created_at, updated_at, completed_at
             FROM transfer_orders WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC',
            $params,
            $filters
        );
    }

    public function listLedger(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (filter_var($filters['user_id'] ?? null, FILTER_VALIDATE_INT)) {
            $where[] = 'lt.user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        return $this->pagedQuery(
            'SELECT lt.reference, lt.user_id, lt.operation_type, lt.status, lt.description,
                    lt.created_at, lt.completed_at,
                    le.account_type, le.account_id, le.currency, le.entry_type, le.amount, le.balance_type
             FROM ledger_transactions lt
             JOIN ledger_entries le ON le.ledger_transaction_id = lt.id
             WHERE ' . implode(' AND ', $where) . ' ORDER BY lt.id DESC',
            $params,
            $filters
        );
    }

    private function pagedQuery(string $sql, array $params, array $filters): array
    {
        $limit = max(1, min((int) ($filters['limit'] ?? 50), 100));
        $offset = max(0, (int) ($filters['offset'] ?? 0));
        $stmt = Database::connection()->prepare($sql . ' LIMIT ? OFFSET ?');
        $position = 1;
        foreach ($params as $value) {
            $stmt->bindValue($position++, $value);
        }
        $stmt->bindValue($position++, $limit, \PDO::PARAM_INT);
        $stmt->bindValue($position, $offset, \PDO::PARAM_INT);
        $stmt->execute();
        return ['items' => $stmt->fetchAll(), 'limit' => $limit, 'offset' => $offset];
    }
}
