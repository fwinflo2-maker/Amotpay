-- Keep legacy crypto tables and rows, but disable all assets for new activity.
UPDATE crypto_assets SET active = 0, buy_enabled = 0, sell_enabled = 0;
UPDATE payment_methods SET active = 0 WHERE provider = 'CASHRAMP';

ALTER TABLE payment_methods
    MODIFY type ENUM('mobile_money', 'bank_transfer', 'bank_account', 'wave', 'card') NOT NULL;

ALTER TABLE users
    ADD COLUMN payout_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

ALTER TABLE transactions
    ADD COLUMN request_hash VARCHAR(64) NULL AFTER idempotency_key,
    MODIFY provider_fee DECIMAL(18, 2) NULL,
    DROP INDEX idempotency_key,
    ADD UNIQUE KEY uk_tx_user_idempotency (user_id, idempotency_key);

ALTER TABLE webhooks
    ADD COLUMN event_hash VARCHAR(64) NULL AFTER provider_reference,
    ADD COLUMN last_error VARCHAR(255) NULL AFTER processed,
    ADD UNIQUE KEY uk_webhook_event_hash (event_hash);

CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash VARCHAR(64) PRIMARY KEY,
    count INT UNSIGNED NOT NULL DEFAULT 1,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_errors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    incident_id VARCHAR(32) NOT NULL UNIQUE,
    error_class VARCHAR(255) NOT NULL,
    safe_message VARCHAR(500) NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_system_errors_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
