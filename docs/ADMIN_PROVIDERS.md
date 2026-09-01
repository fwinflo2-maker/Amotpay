# AMOTPay — Admin & Provider Configuration

API base: `https://amotpay-api.nexustechnologies.cloud`

## Migrations

```bash
# Backup database first (Hostinger phpMyAdmin or mysqldump)

php backend/bin/migrate.php
php backend/bin/migrate-status.php
```

Check status via API:

```text
GET /api/health/migrations
GET /api/admin/migrations   (admin auth required)
```

## Environment (Hostinger)

Set in hosting panel — never commit real values:

```env
APP_URL=https://amotpay-api.nexustechnologies.cloud
APP_SECRET=<rotate-if-previously-exposed>
ADMIN_PIN=<min-8-chars-rotate-if-exposed>

SUMSUB_APP_TOKEN=
SUMSUB_SECRET_KEY=
SUMSUB_WEBHOOK_SECRET=
SUMSUB_LEVEL_NAME=basic-kyc-level

CASHRAMP_API_URL=https://staging.api.useaccrue.com/cashramp/api/graphql
CASHRAMP_PUBLIC_KEY=
CASHRAMP_SECRET_KEY=
CASHRAMP_WEBHOOK_SECRET=
CASHRAMP_ENVIRONMENT=sandbox
```

## Webhooks

| Provider | URL |
|----------|-----|
| Sumsub | `https://amotpay-api.nexustechnologies.cloud/api/webhooks/sumsub` |
| Cashramp | `https://amotpay-api.nexustechnologies.cloud/api/webhooks/cashramp` |

## Admin API (Bearer admin token)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Financial overview |
| GET | `/api/admin/providers/overview` | Cashramp + Sumsub status (masked) |
| PUT | `/api/admin/providers/cashramp` | Save Cashramp credentials |
| PUT | `/api/admin/providers/sumsub` | Save Sumsub credentials |
| POST | `/api/admin/providers/cashramp/test` | Test connection |
| POST | `/api/admin/providers/sumsub/test` | Test connection |
| POST | `/api/admin/providers/cashramp/rotate` | Rotate secrets (requires `confirm_pin`) |
| POST | `/api/admin/capabilities/sync` | Sync Cashramp capabilities |
| GET | `/api/admin/capabilities` | List capabilities |
| GET | `/api/admin/countries` | Countries + real availability |
| GET | `/api/admin/kyc` | KYC monitoring |

## User KYC API

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/kyc/status` | `{ status, verified, display_status }` |
| POST | `/api/kyc/start` | `{ access_token, status }` |

## Financial v2

| Method | Path |
|--------|------|
| POST | `/api/v2/quote` |
| POST | `/api/v2/transfers` |

Requires `Idempotency-Key` header on transfers.

## Secret rotation policy

If credentials were ever exposed publicly (per compliance audit):

1. Generate new Cashramp keys in Cashramp dashboard
2. Generate new Sumsub app token / secret
3. Rotate `APP_SECRET` and re-encrypt provider settings
4. Rotate `ADMIN_PIN`
5. Rotate database password on Hostinger
6. Remove any `.env` files from webroot
