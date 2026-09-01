# Deployment security

Deployment credentials must be stored in the process, CI, or hosting secret manager. The scripts require `AMOTPAY_DEPLOY_BASE_URL`, `AMOTPAY_DEPLOY_AUTH_KEY`, and `AMOTPAY_DEPLOY_REST_AUTH`; `AMOTPAY_DEPLOY_OUTPUT_DIR` is optional and must point outside the workspace.

Runtime API configuration must be provided by the hosting environment; the required names are listed with empty values in `deploy/runtime.env.example`. Do not upload that example, `.env`, credential files, migrations, SQL dumps, migration runners, keystores, or deployment archives under the document root.

Before each deployment:

1. Confirm the required environment variables are present without printing them.
2. Run the preparation script and inspect only the generated file names.
3. Confirm no secret or forbidden artifact is present in the package.
4. Deploy through the authenticated upload script.
5. Test that dotfiles, environment files, SQL, archives, migration paths, and migration scripts return `403` or `404` remotely.

Any credential previously committed, archived, uploaded, or embedded in a script must be treated as compromised. Rotate it in the provider or hosting control panel, replace the remote runtime configuration, and remove old deployment files and public migration/deployment runners from the server.
