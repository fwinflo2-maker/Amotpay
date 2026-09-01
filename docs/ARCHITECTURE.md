# AmotPay — Architecture

## Providers (strict separation)

| Provider | Role | Documentation |
|----------|------|---------------|
| **Magma OnePay** | Fiat transfers / Mobile Money / Payout | https://docs.magmaonepay.com/ |
| **Cashramp** | Crypto on-ramp / stablecoins | https://docs.cashramp.co/cashramp |

No other providers are used in this version.

## Hostinger Infrastructure

| Resource | Value | Notes |
|----------|-------|-------|
| Account | `u199940923` | Shared hosting |
| **AmotPay DB** | `u199940923_amotpay` | **Dedicated — do not touch Nexus** |
| Nexus DB | `u199940923_nexus` | **DO NOT MODIFY** |
| DB Host | `srv1862.hstgr.io:3306` | MariaDB/MySQL |
| Website | `nexustechnologies.cloud` | Nexus (non modifié) |
| **API AmotPay** | `https://amotpay-api.nexustechnologies.cloud` | Sous-domaine dédié |

## Wallet Model — Custodial Ledger

Based on Cashramp Direct Ramp documentation:

1. **Who holds funds?** Cashramp merchant account receives stablecoin settlement.
2. **User wallet address:** Optional `onchainTransferInfo` in `initiateRampQuoteDeposit` delivers on-chain; otherwise settlement stays in merchant account.
3. **AmotPay approach:** Internal custodial ledger tracks user balances. Wallet is credited **only after** Cashramp webhook confirms `completed` status.
4. **Private keys:** Never stored in plain text in MySQL. On-chain addresses require secure key management (future phase).

## Fiat Flow (Magma)

```
APK → AmotPay Backend → Magma check-account → Quote → Execute Transfer → Webhook → SUCCESS
```

## Crypto Flow (Cashramp)

```
APK → Quote (rampQuote) → Buy (initiateRampQuoteDeposit) → Local Payment → markDepositAsPaid → Webhook → Wallet Credit
```

## BTC Policy

- Wallet displays BTC balance (always 0 until supported).
- `buy_enabled = false` for BTC until Cashramp `rampableAssets` confirms support.
- UI shows: *"BTC achat direct indisponible avec notre infrastructure actuelle."*

## Idempotency

- Fiat: `AMOTPAY-FIAT-XXXXXXXX`
- Crypto: `AMOTPAY-CRYPTO-XXXXXXXX`
- Header: `X-Idempotency-Key`

## Environments

| Env | Magma | Cashramp |
|-----|-------|----------|
| Staging/Dev | Test keys | `staging.api.useaccrue.com` |
| Production | Live keys | `api.useaccrue.com` |

## Security

- Provider secrets server-side only
- HTTPS required
- Rate limiting per IP
- Webhook token validation (`X-CASHRAMP-TOKEN`)
- Audit logs table
