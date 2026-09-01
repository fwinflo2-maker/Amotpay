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

- Login page: **identifiant** + **mot de passe** (+ code **2FA** si activé).
- Bootstrap initial (Hostinger `amotpay.env`, jamais dans GitHub) :
  ```env
  BOOTSTRAP_ADMIN_USERNAME=admin
  BOOTSTRAP_ADMIN_PASSWORD=<temporary-secret-min-8-chars>
  ```
  Au premier login après migration 008, le compte est créé en base avec `PASSWORD_CHANGE_REQUIRED`.
- Fallback legacy (avant bootstrap DB) :
  ```env
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=<min-8-chars>
  ```
- **Account & Security** (`/admin/settings`) :
  - Changer identifiant / mot de passe (audit loggé, jamais en clair)
  - Sessions actives + révocation
  - 2FA TOTP (setup / enable / disable)
- Après connexion avec mot de passe temporaire → redirection forcée vers **Paramètres**.

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
