# AmotPay backend

Fiat-only PHP API using the documented Magma OnePay payout API. Legacy crypto tables and read-only history routes remain solely for existing data.

`POST /api/crypto/quote`, `POST /api/crypto/buy`, `POST /api/crypto/mark-paid`, `GET /api/crypto/assets`, the Cashramp webhook, and Cashramp health all return `410 FEATURE_DISABLED`. `GET /api/crypto/transactions` and wallet reads remain authenticated and read-only for historical data.

## Operations

- Run migrations from CLI only: `php bin/migrate.php`.
- Run autonomous tests: `php tests/run.php`.
- Configure Magma credentials and `MAGMA_WEBHOOK_SECRET` outside version control.
- Keep `MAGMA_PAYOUTS_ENABLED=false` until Magma credentials, outbound IP allowlisting, webhook delivery, prefunded balances, and reconciliation have been tested in sandbox.
- Approve each payout user with `PATCH /api/admin/users/{id}` and `{"payout_enabled":true}`.

Magma documents payout execution against the merchant's prefunded country balances, but no FX quote or fee quote endpoint. AmotPay therefore accepts only same-currency transfers, applies no application fee, reports the provider fee as unknown, and rejects cross-currency quotes with `QUOTE_UNAVAILABLE`. Customer collection is not chained automatically to payout; adding that flow requires an explicit product and reconciliation design. Until then, only trusted operator accounts should receive `payout_enabled`; ordinary customer accounts remain blocked.

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
- `GET /api/admin/health-check`.
- `GET /api/admin/magma/balance`.
- `GET /api/admin/magma/methods`.
- `GET /api/admin/magma/history`: forwards only documented filters `start_date`, `end_date`, `channel`, `currency`, `status`.

Live provider calls and end-to-end webhook verification cannot be validated without Magma sandbox credentials, an allowlisted public outbound IP, a public HTTPS webhook URL, and a prefunded sandbox balance.

Magma does not document a signed webhook timestamp. Replay protection therefore uses a unique hash of the signed event data plus event type and atomic database processing; no undocumented timestamp rule is imposed.
