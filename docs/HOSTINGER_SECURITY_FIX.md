# Hostinger — Fix critical exposure (do this FIRST)

## Problem

`amotpay.env` is publicly downloadable at the API subdomain. **Stop all financial testing until fixed.**

## Step 1 — Remove file from webroot (mandatory)

In Hostinger File Manager or SSH:

1. Locate `public_html/amotpay-api/amotpay.env` (or equivalent document root)
2. **Delete** the file OR move it **outside** `public_html` (e.g. `~/private/amotpay.env`)
3. Never serve configuration from a URL-accessible path

## Step 2 — Deploy hardened `.htaccess`

Copy rules from `deploy/root-security.htaccess` to the subdomain document root `.htaccess`.

Merge with existing rules in `deploy/subdomain-root/.htaccess` when deploying backend.

## Step 3 — Store secrets in Hostinger environment only

Use Hostinger **Environment variables** (or private file outside webroot).  
**Do not** place `amotpay.env` in the document root again.

Required variables (placeholders only — use NEW rotated values):

```env
APP_URL=https://amotpay-api.nexustechnologies.cloud
APP_SECRET=<new-random-64-chars>
ADMIN_PIN=<new-min-12-chars>
DB_HOST=localhost
DB_NAME=u199940923_amotpay
DB_USER=u199940923_amotpay
DB_PASSWORD=<new-rotated-password>
```

Plus Cashramp and Sumsub keys (new sandbox/production keys).

## Step 4 — Rotate ALL compromised secrets

Because the file was public HTTP 200, rotate:

- Database password (Hostinger panel)
- `APP_SECRET` (re-encrypt provider settings after change)
- `ADMIN_PIN`
- Cashramp API keys (Cashramp dashboard)
- Sumsub credentials (Sumsub dashboard)

## Step 5 — Verify

```powershell
.\scripts\security-url-check.ps1
```

Every path must return **403** or **404**, never **200**.

## Step 6 — Only then

- Run migrations 005, 006, 007
- Configure sandbox providers
- Execute sandbox E2E (`docs/SANDBOX_E2E.md`)
