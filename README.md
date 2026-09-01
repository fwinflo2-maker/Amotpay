# AmotPay

Application fintech africaine — **Envoyer de l'argent** (Magma OnePay) + **Acheter de la crypto** (Cashramp).

## Structure

```
AMOTPAY/
├── backend/          PHP REST API (Hostinger)
├── mobile/           React Native Android APK
├── docs/             Architecture & deployment
└── README.md
```

## Hostinger

- **Database:** `u199940923_amotpay` on `srv1862.hstgr.io`
- **Website:** `nexustechnologies.cloud/amotpay`
- **Do NOT modify:** `u199940923_nexus` or other projects

## Quick Start — Backend

1. Copy `backend/.env.example` → `backend/.env` and fill credentials
2. Run migrations:
   ```bash
   mysql -h srv1862.hstgr.io -u u199940923_amotpay -p u199940923_amotpay < backend/migrations/001_initial_schema.sql
   mysql -h srv1862.hstgr.io -u u199940923_amotpay -p u199940923_amotpay < backend/migrations/002_seed_data.sql
   ```
3. Deploy via Hostinger subdomain `amotpay-api.nexustechnologies.cloud` (see `deploy/prepare-subdomain-zip.ps1`)

## Quick Start — Mobile APK

```bash
cd mobile
npm install
npx expo start
# Build APK:
npx expo run:android
# Or EAS:
npm run build:apk
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (1 country per account) |
| POST | `/api/auth/login` | Login |
| GET | `/api/me` | Current user |
| POST | `/api/beneficiary/check` | Magma check account |
| POST | `/api/quote` | Fiat quote |
| POST | `/api/transfers` | Create transfer (Magma) |
| POST | `/api/crypto/quote` | Crypto quote (Cashramp) |
| POST | `/api/crypto/buy` | Buy crypto (Cashramp Direct Ramp) |
| GET | `/api/crypto/assets` | Available assets (rampableAssets) |
| GET | `/api/wallets` | User wallets |
| POST | `/api/webhooks/magma` | Magma webhooks |
| POST | `/api/webhooks/cashramp` | Cashramp webhooks |
| GET | `/api/health` | Health check |

## Providers

- **Magma OnePay:** https://docs.magmaonepay.com/
- **Cashramp:** https://docs.cashramp.co/cashramp

## License

Proprietary — AmotPay / Nexus Technologies
