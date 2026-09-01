-- AMOTPay global platform foundation
-- KYC (Sumsub), eligibility, capabilities, quotes, ledger, feature flags
-- Preserves all existing data; additive only.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Users: KYC columns
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN kyc_status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED' AFTER status,
    ADD COLUMN sumsub_applicant_id VARCHAR(64) NULL AFTER kyc_status,
    ADD COLUMN kyc_verified_at TIMESTAMP NULL AFTER sumsub_applicant_id,
    ADD COLUMN cashramp_customer_id VARCHAR(64) NULL AFTER kyc_verified_at,
    ADD INDEX idx_users_kyc_status (kyc_status),
    ADD INDEX idx_users_sumsub_applicant (sumsub_applicant_id);

-- ---------------------------------------------------------------------------
-- KYC profiles & events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kyc_profiles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    sumsub_applicant_id VARCHAR(64) NULL,
    level_name VARCHAR(100) NOT NULL DEFAULT 'basic-kyc-level',
    status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
    review_result VARCHAR(64) NULL,
    review_reject_type VARCHAR(64) NULL,
    country_code CHAR(2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_kyc_profiles_status (status),
    INDEX idx_kyc_profiles_sumsub (sumsub_applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    sumsub_applicant_id VARCHAR(64) NOT NULL,
    inspection_id VARCHAR(64) NULL,
    level_name VARCHAR(100) NOT NULL,
    status VARCHAR(32) NOT NULL,
    review_answer VARCHAR(32) NULL,
    reject_labels JSON NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_kyc_verifications_user (user_id),
    INDEX idx_kyc_verifications_sumsub (sumsub_applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kyc_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    sumsub_applicant_id VARCHAR(64) NULL,
    event_type VARCHAR(100) NOT NULL,
    event_hash VARCHAR(64) NOT NULL,
    payload JSON NOT NULL,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_kyc_event_hash (event_hash),
    INDEX idx_kyc_events_user (user_id),
    INDEX idx_kyc_events_applicant (sumsub_applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    flag_key VARCHAR(64) NOT NULL UNIQUE,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO feature_flags (flag_key, enabled, description) VALUES
    ('USD_ACCOUNT', 0, 'Virtual USD bank account'),
    ('EUR_ACCOUNT', 0, 'EUR account / IBAN when available'),
    ('CRYPTO', 0, 'Digital assets section'),
    ('USDT', 0, 'USDT operations'),
    ('USDC', 0, 'USDC operations'),
    ('BTC', 0, 'BTC operations'),
    ('VIRTUAL_CARD', 0, 'Virtual card issuance'),
    ('ONCHAIN_WITHDRAWAL', 0, 'On-chain crypto withdrawal'),
    ('INTERNATIONAL_TRANSFER', 0, 'Cross-border fiat transfers via Cashramp')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ---------------------------------------------------------------------------
-- Provider & country capabilities (dynamic, not hardcoded)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_capabilities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('CASHRAMP', 'MAGMA') NOT NULL DEFAULT 'CASHRAMP',
    capability_type VARCHAR(64) NOT NULL,
    capability_key VARCHAR(128) NOT NULL,
    country_code CHAR(2) NULL,
    currency CHAR(3) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UNAVAILABLE',
    metadata JSON NULL,
    min_amount DECIMAL(18, 8) NULL,
    max_amount DECIMAL(18, 8) NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'PROVIDER_API',
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_provider_capability (provider, capability_type, capability_key, country_code, currency),
    INDEX idx_provider_cap_status (status),
    INDEX idx_provider_cap_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS country_capabilities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    capability_type VARCHAR(64) NOT NULL,
    capability_key VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UNAVAILABLE',
    metadata JSON NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_country_capability (country_code, capability_type, capability_key),
    FOREIGN KEY (country_code) REFERENCES countries(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Product limits (never invented — sourced from provider/docs/admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_limits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_key VARCHAR(64) NOT NULL,
    country_code CHAR(2) NULL,
    currency CHAR(3) NULL,
    minimum_amount DECIMAL(18, 8) NULL,
    maximum_amount DECIMAL(18, 8) NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'PROVIDER_API',
    metadata JSON NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_product_limit (product_key, country_code, currency),
    INDEX idx_product_limits_key (product_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Quotes (real-time, never static FX)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote_ref VARCHAR(32) NOT NULL UNIQUE,
    user_id INT UNSIGNED NULL,
    source_country CHAR(2) NULL,
    source_currency CHAR(3) NOT NULL,
    source_amount DECIMAL(18, 8) NOT NULL,
    destination_country CHAR(2) NULL,
    destination_currency CHAR(3) NOT NULL,
    destination_amount DECIMAL(18, 8) NOT NULL,
    exchange_rate DECIMAL(18, 8) NULL,
    provider_fee DECIMAL(18, 8) NULL,
    network_fee DECIMAL(18, 8) NULL,
    platform_fee DECIMAL(18, 8) NULL,
    total_debit DECIMAL(18, 8) NOT NULL,
    net_receive DECIMAL(18, 8) NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'CASHRAMP',
    provider_quote_id VARCHAR(128) NULL,
    internal_route JSON NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_quotes_user (user_id),
    INDEX idx_quotes_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Ledger (double-entry foundation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(32) NOT NULL UNIQUE,
    user_id INT UNSIGNED NULL,
    operation_type VARCHAR(64) NOT NULL,
    related_type VARCHAR(64) NULL,
    related_id BIGINT UNSIGNED NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ledger_tx_user (user_id),
    INDEX idx_ledger_tx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ledger_transaction_id BIGINT UNSIGNED NOT NULL,
    account_type VARCHAR(64) NOT NULL,
    account_id VARCHAR(64) NOT NULL,
    currency CHAR(3) NOT NULL,
    entry_type ENUM('debit', 'credit') NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    balance_type ENUM('pending', 'available', 'in_transit', 'settlement') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_transaction_id) REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    INDEX idx_ledger_entries_tx (ledger_transaction_id),
    INDEX idx_ledger_entries_account (account_type, account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Mark Magma corridors as legacy (preserve history, disable new routing)
-- ---------------------------------------------------------------------------
UPDATE corridors SET active = 0 WHERE provider = 'MAGMA';
UPDATE payment_methods SET active = 0 WHERE provider = 'MAGMA';

-- Seed KYC profiles for existing users
INSERT INTO kyc_profiles (user_id, status, country_code)
SELECT id, COALESCE(kyc_status, 'NOT_STARTED'), country_code FROM users
ON DUPLICATE KEY UPDATE status = VALUES(status);
