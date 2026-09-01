<?php

declare(strict_types=1);

namespace AmotPay\Services;

use AmotPay\Database\Database;
use AmotPay\Utils\ReferenceGenerator;

/**
 * Custodial ledger wallet.
 *
 * Settlement model:
 * - Cashramp Direct Ramp deposits settle to merchant account OR onchain to user address.
 * - AmotPay credits internal ledger only after webhook confirms completed status.
 * - Private keys are never stored in plain text; receive addresses are placeholders
 *   until a secure key management service is integrated.
 */
final class WalletService
{
    public function getUserWallets(int $userId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT asset, network, address, balance, available_balance, pending_balance, status
             FROM wallets WHERE user_id = ? ORDER BY asset, network'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function getWallet(int $userId, string $asset, ?string $network = null): ?array
    {
        $pdo = Database::connection();
        if ($network) {
            $stmt = $pdo->prepare('SELECT * FROM wallets WHERE user_id = ? AND asset = ? AND network = ?');
            $stmt->execute([$userId, strtoupper($asset), strtoupper($network)]);
        } else {
            $stmt = $pdo->prepare(
                'SELECT * FROM wallets WHERE user_id = ? AND asset = ? ORDER BY available_balance DESC LIMIT 1'
            );
            $stmt->execute([$userId, strtoupper($asset)]);
        }
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getOrCreateWallet(int $userId, string $asset, string $network): array
    {
        $wallet = $this->getWallet($userId, $asset, $network);
        if ($wallet) {
            return $wallet;
        }

        $pdo = Database::connection();
        $pdo->prepare(
            'INSERT INTO wallets (user_id, asset, network, balance, available_balance) VALUES (?, ?, ?, 0, 0)'
        )->execute([$userId, strtoupper($asset), strtoupper($network)]);

        return $this->getWallet($userId, $asset, $network) ?? [];
    }

    public function credit(
        int $userId,
        string $asset,
        string $network,
        float $amount,
        string $type,
        string $providerRef,
        ?string $txHash = null
    ): void {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $wallet = $this->getOrCreateWallet($userId, $asset, $network);
            $walletId = (int) $wallet['id'];

            $pdo->prepare(
                'UPDATE wallets SET balance = balance + ?, available_balance = available_balance + ? WHERE id = ?'
            )->execute([$amount, $amount, $walletId]);

            $ref = ReferenceGenerator::wallet();
            $pdo->prepare(
                'INSERT INTO wallet_transactions
                 (wallet_id, user_id, type, asset, network, amount, reference, provider, provider_reference, tx_hash, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, "CASHRAMP", ?, ?, "SUCCESS")'
            )->execute([
                $walletId, $userId, $type, strtoupper($asset), strtoupper($network),
                $amount, $ref, $providerRef, $txHash,
            ]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public function getTransactions(int $userId, ?string $asset = null, int $limit = 50): array
    {
        $pdo = Database::connection();
        if ($asset) {
            $stmt = $pdo->prepare(
                'SELECT * FROM wallet_transactions WHERE user_id = ? AND asset = ?
                 ORDER BY created_at DESC LIMIT ?'
            );
            $stmt->bindValue(1, $userId, \PDO::PARAM_INT);
            $stmt->bindValue(2, strtoupper($asset));
            $stmt->bindValue(3, $limit, \PDO::PARAM_INT);
        } else {
            $stmt = $pdo->prepare(
                'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
            );
            $stmt->bindValue(1, $userId, \PDO::PARAM_INT);
            $stmt->bindValue(2, $limit, \PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
