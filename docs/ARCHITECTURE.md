# AMOTPay — Architecture

## Applications

| Surface | Stack | URL |
|---------|-------|-----|
| **User app** | Expo / React Native / TypeScript (`mobile/`) | Mobile only — no user web app |
| **Admin** | React / Vite / TypeScript (`admin/`) | https://admin-amotpay.nexustechnologies.cloud |
| **API** | PHP (`backend/` → `deploy/subdomain-root/`) | https://amotpay-api.nexustechnologies.cloud |

Legacy `mobile-admin/` is not maintained.

## Providers (strict separation)

| Provider | Role |
|----------|------|
| **Cashramp** | Finance — quotes, transfers, capabilities, webhooks |
| **Sumsub** | Identity — KYC/KYB, applicant, webhooks |

The backend owns the source of truth. Mobile and Admin never decide `VERIFIED` or `COMPLETED` alone.

## API

- Version: **2.1.0** (`GET /api/health`)
- Transfers: `POST /api/v2/quote`, `POST /api/v2/transfers`
- CORS: explicit `ALLOWED_ORIGINS` on Hostinger (never `*`)

## Transfer flow (user-visible)

```
Mobile Send (6 steps)
  → POST /api/v2/quote
  → POST /api/v2/transfers (Idempotency-Key)
  → PAYMENT_PENDING
  → Cashramp webhook
  → COMPLETED + ledger + reconciliation
```

User sees fiat corridor only (e.g. XAF → XOF). Internal settlement (e.g. via USDC) stays hidden.

## KYC flow

```
Register → Cashramp customer → POST /api/kyc/start
  → Sumsub mobile SDK (dev build)
  → Sumsub webhook → backend KYC status
  → GET /api/eligibility
```

## Admin visibility

After sandbox E2E, Admin shows: users, KYC, transfers, provider refs, webhooks, ledger, reconciliation.

## Hostinger

| Resource | Value |
|----------|-------|
| API | `amotpay-api.nexustechnologies.cloud` |
| Admin static | `admin-amotpay.nexustechnologies.cloud` |
| Env file | `public_html/amotpay-api/amotpay.env` (403, PHP-readable) |

## Security

- Provider secrets server-side only (Admin UI or Hostinger env)
- Webhook signature validation (Cashramp + Sumsub)
- Rate limiting, audit logs
- `scripts/security-url-check.ps1` must stay PASS

## Idempotency

- Header: `X-Idempotency-Key`
- Customer: `POST /api/onboarding/cashramp` — CREATED / REUSED
- Transfers: duplicate key returns same transfer

## Environments

| Env | Cashramp | Sumsub |
|-----|----------|--------|
| Sandbox | `staging.api.useaccrue.com` | `api.sumsub.com` (sandbox tokens) |
| Production | `api.useaccrue.com` | Live credentials |
