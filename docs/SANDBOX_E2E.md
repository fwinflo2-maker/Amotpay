# Sandbox E2E — First transfer

API: `https://amotpay-api.nexustechnologies.cloud`

## Prerequisites

1. Security incident resolved (`docs/SECURITY_INCIDENT.md`)
2. Migrations 005, 006, 007 applied
3. New Cashramp sandbox credentials configured via admin
4. New Sumsub sandbox credentials configured via admin
5. Feature flag `INTERNATIONAL_TRANSFER` enabled (admin PATCH)

## Flow

### 1. Register

```http
POST /api/auth/register
```

Verify user has `cashramp_customer_id` or call:

```http
POST /api/onboarding/cashramp
Authorization: Bearer <token>
```

### 2. KYC

```http
POST /api/kyc/start
GET /api/kyc/status
```

Complete Sumsub sandbox verification → webhook updates status to `VERIFIED`.

### 3. Eligibility

```http
GET /api/eligibility
```

`international_transfer.status` must be `AVAILABLE`.

### 4. Sync capabilities

```http
POST /api/admin/capabilities/sync
```

### 5. Quote (real corridor from capabilities)

```http
POST /api/v2/quote
{
  "source_amount": "10000.00",
  "source_currency": "XAF",
  "destination_country": "CI",
  "destination_currency": "XOF",
  "payout_method": "<from_capabilities>"
}
```

### 6. Transfer

```http
POST /api/v2/transfers
Idempotency-Key: <unique-16+-chars>
{
  "quote_ref": "QTE-...",
  "payout_method": "...",
  "recipient": { "name": "...", "phone": "+225..." }
}
```

Status starts as `PAYMENT_PENDING` — **not** `COMPLETED`.

### 7. Webhook

Cashramp sends event → `POST /api/webhooks/cashramp`

Transfer becomes `COMPLETED` only after webhook processing.

### 8. Verify

```http
GET /api/v2/transfers/<reference>
GET /api/admin/ledger
GET /api/admin/reconciliation
```

## Admin UI (local)

```bash
cd admin && npm install && npm run dev
```

Open `http://localhost:5174/admin/login`
