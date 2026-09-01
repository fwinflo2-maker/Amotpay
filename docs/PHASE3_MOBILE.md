# AMOTPay Mobile — Phase 3

## Architecture

| App | Path | Role |
|-----|------|------|
| User | `mobile/` | Expo / React Native — **the product** |
| Admin | `admin/` | React / Vite — operations console |
| API | `backend/` | Central truth |

`web/` is **deprecated** (see `web/DEPRECATED.md`). Do not build user features there.

## Phase 3A — Complete

- Premium design system (`src/theme/designTokens.ts`, light/dark `ThemeProvider`)
- Signature Flow animation (`src/components/FlowMark.tsx`)
- 5-tab navigation: Home, Send, Accounts, Wallet, Activity
- Premium Home with eligibility + KYC + real wallet data only
- Loading / error / empty / skeleton states
- i18n: en, fr, es, pt, de, ar
- Modular API client (`src/api/`)
- KYC status screen (`/Verification` stack route)

## Run locally

```bash
cd mobile
npm install
npm start
```

## Phase 3B+ (next)

- Universal Send UI refactor (v2 quote)
- Sumsub Mobile SDK (dev build)
- Crypto / Cards flows when Cashramp sandbox is configured
