# Sécurité — Phase 1 : mise en service (guide pas à pas)

> Prérequis : la phase 0 est terminée (`docs/SECURITE_PHASE0.md`), notamment le verrouillage de la base.
> Cette phase ajoute la base sécurisée, les fonctions serveur, l'administration avec double authentification, et l'envoi des formulaires par le circuit sécurisé.

## Ce qui est livré (dans le dépôt)
| Élément | Où | Rôle |
|---|---|---|
| Schéma sécurisé | `supabase/migrations/0001_secure_schema.sql` | Tables typées, rôles, règles d'accès (RLS) qui **exigent la double authentification**, IBAN chiffrés, journal d'audit en ajout seul, limitation de débit |
| Fonctions serveur | `supabase/functions/*` | `submit-application`, `submit-contact`, `submit-referral`, `submit-insurance`, `request-upload-url` (publiques) ; `document-url` (admin) |
| Validation commune | `supabase/functions/_shared/schemas.ts` | Mêmes règles côté serveur et navigateur |
| Administration | `apps/admin/` | Connexion individuelle + TOTP obligatoire, rôles, candidatures, documents (lien 60 s, journalisé) |
| Site public | `src/lib/api.ts` + `PublicPortal.tsx` | Envoie les formulaires aux fonctions ; **ancien circuit conservé** tant que `VITE_API_URL` est vide |
| Tests | `supabase/tests/rls.test.ts`, `supabase/functions/_shared/handlers.test.ts` | 55 tests : droits de chaque rôle, MFA, IBAN chiffrés, journal infalsifiable, anti-robot, limites, jetons de dépôt |
| API de test locale | `scripts/dev-api.mjs` (`npm run dev:api`) | Exécute les vraies fonctions en mémoire pour tester le site sans Supabase |

Matrice des rôles (à valider avec toi) :
| Rôle | Candidatures et chauffeurs | Documents | IBAN et paie | Réglages / utilisateurs |
|---|---|---|---|---|
| `owner` | oui | oui | oui | oui |
| `manager` | oui | oui | lecture paie | lecture réglages |
| `advisor` | oui | oui (journalisé) | non | non |
| `accountant` | noms seulement | non | oui | lecture réglages |

## Ordre de mise en service

### 1. Base de données
1. Supabase → **SQL Editor** : crée la clé de chiffrement des IBAN (une seule fois, **ne la perds pas : sans elle les IBAN sont illisibles**) :
   `select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'iban_encryption_key');`
   Sauvegarde cette clé dans ton gestionnaire de mots de passe (Vault → Secrets).
2. Colle et exécute `supabase/migrations/0001_secure_schema.sql`. Les anciennes tables sont renommées `legacy_*` (elles restent verrouillées ; leurs données seront importées en phase 2).
3. Vérifie : `node scripts/verify-lockdown.mjs` doit toujours afficher « VERROUILLAGE CONFIRMÉ ».

