# AMOTPay Admin Web

Operations console for AMOTPay — **Web only**.

| Item | Value |
|------|-------|
| **Production URL** | https://admin-amotpay.nexustechnologies.cloud |
| Future canonical URL | https://admin.amotpay.nexustechnologies.cloud *(DNS/vhost not configured yet)* |
| API | https://amotpay-api.nexustechnologies.cloud |
| Stack | React + TypeScript + Vite |

> Use **only** the Production URL above until the future hostname is live. Do not document `admin.amotpay` as operational.

## Local development

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5174/admin/

## Environment

```env
VITE_API_URL=https://amotpay-api.nexustechnologies.cloud
VITE_ADMIN_URL=https://admin-amotpay.nexustechnologies.cloud
```

Never put provider secrets in `VITE_*` variables.

## Production deploy

1. Build package:
   ```powershell
   .\scripts\deploy-admin-hostinger.ps1
   ```
2. Deploy archive to `admin-amotpay.nexustechnologies.cloud` (Hostinger static deploy).
3. Ensure backend `ALLOWED_ORIGINS` includes the admin origin (see below).

## Backend CORS

On the API server (`amotpay.env`):

```env
ALLOWED_ORIGINS=https://admin-amotpay.nexustechnologies.cloud,https://admin.amotpay.nexustechnologies.cloud,http://localhost:5174
```

## Routes

SPA base path: `/admin/` — e.g. `/admin/login`, `/admin/providers`, `/admin/kyc`.

## Security

- Admin PIN / token never committed to Git.
- Provider credentials masked server-side only.
- Run `.\scripts\secret-scan.ps1` before every push.
