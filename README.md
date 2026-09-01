# AMOTPay

> **AMOTPay is a global premium money platform for cross-border transfers, multi-currency accounts, digital assets, and virtual cards. Cashramp powers financial rails, while Sumsub handles identity verification and compliance.**

## Structure

```
AMOTPAY/
├── backend/          PHP REST API (Hostinger)
├── mobile/           Expo / React Native — user app
├── admin/            React + Vite — admin web console
├── docs/             Architecture, security, deployment
└── README.md
```

## Canonical API

```
https://amotpay-api.nexustechnologies.cloud
```

## Admin Web

Target: `https://admin.amotpay.nexustechnologies.cloud`  
Production (Hostinger): `https://admin-amotpay.nexustechnologies.cloud` — see `docs/ADMIN.md`.

## Security

- Never commit `.env`, `amotpay.env`, or provider secrets.
- Production secrets live only in the Hostinger environment.
- See `docs/SECURITY_INCIDENT.md` and `docs/HOSTINGER_SECURITY_FIX.md`.

## Quick Start — Backend

1. Copy `backend/.env.example` → `backend/.env` and fill credentials locally.
2. Run migrations:
   ```bash
   php backend/bin/migrate.php
   php backend/bin/migrate-status.php
   ```
3. Deploy via Hostinger subdomain `amotpay-api.nexustechnologies.cloud`.

## Quick Start — Admin Console

```bash
cd admin
npm install
npm run dev
```

Production: https://admin-amotpay.nexustechnologies.cloud — see `docs/ADMIN.md`.

Webhooks:

- `POST /api/webhooks/cashramp`
- `POST /api/webhooks/sumsub`

## Quick Start — Mobile APK

```bash
cd mobile
npm install
npx expo start
```

## Providers

- **Cashramp:** https://docs.cashramp.co/cashramp
- **Sumsub:** https://docs.sumsub.com/

## License

Proprietary — AMOTPay / Nexus Technologies
