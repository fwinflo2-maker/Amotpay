-- Admin session metadata for security management
SET NAMES utf8mb4;

ALTER TABLE admin_sessions
    ADD COLUMN ip_address VARCHAR(45) NULL AFTER token_hash,
    ADD COLUMN user_agent VARCHAR(255) NULL AFTER ip_address,
    ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER user_agent;
