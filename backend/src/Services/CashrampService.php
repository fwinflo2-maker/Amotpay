<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Config\Env;

/**
 * Cashramp GraphQL API client — crypto / on-ramp only.
 * Docs: https://docs.cashramp.co/cashramp
 */
final class CashrampService
{
    private string $apiUrl;
    private string $secretKey;

    public function __construct(?SettingsService $settings = null)
    {
        $settings ??= new SettingsService();
        $this->apiUrl = $settings->get(
            'CASHRAMP_API_URL',
            'https://api.useaccrue.com/cashramp/api/graphql'
        ) ?? 'https://api.useaccrue.com/cashramp/api/graphql';
        $this->secretKey = $settings->get('CASHRAMP_SECRET_KEY') ?? '';
    }

    public function isConfigured(): bool
    {
        return $this->secretKey !== '';
    }

    public function query(string $graphql, array $variables = []): array
    {
        return $this->graphql($graphql, $variables);
    }

    public function mutation(string $graphql, array $variables = []): array
    {
        return $this->graphql($graphql, $variables);
    }

    public function getRampableAssets(): array
    {
        $result = $this->query('{
            rampableAssets {
                name
                symbol
                networks
                contractAddress
            }
        }');

        return $result['data']['rampableAssets'] ?? [];
    }

    public function getAvailableCountries(): array
    {
        $result = $this->query('{
            availableCountries {
                id
                name
                code
            }
        }');

        return $result['data']['availableCountries'] ?? [];
    }

    public function getRampQuote(
        string $customerId,
        float $amount,
        string $currency,
        string $paymentMethodType,
        string $paymentType = 'deposit',
        ?string $country = null
    ): array {
        $countryArg = $country ? ', country: "' . $country . '"' : '';
        $query = "query {
            rampQuote(
                customer: \"{$customerId}\"
                amount: {$amount}
                currency: {$currency}
                paymentType: {$paymentType}
                paymentMethodType: \"{$paymentMethodType}\"
                {$countryArg}
            ) {
                id
                exchangeRate
                paymentType
            }
        }";

        return $this->query($query);
    }

    public function createCustomer(string $email, string $firstName, string $lastName, string $countryId): array
    {
        $query = 'mutation {
            createCustomer(
                email: "' . addslashes($email) . '"
                firstName: "' . addslashes($firstName) . '"
                lastName: "' . addslashes($lastName) . '"
                country: "' . $countryId . '"
            ) {
                id
                email
                firstName
                lastName
            }
        }';

        return $this->mutation($query);
    }

    public function initiateRampQuoteDeposit(
        string $quoteId,
        string $reference,
        ?string $phoneNumber = null,
        ?array $onchainTransferInfo = null
    ): array {
        $phone = $phoneNumber ? ', phoneNumber: "' . addslashes($phoneNumber) . '"' : '';
        $onchain = '';

        if ($onchainTransferInfo) {
            $addr = addslashes($onchainTransferInfo['address']);
            $crypto = addslashes($onchainTransferInfo['cryptocurrency']);
            $network = addslashes($onchainTransferInfo['network']);
            $onchain = ", onchainTransferInfo: { address: \"{$addr}\", cryptocurrency: \"{$crypto}\", network: \"{$network}\" }";
        }

        $query = "mutation {
            initiateRampQuoteDeposit(
                rampQuote: \"{$quoteId}\"
                reference: \"{$reference}\"
                {$phone}
                {$onchain}
            ) {
                id
                status
                agent
                paymentDetails
                exchangeRate
                amountLocal
                amountUsd
                expiresAt
            }
        }";

        return $this->mutation($query);
    }

    public function markDepositAsPaid(string $paymentRequestId, ?string $receipt = null): array
    {
        $receiptArg = $receipt ? ', receipt: "' . addslashes($receipt) . '"' : '';
        $query = "mutation {
            markDepositAsPaid(paymentRequest: \"{$paymentRequestId}\"{$receiptArg})
        }";

        return $this->mutation($query);
    }

    public function getPaymentRequestByReference(string $reference): array
    {
        $query = 'query {
            merchantPaymentRequest(reference: "' . addslashes($reference) . '") {
                id
                paymentType
                amount
                currency
                reference
                status
            }
        }';

        return $this->query($query);
    }

    public function healthCheck(): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 'not_configured', 'message' => 'Cashramp credentials missing'];
        }

        try {
            $result = $this->query('{ account { id accountBalance } }');
            if (isset($result['data']['account'])) {
                return ['status' => 'ok', 'account' => $result['data']['account']];
            }
            return ['status' => 'error', 'errors' => $result['errors'] ?? $result];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public static function mapPaymentStatus(string $status): string
    {
        return match (strtolower($status)) {
            'completed' => 'SUCCESS',
            'picked_up', 'paid', 'pending' => 'PROCESSING',
            'canceled', 'cancelled' => 'CANCELLED',
            'created' => 'CREATED',
            default => 'PROCESSING',
        };
    }

    public static function symbolToCashrampCrypto(string $symbol): string
    {
        return match (strtoupper($symbol)) {
            'USDT' => 'usd_tether',
            'USDC' => 'usd_coin',
            default => strtolower($symbol),
        };
    }

    private function graphql(string $query, array $variables = []): array
    {
        $payload = ['query' => $query];
        if ($variables !== []) {
            $payload['variables'] = $variables;
        }

        $ch = curl_init($this->apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException('Cashramp request failed: ' . $error);
        }

        $decoded = json_decode($response, true) ?? [];

        if ($httpCode >= 400 || isset($decoded['errors'])) {
            $msg = $decoded['errors'][0]['message'] ?? $response;
            throw new \RuntimeException('Cashramp API error: ' . $msg);
        }

        return $decoded;
    }
}
