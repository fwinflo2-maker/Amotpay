# Android release signing

Keep the upload keystore and credentials outside the repository. Configure these environment variables or equivalent entries in `~/.gradle/gradle.properties`:

```properties
AMOTPAY_UPLOAD_STORE_FILE=C:/secure/amotpay-upload.jks
AMOTPAY_UPLOAD_STORE_PASSWORD=change-me
AMOTPAY_UPLOAD_KEY_ALIAS=amotpay-upload
AMOTPAY_UPLOAD_KEY_PASSWORD=change-me
AMOTPAY_PRODUCTION_BUILD=true
```

Production builds fail during Gradle configuration if any signing value is absent. Debug signing is used only when `AMOTPAY_PRODUCTION_BUILD` is false, for local or preview builds.
