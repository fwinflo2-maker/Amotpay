# Rapport de conformite AMOTPAY

Date de l'audit : 31 aout 2026

## Verdict

**Le projet ne repond pas encore aux exigences du cahier des charges pour une mise en production.**

La structure d'un MVP existe : backend PHP, base AmotPay, application React Native, ecrans principaux, routes API, integration Magma/Cashramp et tables metier. Cependant, les flux financiers ne sont pas utilisables de bout en bout, les protections critiques sont incompletes, les applications ne passent pas la verification TypeScript, aucun test propre au projet n'est present et aucun APK release n'a ete livre.

## Urgence de securite

1. Le fichier `amotpay.env` du serveur public est telechargeable sans authentification. Une verification HTTP non destructive retourne `200 text/plain`.
2. Des identifiants Hostinger sont stockes en clair dans `deploy/upload-creds.json`, `deploy/upload.ps1` et `deploy/deploy-all.ps1`.
3. Des scripts de migration et leurs cles sont presents dans le webroot ou dans des archives de deploiement.
4. Les secrets concernes doivent etre consideres compromis : retrait immediat du webroot, revocation et rotation avant toute autre mise en production.

Aucune valeur sensible n'est reproduite dans ce rapport.

## Matrice de conformite

| Domaine | Etat | Observation principale |
|---|---|---|
| Architecture Magma/Cashramp | Partiel | Separation correcte dans le code, mais providers non configures sur le serveur public |
| Backend PHP Hostinger | Partiel | API et base accessibles, deploiement non securise et sources locales incoherentes |
| Base AmotPay dediee | Present a confirmer | Nom dedie documente et DB joignable ; isolation Hostinger non prouvee |
| Routes API minimales | Partiel | Routes declarees, mais plusieurs flux sont incomplets ou dangereux |
| Transfert fiat Magma | Non conforme | Pas de collecte/debit source, quote locale avec taux force, Check Account absent du flux mobile |
| Achat crypto Cashramp | Non conforme | Provider non configure, settlement et modele de garde non etablis |
| Assets et reseaux dynamiques | Partiel | `rampableAssets` existe, mais fallback et reseaux initiaux sont codes en dur |
| Wallet USDT/USDC/BTC | Partiel | Affichage et ledger basiques ; adresses, depots, retraits et multi-reseaux incomplets |
| Achat BTC desactive | Present | Blocage implemente, mais le message explicatif est normalement inaccessible |
| Webhooks | Non conforme | Magma non authentifie, Cashramp fail-open, anti-rejeu et traitement atomique absents |
| Idempotence | Partiel | Contraintes SQL presentes, mais appels providers et credits vulnerables aux courses |
| Administration | Non conforme | Configuration providers seulement ; listes, filtres, erreurs et audit demandes absents |
| Securite | Non conforme | Secrets exposes, debug actif, CORS global, audit non alimente, chiffrement insuffisant |
| Tests | Absent | Aucun test backend, mobile, integration, E2E ou securite propre au projet |
| APK release | Absent | Aucun `.apk`/`.aab`, configuration release signee avec la cle debug |
| Design mobile | Partiel | Palette respectee, identite africaine et finition fonctionnelle limitees |

## Constats bloquants

### 1. Providers indisponibles

Les controles du serveur public retournent :

- Magma : `not_configured`, credentials manquants.
- Cashramp : `not_configured`, credentials manquants.

L'envoi d'argent et l'achat de crypto ne peuvent donc pas fonctionner reellement.

### 2. Flux fiat dangereux et incomplet

- `backend/src/Services/TransferService.php:58-75` force notamment un taux de change a `1` et des frais provider a `0`.
- `backend/src/Services/TransferService.php:79-161` peut appeler le payout sans collecte ou debit prealable des fonds utilisateur.
- `mobile/src/screens/SendScreen.tsx:35-71` n'appelle pas le Check Account pourtant exige.
- Les corridors et destinations sont en partie codes en dur dans l'application.

Cela ne satisfait pas le scenario Check Account -> Quote -> Confirmation -> Magma -> Webhook -> SUCCESS.

### 3. Settlement crypto non etabli

