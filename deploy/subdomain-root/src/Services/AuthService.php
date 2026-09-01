<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;
use AmotPay\Database\Database;
use AmotPay\Financial\Cashramp\CashrampCustomerService;
use AmotPay\Http\ApiException;

final class AuthService
{
    public function register(array $data): array
    {
        $pdo = Database::connection();

        $country = strtoupper(trim((string) ($data['country_code'] ?? '')));
        $stmt = $pdo->prepare('SELECT code, currency FROM countries WHERE code = ? AND active = 1');
        $stmt->execute([$country]);
        $countryRow = $stmt->fetch();
        if (!$countryRow) {
            throw new \InvalidArgumentException('Invalid country');
        }

        $phone = preg_replace('/[\s()-]+/', '', (string) ($data['phone'] ?? ''));
        if (!preg_match('/^\+[1-9]\d{7,14}$/', $phone)) {
            throw new \InvalidArgumentException('Phone must use E.164 format');
        }

        $firstName = $this->validName($data['first_name'] ?? '', 'first_name');
        $lastName = $this->validName($data['last_name'] ?? '', 'last_name');
        $email = trim((string) ($data['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email');
        }
        $password = (string) ($data['password'] ?? '');
        if (strlen($password) < 12 || strlen($password) > 200) {
            throw new \InvalidArgumentException('Password must contain between 12 and 200 characters');
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE phone = ?');
        $check->execute([$phone]);
        if ($check->fetch()) {
            throw new \InvalidArgumentException('Phone already registered');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Password hash failed');
        }

        $insert = $pdo->prepare(
            'INSERT INTO users (first_name, last_name, phone, email, password_hash, country_code, currency)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $firstName,
            $lastName,
            $phone,
            $email === '' ? null : $email,
            $hash,
            $countryRow['code'],
            $countryRow['currency'],
        ]);

        $userId = (int) $pdo->lastInsertId();

        try {
            $pdo->prepare(
                'INSERT INTO kyc_profiles (user_id, status, country_code) VALUES (?, ?, ?)'
            )->execute([$userId, 'NOT_STARTED', $countryRow['code']]);
        } catch (\PDOException) {
        }

        try {
            (new CashrampCustomerService())->ensureCustomer($userId);
        } catch (\Throwable) {
            // Customer can be provisioned later via POST /api/onboarding/cashramp
        }

        return $this->issueToken($userId);
    }

    public function login(string $phone, string $password): array
    {
        $pdo = Database::connection();
        $phone = preg_replace('/[\s()-]+/', '', $phone);

        $stmt = $pdo->prepare('SELECT id, password_hash, status FROM users WHERE phone = ?');
        $stmt->execute([$phone]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new ApiException('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
        if ($user['status'] !== 'active') {
            throw new ApiException('Account unavailable', 403, 'ACCOUNT_UNAVAILABLE');
        }

        return $this->issueToken((int) $user['id']);
    }

    public function logout(string $token): void
    {
        $pdo = Database::connection();
        $hash = hash('sha256', $token);
        $pdo->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([$hash]);
    }

    public function userFromToken(?string $token): ?array
    {
        if ($token === null || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }

        $pdo = Database::connection();
        $hash = hash('sha256', $token);
        $stmt = $pdo->prepare(
            'SELECT u.* FROM users u
             JOIN user_sessions s ON s.user_id = u.id
             WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = "active"'
        );
        $stmt->execute([$hash]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    private function issueToken(int $userId): array
    {
        $pdo = Database::connection();
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $hours = max(1, min((int) (Env::get('JWT_EXPIRY_HOURS', '168') ?? '168'), 720));

        $pdo->prepare(
            'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))'
        )->execute([$userId, $hash, $hours]);

        $stmt = $pdo->prepare(
            'SELECT id, first_name, last_name, phone, email, country_code, currency, kyc_status, kyc_verified_at, cashramp_customer_id
             FROM users WHERE id = ?'
        );
        $stmt->execute([$userId]);

        return [
            'token' => $token,
            'expires_in_hours' => $hours,
            'user' => $stmt->fetch(),
        ];
    }

    private function validName(mixed $value, string $field): string
    {
        $name = trim((string) $value);
        if (strlen($name) < 2 || strlen($name) > 100 || preg_match('/[\x00-\x1F\x7F]/', $name)) {
            throw new \InvalidArgumentException("Invalid {$field}");
        }
        return $name;
    }
}
