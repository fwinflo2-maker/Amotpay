# AMOTPay — Phase 2 Sandbox E2E

**API:** https://amotpay-api.nexustechnologies.cloud (**v2.2.0**)  
**Admin:** https://admin-amotpay.nexustechnologies.cloud

## Prerequisite

Phase 1 complete: security PASS, migrations 005–008 APPLIED, backend deployed.

### Apply migration 008 (admin credentials)

Via Admin → **Migrations** → **Apply pending**, or:

```powershell
$env:AMOTPAY_ADMIN_USERNAME = "admin"
$env:AMOTPAY_ADMIN_PASSWORD = "<from-hostinger>"
.\scripts\apply-admin-migrations.ps1
```

## Configure credentials (never in Git)

Choose **one** method:

### Option A — Hostinger `amotpay.env` (recommended)

In hPanel File Manager, edit `public_html/amotpay-api/amotpay.env` (HTTP 403, PHP-readable only):

```env
CASHRAMP_API_URL=https://staging.api.useaccrue.com/cashramp/api/graphql
CASHRAMP_PUBLIC_KEY=your-new-sandbox-public-key
CASHRAMP_SECRET_KEY=your-new-sandbox-secret-key
CASHRAMP_WEBHOOK_SECRET=your-cashramp-webhook-secret
CASHRAMP_ENVIRONMENT=sandbox

SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_APP_TOKEN=your-new-sandbox-app-token
SUMSUB_SECRET_KEY=your-new-sandbox-secret-key
SUMSUB_WEBHOOK_SECRET=your-sumsub-webhook-secret
SUMSUB_LEVEL_NAME=basic-kyc-level

ALLOWED_ORIGINS=https://admin-amotpay.nexustechnologies.cloud,https://admin.amotpay.nexustechnologies.cloud,http://localhost:5174
```

Never use `*` for CORS.

### Option B — Admin Web (`admin/`)

1. Open https://admin-amotpay.nexustechnologies.cloud/admin/login
2. Login with `ADMIN_USERNAME` + `ADMIN_PASSWORD` from Hostinger (`ADMIN_PIN` legacy fallback)
3. **Providers** → save Cashramp + Sumsub credentials (masked after save)

### Option C — Local script (env vars only)

```powershell
Copy-Item deploy\sandbox.env.example deploy\sandbox.env.local
# Edit sandbox.env.local with your sandbox keys (never commit)

Get-Content deploy\sandbox.env.local | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}

.\scripts\sandbox-phase2.ps1 -ConfigureProviders -TestConnections
```

## Webhooks (register in provider dashboards)

| Provider | URL |
|----------|-----|
| Cashramp | `https://amotpay-api.nexustechnologies.cloud/api/webhooks/cashramp` |
| Sumsub | `https://amotpay-api.nexustechnologies.cloud/api/webhooks/sumsub` |

## Validation sequence

```powershell
.\scripts\sandbox-phase2.ps1 -TestConnections
.\scripts\sandbox-phase2.ps1 -SyncCapabilities
.\scripts\sandbox-phase2.ps1 -RunE2E
```

## Expected Phase 2 PASS criteria

- `POST /api/admin/providers/cashramp/test` → `CONNECTED`
- `POST /api/admin/providers/sumsub/test` → `CONNECTED`
- Cashramp customer idempotent
- KYC → `VERIFIED` (Sumsub sandbox + webhook)
- Real quote from synced capabilities
- Transfer → `PAYMENT_PENDING` → webhook → `COMPLETED`
- Ledger balanced, reconciliation `MATCHED`
