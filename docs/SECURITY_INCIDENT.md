# URGENT — Security incident (2026-09-01)

## Finding

`amotpay.env` is publicly downloadable at:

```text
https://amotpay-api.nexustechnologies.cloud/amotpay.env
```

HTTP 200 — **CRITICAL**. This file must not be web-accessible.

## Exposed material (types only — do not copy values)

- Application secret (`APP_SECRET`)
- Database credentials (`DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- Admin PIN (`ADMIN_PIN`)
- Provider configuration structure

**Assume all values in that file are compromised.**

## Immediate actions (Hostinger)

1. **Remove** `amotpay.env` from the webroot immediately (or move outside `public_html`)
2. **Rotate** database password in Hostinger panel
3. **Generate new** `APP_SECRET` and re-save all encrypted provider settings
4. **Change** `ADMIN_PIN` (minimum 12 characters, not a default)
5. **Deploy** `backend/public/.htaccess` (blocks `.env`, `amotpay.env`, `.sql`)
6. **Issue new** Cashramp and Sumsub credentials (never reuse exposed keys)
7. **Verify** these URLs return 404:
   - `/amotpay.env`
   - `/.env`
   - `/backend/.env`

## Configuration after rotation

Store secrets only in Hostinger environment variables — **not** in files under the document root.

```env
APP_URL=https://amotpay-api.nexustechnologies.cloud
```

Use the admin API or Hostinger panel to configure Cashramp/Sumsub — never commit real values to Git.

## Verification

```bash
curl -I https://amotpay-api.nexustechnologies.cloud/amotpay.env
# Expected: HTTP/1.1 403 or 404
```
