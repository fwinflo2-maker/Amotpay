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

## Authentication

**Source of truth: database table `admin_credentials`** (migration 008). Environment variables are only used once to bootstrap the first row — never for routine login after that.

### Initial setup (Hostinger)

1. In `amotpay.env` (never commit), set **only for bootstrap**:
   ```env
   BOOTSTRAP_ADMIN_USERNAME=admin
   BOOTSTRAP_ADMIN_PASSWORD=<temporary-secret-min-8-chars>
   ```
2. Run on the API server (SSH or Hostinger cron):
   ```bash
   php backend/bin/create-admin.php
   ```
   Or apply migrations from Admin → Migrations → **Apply pending** (requires legacy env login only if 008 not applied yet).
3. Login at `/admin/login` with:
   - **Username:** `admin` (or `BOOTSTRAP_ADMIN_USERNAME`)
   - **Password:** the `BOOTSTRAP_ADMIN_PASSWORD` value you set on Hostinger
4. Change password in **Account & Security** (`/admin/settings`) — stored as bcrypt hash in `admin_credentials`.

After bootstrap, **remove or clear** `BOOTSTRAP_ADMIN_PASSWORD` from `amotpay.env`. Do not rely on `ADMIN_PASSWORD` / `ADMIN_PIN` for production admin login once the DB row exists.

### Ongoing management

- **Account & Security** (`/admin/settings`): username, password, sessions, 2FA TOTP
- All changes persisted in `admin_credentials` (encrypted hash only)

## Migrations

Appliquer via `/admin/migrations` :

| Migration | Contenu |
|-----------|---------|
| `008_admin_credentials.sql` | Table `admin_credentials` + états sécurité |
| `009_admin_sessions_security.sql` | Métadonnées sessions (IP, user-agent) |

## Security

- Admin credentials never committed to Git.
- Provider credentials masked server-side only.
- Run `.\scripts\secret-scan.ps1` before every push.
