<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Database\Database;
use AmotPay\Http\ApiException;
use AmotPay\Admin\AdminAccountService;
use PDO;

final class AdminService
{
    public function __construct(private AdminAccountService $accounts = new AdminAccountService()) {}

    public function login(string $username, string $password, ?string $totpCode, ?string $ip, ?string $userAgent): array
    {
        if (!$this->accounts->isConfigured()) {
            throw new ApiException('Admin authentication is not configured', 503, 'ADMIN_NOT_CONFIGURED');
        }

        $this->accounts->assertCanAuthenticate($username);
        if (!$this->accounts->verify($username, $password, $totpCode)) {
            if ($this->accounts->requiresTotp() && ($totpCode === null || $totpCode === '')) {
                throw new ApiException('2FA code required', 401, 'TOTP_REQUIRED');
            }
            throw new ApiException('Invalid admin credentials', 401, 'INVALID_ADMIN_CREDENTIALS');
        }

        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $pdo = Database::connection();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO admin_sessions (token_hash, ip_address, user_agent, last_seen_at, expires_at)
                 VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))'
            );
            $stmt->execute([
                $hash,
                $this->truncate($ip, 45),
                $this->truncate($userAgent, 255),
            ]);
        } catch (\PDOException) {
            $pdo->prepare(
                'INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 24 HOUR))'
            )->execute([$hash]);
        }
        $sessionId = (int) $pdo->lastInsertId();

        $info = $this->accounts->getAccountInfo();

        return [
            'token' => $token,
            'session_id' => $sessionId,
            'expires_in_hours' => 24,
            'username' => $info['username'],
            'account_status' => $info['status'],
            'password_change_required' => $info['password_change_required'],
            'totp_enabled' => $info['totp_enabled'],
        ];
    }

    public function getAccountInfo(): array
    {
        return $this->accounts->getAccountInfo();
    }

    public function changeUsername(string $currentPassword, string $newUsername, ?string $ip): array
    {
        return $this->accounts->changeUsername($currentPassword, $newUsername, $ip);
    }

    public function changePassword(
        string $currentPassword,
        string $newPassword,
        ?string $confirmPassword,
        ?string $ip,
        bool $revokeOtherSessions,
        ?string $currentToken
    ): array {
        $result = $this->accounts->changePassword($currentPassword, $newPassword, $confirmPassword, $ip, $revokeOtherSessions);
        if ($revokeOtherSessions) {
            $this->revokeOtherSessions($currentToken);
        }

        return $result;
    }

    public function updateCredentials(string $currentPassword, string $newUsername, string $newPassword, ?string $ip): array
    {
        return $this->accounts->updateCredentials($currentPassword, $newUsername, $newPassword, $ip);
    }

    public function setupTwoFactor(string $currentPassword): array
    {
        return $this->accounts->setupTwoFactor($currentPassword);
    }

    public function enableTwoFactor(string $currentPassword, string $code, ?string $ip): array
    {
        return $this->accounts->enableTwoFactor($currentPassword, $code, $ip);
    }

    public function disableTwoFactor(string $currentPassword, string $code, ?string $ip): array
    {
        return $this->accounts->disableTwoFactor($currentPassword, $code, $ip);
    }

    public function verifyPassword(string $password): bool
    {
        $info = $this->accounts->getAccountInfo();

        return $this->accounts->verify($info['username'], $password);
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
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return false;
        }
        try {
            $pdo->prepare('UPDATE admin_sessions SET last_seen_at = NOW() WHERE id = ?')->execute([(int) $row['id']]);
        } catch (\PDOException) {
            // Migration 009 not applied yet.
        }

        return true;
    }

    public function sessionIdFromToken(?string $token): ?int
    {
        if ($token === null || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT id FROM admin_sessions WHERE token_hash = ? AND expires_at > NOW()');
        $stmt->execute([hash('sha256', $token)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? (int) $row['id'] : null;
    }

    /** @return array{items: list<array<string, mixed>>} */
    public function listSessions(?string $currentToken): array
    {
        $currentId = $this->sessionIdFromToken($currentToken);
        $pdo = Database::connection();
        try {
            $rows = $pdo->query(
                'SELECT id, ip_address, user_agent, created_at, last_seen_at, expires_at
                 FROM admin_sessions
                 WHERE expires_at > NOW()
                 ORDER BY id DESC'
            )->fetchAll(PDO::FETCH_ASSOC);
        } catch (\PDOException) {
            $rows = $pdo->query(
                'SELECT id, created_at, expires_at
                 FROM admin_sessions
                 WHERE expires_at > NOW()
                 ORDER BY id DESC'
            )->fetchAll(PDO::FETCH_ASSOC);
        }

        $items = array_map(function (array $row) use ($currentId): array {
            return [
                'id' => (int) $row['id'],
                'ip_address' => $row['ip_address'] ?? null,
                'user_agent' => $row['user_agent'] ?? null,
                'created_at' => $row['created_at'],
                'last_seen_at' => $row['last_seen_at'] ?? null,
                'expires_at' => $row['expires_at'],
                'current' => $currentId !== null && (int) $row['id'] === $currentId,
            ];
        }, $rows);

        return ['items' => $items];
    }

    public function revokeSession(int $sessionId, ?string $currentToken): void
    {
        $currentId = $this->sessionIdFromToken($currentToken);
        if ($currentId === $sessionId) {
            throw new ApiException('Cannot revoke current session from this endpoint', 422, 'CURRENT_SESSION');
        }
        $pdo = Database::connection();
        $pdo->prepare('DELETE FROM admin_sessions WHERE id = ?')->execute([$sessionId]);
        AuditService::log('admin.session.revoked', null, 'admin_session', (string) $sessionId, null);
    }

    public function revokeOtherSessions(?string $currentToken): int
    {
        $currentId = $this->sessionIdFromToken($currentToken);
        if ($currentId === null) {
            return 0;
        }
        $pdo = Database::connection();
        $stmt = $pdo->prepare('DELETE FROM admin_sessions WHERE id <> ?');
        $stmt->execute([$currentId]);
        $count = $stmt->rowCount();
        AuditService::log('admin.sessions.revoked_others', null, 'admin_session', (string) $currentId, null, [
            'revoked_count' => $count,
        ]);

        return $count;
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

    private function truncate(?string $value, int $max): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return substr($value, 0, $max);
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
        $stmt->bindValue($position++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($position, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return ['items' => $stmt->fetchAll(), 'limit' => $limit, 'offset' => $offset];
    }
}
