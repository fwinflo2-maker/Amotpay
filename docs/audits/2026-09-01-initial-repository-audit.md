# AMOTPay — Initial repository audit

**Date:** 2026-09-01

**Scope:** GitHub repository only

**Status:** Hostinger production audit blocked pending secure SSH access and verified backups

## Executive summary

The GitHub repository does not currently contain the AMOTPay application described in the product brief. The default branch contains only an initial commit with a README, an MIT license, and a generic Node.js `.gitignore`.

No frontend, backend, database schema, authentication implementation, provider integration, deployment configuration, or tests are available in GitHub for review. The application reported as existing on Hostinger must therefore be inventoried and backed up before any rebuild or deployment begins.

Starting a replacement application now would violate the requirement to understand and preserve the existing implementation and financial history.

## Repository facts

- Remote: `https://github.com/fwinflo2-maker/Amotpay.git`
- Default branch: `main`
- Audited commit: `c3415a1883d970af949bdf9d3450d54ac3ca3ad7`
- Remote branches found: `main`
- Application source files found: none
- Git submodules found: none
- GitHub repository visibility at audit time: public

## Inventory

| Area | Finding | Classification |
|---|---|---|
| README | Product summary only | TO KEEP / EXPAND |
| License | MIT license | TO KEEP, subject to owner review |
| `.gitignore` | Node-oriented baseline; missing several PHP, backup, upload, database dump, certificate, and private-key patterns | NEEDS REFACTOR |
| React/Vite frontend | Not present | MISSING |
| PHP REST API | Not present | MISSING |
| MySQL schema/migrations | Not present | MISSING |
| Authentication/JWT | Not present | MISSING |
| Ledger | Not present | MISSING / CRITICAL UNKNOWN ON HOSTINGER |
| Cashramp adapter | Not present | MISSING / UNKNOWN ON HOSTINGER |
| Sumsub adapter | Not present | MISSING / UNKNOWN ON HOSTINGER |
| Webhooks | Not present | MISSING / UNKNOWN ON HOSTINGER |
| User application | Not present | MISSING / UNKNOWN ON HOSTINGER |
| Admin application | Not present | MISSING / UNKNOWN ON HOSTINGER |
| Automated tests | Not present | MISSING |
| CI/CD and rollback | Not present | MISSING |
| Environment template | Not present | MISSING |
| Hostinger configuration | Not accessible from repository | AUDIT BLOCKED |
| Production database and user history | Not accessible from repository | DO NOT MODIFY / AUDIT BLOCKED |

## Immediate risks

1. **Production/source divergence:** the Hostinger application is not represented in GitHub.
2. **No reproducible deployment:** the repository cannot currently rebuild what is in production.
3. **Unknown data model:** financial history and ledger integrity cannot yet be evaluated.
4. **Unknown secret handling:** Cashramp, Sumsub, database, and JWT credential storage cannot yet be evaluated.
5. **Public repository:** accidental secret or production-data commits would be immediately exposed.
6. **No rollback artifact in Git:** production rollback currently depends on Hostinger backups or server-side copies.

## Safe next actions

1. Confirm a recent Hostinger **file backup** and **database backup** exist before changes.
2. Grant temporary SSH-key access to the Hostinger website; do not share an account password, 2FA code, API token, or private key.
3. Perform a read-only server inventory:
   - document root and release layout;
   - framework/package manifests;
   - runtime versions;
   - environment-variable names without values;
   - database schema metadata without personal data;
   - cron jobs;
   - webhook endpoints;
   - deployment mechanism;
   - file permissions and writable directories.
4. Create a protected, encrypted working backup outside the web root before structural changes.
5. Compare Hostinger files with Git and import only reviewed source/configuration templates—never real secrets, uploads, identity documents, logs, or database dumps.
6. Produce the full keep/refactor/replace/missing/dangerous matrix.
7. Agree on a phased MVP and migration plan before implementation.
8. Deploy first to a staging hostname and run smoke tests before touching production.

## Change made during this phase

The repository `.gitignore` was hardened with baseline exclusions for Composer dependencies, uploads, backups, SQL dumps, private keys, certificates, secret files, and PHP tool caches.

## Explicit non-findings

This report does **not** claim that the Hostinger application lacks the features above. It only records that those features are absent from the GitHub repository and cannot be evaluated until secure Hostinger access is available.
