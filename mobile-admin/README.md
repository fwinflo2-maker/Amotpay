# AmotPay Admin APK

Application Android pour configurer les clés **Magma OnePay** et **Cashramp** sur le serveur AmotPay.

## Connexion

- Contactez l'administrateur système pour obtenir le PIN admin.
- Le PIN est configuré uniquement côté serveur (`ADMIN_PIN` dans l'environnement Hostinger — jamais dans le code).

## URLs Magma (à coller dans le dashboard Magma OnePay)

Lors de **Créer une nouvelle clé** sur Magma :

| Champ Magma | Valeur |
|-------------|--------|
| **URL Webhook** | `https://amotpay-api.nexustechnologies.cloud/webhooks/magma` |
| **URL de succès** | `https://amotpay-api.nexustechnologies.cloud/callbacks/magma/success` |
| **URL d'erreur** | `https://amotpay-api.nexustechnologies.cloud/callbacks/magma/error` |
| **Adresse IP** | Affichée dans l'app (IP sortante Hostinger) |
| **Clé secrète** | Min 40 caractères, lettres + chiffres + `@$!%*#?&-_` |
| **Expiration** | Max 1 an |

Dans l'app AmotPay Admin, saisissez ensuite :
- **Private Key** = Bearer TOKEN (dashboard Magma)
- **User Secret** = X-User-Secret (clé secrète que vous créez, min 40 car.)

## Build APK

### Option A — Android Studio (local)

```bash
cd mobile-admin
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

APK : `android/app/build/outputs/apk/release/app-release.apk`

### Option B — EAS Build (cloud)

```bash
npm install -g eas-cli
eas login
cd mobile-admin
eas build -p android --profile preview
```

## API Backend

- `POST /admin/login` — `{ "pin": "<admin-pin>" }`
- `GET /admin/providers` — clés masquées + URLs Magma/Cashramp
- `PUT /admin/providers` — enregistrer les clés (chiffrées en base)