- `backend/src/Services/CryptoService.php:206-252` initie l'operation avant de disposer d'un mecanisme robuste d'adresse/settlement.
- Les wallets sont crees sans adresse reelle dans `backend/src/Services/WalletService.php:55-60`.
- Le choix actif/reseau n'est pas garanti de bout en bout par la quote et le settlement.
- Le modele custodial ou non-custodial, la couverture des soldes et la verification blockchain ne sont pas documentes ni termines.

### 4. Webhooks falsifiables

- Le webhook Magma n'utilise pas `MAGMA_WEBHOOK_SECRET` et ne verifie pas la signature attendue.
- Le webhook Cashramp accepte les requetes lorsque son token local est vide.
- `backend/src/Services/CryptoService.php:302-325` et le schema SQL ne garantissent pas un credit unique en cas de webhooks concurrents.
- Les colonnes de traitement des webhooks ne sont pas exploitees de facon fiable.

### 5. Application Android non livrable

`npx tsc --noEmit` echoue dans `mobile` :

```text
Cannot find module 'expo-constants'
Property 'payment_details' does not exist on type 'object'
Property 'reference' does not exist on type 'object'
```

Le meme module manque dans `mobile-admin`. De plus :

- Expo declare `com.amotpay.app` alors que Gradle declare `com.amotpay`.
- `mobile/android/app/build.gradle:109-112` signe la release avec la configuration debug.
- Aucun APK ou AAB n'est present dans le projet.

### 6. Administration incomplete

`mobile-admin` permet essentiellement de saisir les parametres providers. Les vues exigees pour les utilisateurs, transactions fiat/crypto, wallets, quotes, webhooks, erreurs et filtres ne sont pas implementees.

## Elements deja presents

- Deux providers seulement dans l'architecture metier : Magma pour le fiat, Cashramp pour la crypto.
- Routes principales d'authentification, transfert, crypto, wallets, webhooks et health checks.
- Tables principales demandees dans `backend/migrations/001_initial_schema.sql`.
- References `AMOTPAY-FIAT-*` et `AMOTPAY-CRYPTO-*`.
- GraphQL Cashramp avec Bearer token cote serveur.
- Appels Magma Check Account et Execute Transfer.
- Navigation mobile Accueil, Envoyer, Acheter Crypto, Wallet, Historique et Profil.
- Affichage USDT, USDC et BTC, avec achat BTC desactive.
- Stockage du jeton utilisateur via SecureStore.

Ces elements constituent une base de developpement, pas une preuve de conformite fonctionnelle ou de securite.

## Verification effectuee

- Lecture du cahier des charges complet et audit statique de `backend`, `mobile`, `mobile-admin`, `deploy`, `docs` et des migrations.
- `npx tsc --noEmit` : echec dans les deux applications.
- Recherche d'artefacts : aucun `.apk` ou `.aab` trouve.
- Recherche de tests proprietaires : aucun trouve hors dependances.
- Health checks publics Magma/Cashramp : tous deux `not_configured`.
- Controle d'accessibilite de l'environnement public : HTTP 200 confirme, sans afficher son contenu.
- Le lint PHP n'a pas pu etre execute car PHP n'est pas installe dans l'environnement local.
- La tentative Gradle n'a pas abouti dans le temps disponible ; elle ne remplace pas les erreurs TypeScript et de configuration deja confirmees.

## Priorites avant production

1. Retirer immediatement les fichiers sensibles du webroot, revoquer et faire tourner tous les credentials exposes.
2. Bloquer/supprimer les scripts de migration publics et durcir `.htaccess`, les permissions et la configuration production.
3. Corriger et authentifier strictement les deux webhooks, avec anti-rejeu, unicite et transactions SQL atomiques.
4. Reconcevoir les idempotences fiat/crypto pour reserver l'operation avant tout appel provider.
5. Completer le financement source fiat et supprimer toute quote/taux invente.
6. Valider officiellement le modele de wallet et le settlement Cashramp avant tout credit utilisateur.
7. Configurer les providers en sandbox/staging, puis executer les scenarios E2E demandes.
8. Corriger le mobile, ajouter les tests, une signature release dediee et produire un APK verifiable.

## Conclusion

Le projet est **partiellement implemente**, mais **non conforme et non deployable en production**. Le premier travail n'est pas d'ajouter des fonctionnalites : il faut traiter l'incident de secrets exposes, securiser les flux financiers, rendre l'idempotence atomique, puis prouver les parcours Magma et Cashramp avec des tests sandbox/staging.
