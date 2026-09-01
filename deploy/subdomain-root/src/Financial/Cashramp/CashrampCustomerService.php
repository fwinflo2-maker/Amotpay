<?php

declare(strict_types=1);

namespace AmotPay\Financial\Cashramp;

use AmotPay\Database\Database;
use AmotPay\Financial\Providers\Cashramp\CashrampAdapter;
use AmotPay\Http\ApiException;
use AmotPay\Services\AuditService;
use PDO;

/**
 * Idempotent Cashramp customer provisioning per AMOTPay user.
 */
final class CashrampCustomerService
{
    public function __construct(private CashrampAdapter $cashramp = new CashrampAdapter()) {}

    /** Ensure user has a Cashramp customer ID. Safe to call multiple times. */
    public function ensureCustomer(int $userId, ?string $ip = null): string
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare(
                'SELECT id, first_name, last_name, phone, email, country_code, cashramp_customer_id
                 FROM users WHERE id = ? FOR UPDATE'
            );
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if (!$user) {
                throw new ApiException('User not found', 404, 'NOT_FOUND');
            }

            $existing = trim((string) ($user['cashramp_customer_id'] ?? ''));
            if ($existing !== '') {
                $pdo->commit();

                return $existing;
            }

            if (!$this->cashramp->isConfigured()) {
                throw new ApiException('Cashramp is not configured', 503, 'PROVIDER_NOT_CONFIGURED');
            }

            $countryId = $this->resolveCashrampCountryId((string) $user['country_code']);
            $email = (string) ($user['email'] ?? '');
            if ($email === '') {
                $email = $this->syntheticEmail($userId, (string) $user['phone']);
            }

            $result = $this->cashramp->createCustomer(
                $email,
                (string) $user['first_name'],
                (string) $user['last_name'],
                $countryId
            );

            $customerId = (string) ($result['data']['createCustomer']['id'] ?? $result['id'] ?? '');
            if ($customerId === '') {
                throw new ApiException('Cashramp customer creation failed', 502, 'CUSTOMER_CREATE_FAILED');
            }

            $pdo->prepare('UPDATE users SET cashramp_customer_id = ? WHERE id = ?')
                ->execute([$customerId, $userId]);

            $pdo->commit();

            AuditService::log('cashramp.customer.created', $userId, 'user', (string) $userId, $ip, [
                'reused' => false,
            ]);

            return $customerId;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public function getCustomerId(int $userId): ?string
    {
        $stmt = Database::connection()->prepare('SELECT cashramp_customer_id FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $id = $stmt->fetchColumn();

        return is_string($id) && $id !== '' ? $id : null;
    }

    private function resolveCashrampCountryId(string $countryCode): string
    {
        $countries = $this->cashramp->getAvailableCountries();
        foreach ($countries as $country) {
            if (strtoupper((string) ($country['code'] ?? '')) === strtoupper($countryCode)) {
                return (string) ($country['id'] ?? '');
            }
        }

        throw new ApiException(
            'Country not supported by Cashramp: ' . $countryCode,
            422,
            'COUNTRY_NOT_SUPPORTED'
        );
    }

    private function syntheticEmail(int $userId, string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: (string) $userId;

        return 'user' . $userId . '.' . $digits . '@customers.amotpay.internal';
    }
}
