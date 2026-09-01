-- AmotPay Database Schema
-- Database: u199940923_amotpay (Hostinger)
-- DO NOT run against Nexus or other databases

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS countries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code CHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    currency CHAR(3) NOT NULL,
    phone_prefix VARCHAR(10) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NULL,
    password_hash VARCHAR(255) NOT NULL,
    country_code CHAR(2) NOT NULL,
    currency CHAR(3) NOT NULL,
    status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_country (country_code),
    FOREIGN KEY (country_code) REFERENCES countries(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_methods (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    provider ENUM('MAGMA', 'CASHRAMP') NOT NULL,
    provider_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('mobile_money', 'bank_transfer', 'wave', 'card') NOT NULL,
    currency CHAR(3) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    min_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    max_amount DECIMAL(18, 2) NOT NULL DEFAULT 999999999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_payment_method (country_code, provider, provider_code),
    FOREIGN KEY (country_code) REFERENCES countries(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS corridors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source_country CHAR(2) NOT NULL,
    destination_country CHAR(2) NOT NULL,
    provider ENUM('MAGMA') NOT NULL DEFAULT 'MAGMA',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_corridor (source_country, destination_country, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    reference VARCHAR(50) NOT NULL UNIQUE,
    source_country CHAR(2) NOT NULL,
    source_currency CHAR(3) NOT NULL,
    destination_country CHAR(2) NOT NULL,
    destination_currency CHAR(3) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(30) NULL,
    recipient_first_name VARCHAR(100) NOT NULL,
    recipient_last_name VARCHAR(100) NOT NULL,
    source_amount DECIMAL(18, 2) NOT NULL,
    provider_fee DECIMAL(18, 2) NOT NULL DEFAULT 0,
    application_fee DECIMAL(18, 2) NOT NULL DEFAULT 0,
    exchange_rate DECIMAL(18, 8) NULL,
    destination_amount DECIMAL(18, 2) NOT NULL,
    total_payable DECIMAL(18, 2) NOT NULL,
    provider ENUM('MAGMA') NOT NULL DEFAULT 'MAGMA',
    provider_reference VARCHAR(100) NULL,
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    status ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_tx_user (user_id),
    INDEX idx_tx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crypto_assets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    network VARCHAR(20) NOT NULL,
    contract_address VARCHAR(100) NULL,
    provider ENUM('CASHRAMP', 'AMOTPAY') NOT NULL DEFAULT 'CASHRAMP',
    active TINYINT(1) NOT NULL DEFAULT 1,
    buy_enabled TINYINT(1) NOT NULL DEFAULT 0,
    sell_enabled TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_asset_network (symbol, network)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cashramp_customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    cashramp_customer_id VARCHAR(255) NOT NULL,
    country CHAR(2) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crypto_quotes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    provider_quote_id VARCHAR(255) NOT NULL,
    source_currency CHAR(3) NOT NULL,
    source_amount DECIMAL(18, 2) NOT NULL,
    asset VARCHAR(10) NOT NULL,
    network VARCHAR(20) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,
    provider_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
    application_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
    destination_amount DECIMAL(18, 8) NOT NULL,
    provider ENUM('CASHRAMP') NOT NULL DEFAULT 'CASHRAMP',
    status ENUM('ACTIVE', 'EXPIRED', 'USED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quote_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crypto_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    reference VARCHAR(50) NOT NULL UNIQUE,
    cashramp_customer_id VARCHAR(255) NULL,
    asset VARCHAR(10) NOT NULL,
    network VARCHAR(20) NOT NULL,
    source_currency CHAR(3) NOT NULL,
    source_amount DECIMAL(18, 2) NOT NULL,
    provider_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
    application_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
    destination_amount DECIMAL(18, 8) NOT NULL,
    provider ENUM('CASHRAMP') NOT NULL DEFAULT 'CASHRAMP',
    provider_reference VARCHAR(255) NULL,
    wallet_address VARCHAR(100) NULL,
    tx_hash VARCHAR(100) NULL,
    status ENUM('CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    quote_id INT UNSIGNED NULL,
    payment_details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_crypto_tx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (quote_id) REFERENCES crypto_quotes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    asset VARCHAR(10) NOT NULL,
    network VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
    address VARCHAR(100) NULL,
    balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
    available_balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
    status ENUM('active', 'frozen', 'closed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_wallet (user_id, asset, network),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    type ENUM('BUY', 'DEPOSIT', 'WITHDRAWAL', 'RECEIVE', 'SEND') NOT NULL,
    asset VARCHAR(10) NOT NULL,
    network VARCHAR(20) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
    reference VARCHAR(50) NOT NULL,
    provider ENUM('CASHRAMP', 'AMOTPAY') NOT NULL DEFAULT 'AMOTPAY',
    provider_reference VARCHAR(255) NULL,
    tx_hash VARCHAR(100) NULL,
    status ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wtx_wallet (wallet_id),
    INDEX idx_wtx_user (user_id),
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS webhooks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('MAGMA', 'CASHRAMP') NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    provider_reference VARCHAR(255) NULL,
    payload JSON NOT NULL,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_webhook_provider (provider, processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NULL,
    resource_id VARCHAR(50) NULL,
    ip_address VARCHAR(45) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    endpoint VARCHAR(100) NOT NULL,
    response_code INT NOT NULL,
    response_body JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