### 2. Premier administrateur (toi)
1. **Authentication → Providers → Email** : **désactive « Allow new users to sign up »** (sinon n'importe qui peut créer un compte ; il n'aurait aucun droit, mais autant l'interdire).
2. **Authentication → Users → Add user** : ton e-mail + un mot de passe fort (gestionnaire de mots de passe), « Auto Confirm User » coché.
3. Copie l'identifiant (UUID) de l'utilisateur, puis dans le SQL Editor :
   `insert into public.profiles (user_id, role, full_name) values ('<UUID>', 'owner', 'Ton nom');`
4. Vérifie que **Authentication → Multi-Factor** a bien le TOTP activé.
5. Les autres comptes (Rayen, conseillers, comptable) : même procédure avec le rôle voulu (`manager`, `advisor`, `accountant`).

### 3. Fonctions serveur
1. Installe la CLI Supabase (`npm i -D supabase`), puis `npx supabase login` et `npx supabase link --project-ref <référence du projet>`.
2. Déploie : `npx supabase functions deploy submit-application submit-contact submit-referral submit-insurance request-upload-url document-url` (la configuration `verify_jwt` de `supabase/config.toml` est appliquée).
3. Définis les secrets (jamais dans le dépôt) :
   ```
   npx supabase secrets set ALLOWED_ORIGINS="https://nordrive-flotte.com,https://admin.nordrive-flotte.com" REQUIRE_CAPTCHA=true TURNSTILE_SECRET=... RESEND_API_KEY=... NOTIFY_EMAIL_TO=... NOTIFY_EMAIL_FROM=...
   ```
4. **Anti-robot** : Cloudflare → Turnstile → ajoute `nordrive-flotte.com` → clé de site (publique) pour le site, clé secrète pour `TURNSTILE_SECRET`. Sans clé secrète et avec `REQUIRE_CAPTCHA=true`, les fonctions **refusent** tout envoi (voulu).
5. **E-mails d'alerte** : compte Resend (ou équivalent), domaine vérifié, clé d'API. Sans elle, les enregistrements fonctionnent mais personne n'est prévenu par e-mail.

### 4. Basculer le site
1. Dans `.env.local` (non versionné) : `VITE_API_URL=https://<projet>.supabase.co/functions/v1`, `VITE_SUPABASE_ANON_KEY=<clé publique>`, `VITE_TURNSTILE_SITE_KEY=<clé de site>`.
2. `npm run build`, puis envoi sur OVH (comme en phase 0). **Test réel** : un envoi de formulaire avec un document, depuis ton téléphone ; il doit apparaître dans l'administration.
3. Quand c'est validé : désactive la clé Web3Forms, supprime le preset Cloudinary, et dis-moi : je retire l'ancien circuit du code.
4. Rappel : tant que `VITE_API_URL` est vide, le site utilise l'ancien circuit (Web3Forms/Cloudinary).

### 5. Administration
1. OVH : crée le sous-domaine `admin.nordrive-flotte.com` pointant vers un **dossier séparé**.
2. `npm run build:admin`, puis envoie le contenu de `dist-admin/` dans ce dossier (le `.htaccess` fourni applique une CSP stricte).
3. Première connexion : e-mail + mot de passe, puis **enregistrement de l'application d'authentification** (obligatoire), puis codes à 6 chiffres aux connexions suivantes. Déconnexion automatique après 15 minutes d'inactivité.

## Vérifications automatiques
`npm test` (55 tests) : à lancer avant tout déploiement. Ils cassent si une règle d'accès est affaiblie (testé en désactivant volontairement la MFA, en donnant un droit à la clé publique, en retirant un contrôle de rôle).

## Ce qui n'est PAS encore fait (phase 2 et 3) et limites à connaître
- **L'administration n'a que la liste des candidatures** (documents, création du chauffeur). Chauffeurs détaillés, paie, IBAN, statistiques, bloc « Rattachement Uber & Bolt » sont à porter en phase 2. Les fonctions SQL existent déjà (`set_driver_iban`, `get_driver_iban`, `promote_application`).
- **Import des anciennes données** (`legacy_drivers`, `legacy_payroll_weeks`) : phase 2.
- **CI/CD** (GitHub Actions, déploiement contrôlé), Cloudflare, Sentry, sauvegardes testées : phase 3.
- **Devis assurance** : les pièces ne sont plus déposées sur le site (elles partent par WhatsApp), le temps d'ajouter ce type de dépôt.
- **Non testé ici** (pas d'accès à ton Supabase) : déploiement réel des fonctions, connexion et double authentification de Supabase Auth, widget Turnstile, envoi d'e-mails. J'ai testé la logique et les règles de la base sur un vrai PostgreSQL embarqué, et le parcours complet du site contre une copie locale des fonctions (formulaire, jeton, dépôt de document par URL signée). Fais un essai complet en conditions réelles avant de couper l'ancien circuit.
- Le comptage « visiteurs / événements » (Umami) et le tableau de bord statistiques de l'ancienne administration ne sont pas encore dans la nouvelle.
