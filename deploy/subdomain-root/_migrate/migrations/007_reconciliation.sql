-- Reconciliation records + provider customer lock
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS reconciliation_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_order_id BIGINT UNSIGNED NULL,
    provider_reference VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL,
    details JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reconciliation_transfer (transfer_order_id),
    INDEX idx_reconciliation_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS provider_customer_locks (
    user_id INT UNSIGNED PRIMARY KEY,
    lock_token VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
