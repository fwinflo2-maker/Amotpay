-- Admin provider metadata, RBAC foundation, sync logs, transfer v2
SET NAMES utf8mb4;

-- Provider settings metadata (secrets remain encrypted in setting_value)
ALTER TABLE provider_settings
    ADD COLUMN encryption_version TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER setting_value,
    ADD COLUMN disabled TINYINT(1) NOT NULL DEFAULT 0 AFTER encryption_version,
    ADD COLUMN rotated_at TIMESTAMP NULL AFTER disabled,
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER rotated_at;

CREATE TABLE IF NOT EXISTS provider_sync_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('CASHRAMP', 'SUMSUB', 'MAGMA') NOT NULL,
    sync_type VARCHAR(64) NOT NULL DEFAULT 'capabilities',
    status VARCHAR(32) NOT NULL,
    counts JSON NULL,
    error_message VARCHAR(500) NULL,
    admin_session_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_provider_sync_provider (provider, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS provider_health_checks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('CASHRAMP', 'SUMSUB', 'MAGMA') NOT NULL,
    status VARCHAR(32) NOT NULL,
    latency_ms INT UNSIGNED NULL,
    details JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_provider_health (provider, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC foundation (PIN admin maps to SUPER_ADMIN until full admin users)
CREATE TABLE IF NOT EXISTS admin_roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE,
    permissions JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admin_roles (name, permissions) VALUES
    ('SUPER_ADMIN', '["*"]'),
    ('DEVELOPER', '["PROVIDER_CREDENTIALS_VIEW","PROVIDER_CREDENTIALS_WRITE","PROVIDER_CREDENTIALS_ROTATE","KYC_VIEW","TRANSFER_VIEW","LEDGER_VIEW","CONFIG_WRITE"]'),
    ('OPERATIONS', '["KYC_VIEW","TRANSFER_VIEW","LEDGER_VIEW","PROVIDER_CREDENTIALS_VIEW"]'),
    ('FINANCE', '["TRANSFER_VIEW","LEDGER_VIEW","RECONCILIATION_VIEW"]'),
    ('COMPLIANCE', '["KYC_VIEW","KYC_REVIEW","AUDIT_VIEW"]'),
    ('SUPPORT', '["KYC_VIEW","TRANSFER_VIEW"]'),
    ('AUDITOR', '["AUDIT_VIEW","TRANSFER_VIEW","LEDGER_VIEW","KYC_VIEW"]')
ON DUPLICATE KEY UPDATE permissions = VALUES(permissions);

-- Cashramp transfers (new architecture — Magma transactions table preserved as legacy)
CREATE TABLE IF NOT EXISTS transfer_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    quote_id BIGINT UNSIGNED NULL,
    reference VARCHAR(32) NOT NULL UNIQUE,
    idempotency_key VARCHAR(64) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    source_country CHAR(2) NOT NULL,
    source_currency CHAR(3) NOT NULL,
    source_amount DECIMAL(18, 8) NOT NULL,
    destination_country CHAR(2) NOT NULL,
    destination_currency CHAR(3) NOT NULL,
    destination_amount DECIMAL(18, 8) NOT NULL,
    payout_method VARCHAR(64) NOT NULL,
    recipient JSON NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'CASHRAMP',
    provider_reference VARCHAR(128) NULL,
    internal_route JSON NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    provider_fee DECIMAL(18, 8) NULL,
    platform_fee DECIMAL(18, 8) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY uk_transfer_user_idempotency (user_id, idempotency_key),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
    INDEX idx_transfer_orders_status (status),
    INDEX idx_transfer_orders_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
