# LEGACY — Do not extend

`mobile-admin/` is the **legacy** Android admin APK.

## Target administration platform

All new admin features must be built in:

```
admin/
```

Stack: React + TypeScript + Vite  
API: `https://amotpay-api.nexustechnologies.cloud`

## Rules

- Do not add new admin capabilities to this APK.
- Do not remove this folder until functional parity is achieved in `admin/`.
- Security-sensitive operations (provider credentials, KYC review, reconciliation) belong in Admin Web + backend RBAC only.
