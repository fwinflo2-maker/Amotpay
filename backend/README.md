# AmotPay backend

PHP API for global transfers via **Cashramp** and identity verification via **Sumsub**.

`POST /api/beneficiary/check`, `POST /api/quote`, `POST /api/transfers`, `POST /api/crypto/quote`, `POST /api/crypto/buy`, `POST /api/crypto/mark-paid`, and `GET /api/crypto/assets` all return `410 FEATURE_DISABLED`. `GET /api/transfers`, `GET /api/crypto/transactions`, and wallet reads remain available for historical data.

## Operations

- Run migrations from CLI only: `php bin/migrate.php`.
- Run autonomous tests: `php tests/run.php`.
- Configure Cashramp and Sumsub credentials outside version control.
- Use `POST /api/v2/quote` and `POST /api/v2/transfers` for new transfer flows.

## Admin API

All routes except login require an admin bearer token. List routes accept `limit` (max 100) and `offset`.

- `POST /api/admin/login`: `{"pin":"..."}`; `ADMIN_PIN` must be at least 8 characters.
- `POST /api/admin/logout`.
- `GET /api/admin/users`: filters `status`, `country`, `q`.
- `PATCH /api/admin/users/{id}`: fields `status`, `payout_enabled`.
- `GET /api/admin/transfers`: filters `status`, `user_id`, `source_country`, `destination_country`, `from`, `to`.
- `GET /api/admin/webhooks`: filters `provider`, `event`, `processed`; stored payloads are not returned.
- `GET /api/admin/audits`: filters `action`, `user_id`.
- `GET /api/admin/errors`.
- `GET|PUT /api/admin/providers`: configuration state is masked; secret values are never returned.
- `GET /api/admin/health-check`: Cashramp and Sumsub connectivity.
- `GET /api/admin/providers/overview`: Cashramp and Sumsub credential cards.
