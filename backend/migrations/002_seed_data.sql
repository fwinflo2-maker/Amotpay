-- Seed countries, corridors, payment methods (Magma documented corridors)

INSERT INTO countries (code, name, currency, phone_prefix, active) VALUES
('CM', 'Cameroun', 'XAF', '+237', 1),
('CI', 'Côte d''Ivoire', 'XOF', '+225', 1),
('GH', 'Ghana', 'GHS', '+233', 1),
('SN', 'Senegal', 'XOF', '+221', 1),
('BJ', 'Benin', 'XOF', '+229', 1),
('BF', 'Burkina Faso', 'XOF', '+226', 1),
('ML', 'Mali', 'XOF', '+223', 1),
('TG', 'Togo', 'XOF', '+228', 1),
('KE', 'Kenya', 'KES', '+254', 1),
('GN', 'Guinée', 'GNF', '+224', 1),
('NE', 'Niger', 'XOF', '+227', 1),
('UG', 'Ouganda', 'UGX', '+256', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Magma payment methods (from docs.magmaonepay.com payout corridors)
INSERT INTO payment_methods (country_code, provider, provider_code, name, type, currency, min_amount, max_amount) VALUES
('CI', 'MAGMA', 'ORANGE_CI', 'Orange Money CI', 'mobile_money', 'XOF', 200, 1500000),
('CI', 'MAGMA', 'MTN_CI', 'MTN CI', 'mobile_money', 'XOF', 200, 1500000),
('CI', 'MAGMA', 'MOOV_CI', 'Moov CI', 'mobile_money', 'XOF', 200, 1500000),
('CI', 'MAGMA', 'WAVE_CI', 'Wave CI', 'wave', 'XOF', 200, 1500000),
('CM', 'MAGMA', 'MTN_CM', 'MTN Cameroun', 'mobile_money', 'XAF', 200, 1500000),
('CM', 'MAGMA', 'ORANGE_CM', 'Orange Cameroun', 'mobile_money', 'XAF', 200, 1500000),
('GH', 'MAGMA', 'MTN_GH', 'MTN Ghana', 'mobile_money', 'GHS', 200, 1500000),
('GH', 'MAGMA', 'VODAFONE_GH', 'Vodafone Ghana', 'mobile_money', 'GHS', 200, 1500000),
('SN', 'MAGMA', 'ORANGE_SN', 'Orange Senegal', 'mobile_money', 'XOF', 200, 1500000),
('SN', 'MAGMA', 'WAVE_SN', 'Wave Senegal', 'wave', 'XOF', 200, 1500000),
('SN', 'MAGMA', 'FREE_SN', 'Free Senegal', 'mobile_money', 'XOF', 200, 1500000)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Corridors from CM (primary test corridor CM -> CI)
INSERT INTO corridors (source_country, destination_country, provider, active) VALUES
('CM', 'CI', 'MAGMA', 1),
('CM', 'GH', 'MAGMA', 1),
('CM', 'SN', 'MAGMA', 1),
('CI', 'CM', 'MAGMA', 1),
('GH', 'CM', 'MAGMA', 1)
ON DUPLICATE KEY UPDATE active = VALUES(active);

-- Legacy crypto metadata is retained for historical rows, but all new activity is disabled.
INSERT INTO crypto_assets (symbol, name, network, provider, active, buy_enabled, sell_enabled) VALUES
('USDC', 'USD Coin', 'CELO', 'CASHRAMP', 0, 0, 0),
('USDC', 'USD Coin', 'OP', 'CASHRAMP', 0, 0, 0),
('USDC', 'USD Coin', 'BASE', 'CASHRAMP', 0, 0, 0),
('USDT', 'Tether USD', 'CELO', 'CASHRAMP', 0, 0, 0),
('USDT', 'Tether USD', 'TRX', 'CASHRAMP', 0, 0, 0),
('BTC', 'Bitcoin', 'BTC', 'AMOTPAY', 0, 0, 0)
ON DUPLICATE KEY UPDATE active = 0, buy_enabled = 0, sell_enabled = 0;
