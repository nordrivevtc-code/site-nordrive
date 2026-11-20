# NORDRIVE VTC — SITE INTERNET & PORTAIL CHAUFFEURS (`app-site-nordrive`)

> **Instructions directes pour Claude Code, Claude Desktop et Antigravity.**  
> Ce dépôt contient l'application web officielle et le portail de recrutement de chauffeurs pour **Nordrive VTC** (Gestionnaire de flotte agréé Uber, Bolt, Heetch).

---

## 🚀 Commandes Essentielles
```bash
# Installation des dépendances
npm install

# Démarrer le serveur de développement local
npm run dev

# Compiler et vérifier TypeScript + build Vite
npm run build
```

---

## 🎨 Charte Graphique & Direction Artistique (DA Flyer Officiel)
Le design du site reproduit fidèlement le style du flyer officiel Nordrive :
- **Fond du site** : Dégradé studio sombre ardoise titane / midnight profond (`#0B1119` à `#121C28`) avec halo satiné et rétro-éclairage saphir (`src/components/Background3D.tsx`).
- **Or Champagne Métallique Raffiné** (`#E5C158`, accents `#FBE5A9` / `#B88514`) : Titres principaux, badges d'honneur, cartes piliers et boutons majeurs.
- **Vert Émeraude WhatsApp** (`#25D366`) : Boutons et bannières de contact WhatsApp.
- **Règle Visuelle Stricte** : Aucune photo bitmap découpée au milieu du site. Le rendu doit rester ultra-propre, vectoriel, épuré et moderne.

---

## 📱 Coordonnées Officielles Intouchables
- **Téléphone WhatsApp Flotte** : `07 43 76 74 00`
- **Lien WhatsApp Direct** : `https://wa.me/33743767400`
- **Domaine Officiel** : `https://nordrive-flotte.com/`
- **Dirigeants** : Aimen & Rayen

---

## 🔑 Services Tiers & Identifiants Préconfigurés
1. **Web3Forms (Formulaires E-mail)** :
   - `access_key` : `<CLE_WEB3FORMS>`
   - Utilisé pour le formulaire contact, devis assurance et récapitulatif chauffeur.
2. **Cloudinary (Stockage Documents Chauffeurs)** :
   - Endpoint : `https://api.cloudinary.com/v1_1/<CLOUD_NAME_CLOUDINARY>/auto/upload`
   - Cloud Name : `<CLOUD_NAME_CLOUDINARY>`
   - Upload Preset : `<PRESET_CLOUDINARY>`
3. **Supabase (Optionnel / Fallback Données)** :
   - URL : `https://<VOTRE-PROJET>.supabase.co`
   - Anon Key : `<CLE_PUBLIQUE_SUPABASE>`
   *(Si indisponible, l'application fonctionne à 100% en fallback localStorage sans crash).*

---

## 🚢 Hébergement & Déploiement (Vercel)
- **Plateforme** : Vercel (connecté au dépôt GitHub `waramywaramydmz/app-site-nordrive`).
- **Configuration** : `vercel.json` est présent à la racine.
- **Commande de Build** : `npm run build`
- **Dossier de sortie (Output)** : `dist`
- **Déploiement Automatique** : Tout `git push` sur la branche `main` déclenche le redéploiement automatique sur le domaine de production `nordrive-flotte.com`.
- **Déploiement Manuel CLI** (si Vercel CLI est installé) :
  ```bash
  npx vercel --prod
  ```

---

## 💡 Principes Ergonomiques Clés
1. **Rattachement Express (15 secondes)** : Formulaire allégé à 4 champs visibles (Nom, Tél WhatsApp, Ville, Carte VTC). Tous les documents lourds sont dans l'accordéon pliable facultatif (`showExtendedDocs`) pour maximiser la conversion mobile.
2. **Parrainage 200€ Viral (`/parrainage`)** : Réduit à 4 champs simples (Nom/Tél Parrain + Nom/Tél Filleul) avec bouton de partage direct pré-rempli sur WhatsApp.
3. **Mémoire Permanente** : Tout changement doit être documenté dans `MEMOIRE_PROJET_SITE_NORDRIVE.md`, `AGENTS.md` et `CLAUDE.md`.


## 7. Refonte UX (novembre 2026)
- **Fond du site** : `Background3D.tsx` est désormais 100 % CSS (plus de canvas animé). L'ancien canvas plantait toute l'app (page blanche) quand la hauteur de fenêtre valait 0 et consommait du CPU sur mobile.
- **Menu** : 5 liens fonctionnels (Comment ça marche, Comparatif, Assurance VTC, Parrainage 200€, FAQ) définis une seule fois dans `navLinks` (`PublicPortal.tsx`). Simulateur, Qui sommes-nous et Contact restent dans le menu mobile. Hamburger sous 1180 px. En-tête avec fond flouté au défilement. Les anciens liens `#calcul` et `#formules` pointaient vers des ancres inexistantes.
- **Parrainage (`/parrainage`)** : 3 étapes visibles, bouton « Envoyer l'invitation sur WhatsApp » en action principale, puis formulaire à 4 champs (nom/tél parrain, nom/tél filleul). Numéros validés, refus si parrain et filleul ont le même numéro, bouton « Parrainer un autre ami » après envoi.
- **Rattachement (`#formulaire`)** : bandeau des 3 étapes au-dessus du formulaire, champs avec `autoComplete`/`inputMode`/validation téléphone. Les documents « requis » se limitent aux 4 réellement proposés (Carte VTC recto/verso, RC circulation, Carte grise) : le mémo d'assurance n'avait aucun champ d'upload et bloquait le message « tous les documents transmis ».
- **Bug CRM corrigé** (`App.tsx`) : le dédoublonnage comparait aussi les e-mails vides, ce qui fusionnait deux chauffeurs sans e-mail. L'e-mail n'est comparé que s'il est renseigné.
- **Performance** : écrans admin (CRM, comptabilité, API) chargés à la demande via `React.lazy` (bundle public 881 Ko → 636 Ko).
- **Marges des sous-pages** : suppression des 120 à 180 px de marge haute inutiles.
- **À automatiser plus tard** : parrainage et rattachement passent encore par e-mail Web3Forms + message WhatsApp pré-rempli.
## 8. Nouvelle page d'accueil (novembre 2026)
- L'accueil est désormais le composant `src/components/HomePage.tsx` avec ses styles `src/components/home.css` (classes `.nh-`). `PublicPortal.tsx` ne porte plus que la logique (formulaire, envoi, autres pages) et lui passe le formulaire, la FAQ et les fonctions de navigation.
- Structure (simplifiée, 4 blocs) : hero sombre centré (promesse + bouton + 3 chiffres 50 € / 0 % / 1 h), bande claire (3 avantages + simulateur de gains à curseur), formulaire de rattachement sombre avec les 3 étapes, FAQ claire (4 questions). Rythme sombre / clair / sombre / clair.
- Le formulaire de rattachement reprend l'or de la marque (bouton, case RGPD) et un en-tête allégé.
- Non repris de l'ancien site en ligne : avis chauffeurs (à n'ajouter que s'ils sont réels) et FreeNow (à confirmer).
## 9. SEO et visibilité dans les IA (novembre 2026)
- **Pré-rendu** : `npm run build` génère ensuite un HTML complet par page (`dist/index.html`, `dist/faq.html`, ...) via `scripts/prerender.mjs` (Chrome ou Edge sans fenêtre, `puppeteer-core`). Les pages viennent de `public/sitemap.xml` : pour en ajouter une, la déclarer dans le sitemap ET dans `src/lib/seo.ts`. `npm run build:fast` compile sans pré-rendu ; `npm run serve:dist` sert `dist/` comme OVH.
- **Balises par page** : `src/lib/seo.ts` (`applySeo`) gère titre, description, canonique, Open Graph, Twitter et JSON-LD (WebPage, WebSite, BreadcrumbList, FAQPage, Service). La FAQ statique de `index.html` a été retirée (elle apparaissait sur toutes les pages). Un seul H1 par page.
- **Robots** : `public/robots.txt` autorise explicitement les robots IA (OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot...) ; `public/llms.txt` résume le site.
- **Hébergement** : `public/.htaccess` sert `/page` via `page.html` sans redirection, active la compression et le cache. `vercel.json` : `cleanUrls`.
- **Vitesse** : polices Google en `<link>` avec préconnexion (Playfair Display, inutilisée, retirée).
- **À fournir / décider** : SIREN, raison sociale et adresse (pour les données d'entreprise) ; vérifier les mentions « agréé par le Ministère », « partenaire officiel Uber/Bolt/Heetch » avant de les mettre en avant.
## 10. Design des sous-pages et mesure d'audience (novembre 2026)
- **Design unifié** : toutes les pages (comparatif, assurance, simulateur, parrainage, qui sommes-nous, FAQ, contact) suivent la charte de l'accueil : bandeau sombre avec titre doré, contenu sur bande claire, bloc d'action sombre. Composants dans `src/components/SubPages.tsx`, styles `.nh-` dans `home.css`. La logique d'envoi des formulaires reste dans `PublicPortal.tsx` (le formulaire d'assurance y est conservé : `renderInsuranceForm`).
- **Mesure d'audience** (`src/lib/analytics.ts`) : Umami ou Plausible, sans cookie, activée seulement si `VITE_UMAMI_WEBSITE_ID` ou `VITE_PLAUSIBLE_DOMAIN` est défini. Désactivée en développement, dans l'admin, pour le pré-rendu et pour les navigateurs de l'équipe (`?notrack=1`). Événements : Formulaire vu / démarré / envoyé, Clic WhatsApp, Clic rejoindre, Clic téléphone, Parrainage envoyé, Message contact envoyé, Devis assurance envoyé, Simulateur utilisé. Aucune donnée personnelle n'est envoyée.
- **Provenance des inscrits** (`src/lib/acquisition.ts`) : source (Google, ChatGPT, WhatsApp, Direct…) gardée en mémoire à l'arrivée, enregistrée dans `Driver.source` et dans l'e-mail d'inscription. Liens de campagne : `https://nordrive-flotte.com/?utm_source=whatsapp&utm_medium=groupe`.
- **Tableau de bord** : onglet admin « Statistiques » (`AudienceDashboard.tsx`) : inscrits, courbe 30 jours, sources, parcours CRM, villes, et le tableau de bord de l'outil de mesure intégré via `VITE_ANALYTICS_DASHBOARD_URL`.
- **À compléter côté Plausible** : déclarer chaque événement ci-dessus comme « Goal » du même nom. Mentionner l'outil de mesure dans la politique de confidentialité.
## 11. Rattachement Uber & Bolt dans le CRM (novembre 2026)
- Composant `src/components/FleetEnrollment.tsx`, affiché en haut de la fiche chauffeur (`DriverCRM.tsx`). Processus réel de Nordrive : **Uber Fleet** = prénom, nom, e-mail, téléphone (Uber invite le chauffeur automatiquement) ; **Bolt Fleet** = e-mail et téléphone, puis Bolt génère un lien à copier et envoyer au chauffeur.
- Chaque valeur a un bouton « Copier ». Le lien Bolt se colle dans un champ (validé) puis part sur WhatsApp en un clic, avec message prêt. « Prévenir le chauffeur » (Uber), « Demander l'e-mail » si absent, « Corriger » les informations.
- Suivi dans `Driver.platformEnrollment` (date d'envoi Uber / lien Bolt) et journal d'activité. **Rien n'est automatique** : chaque envoi est un clic de Nordrive (contrôle humain). Pas d'API Uber/Bolt publique d'invitation trouvée (à demander aux contacts Uber et Bolt).
- Adresses des portails Uber/Bolt Fleet : à saisir une fois dans « Liens de mes portails » (stockées dans le navigateur de l'admin).
- Correctif : le bouton WhatsApp du CRM utilisait `06…` au lieu de `336…` (`toWhatsAppNumber`).
## 12. Sécurité — Phase 0 (novembre 2026)
Voir `docs/SECURITE_PHASE0.md` (guide pas à pas) et le plan complet (phases 1 à 3 : Supabase Auth + MFA + rôles, fonctions serveur, documents privés, CI/CD).
- **Site public = `src/PublicApp.tsx`** : n'importe ni le CRM, ni la connexion admin, ni `mockData`, ni le client Supabase. L'ancienne administration (connexion en dur, données d'exemple, client de base ouvert au public) a été **supprimée** du dépôt ; elle est remplacée par `apps/admin`. Aucune donnée de chauffeur ne doit figurer dans le code : le site efface aussi, chez les visiteurs qui reviennent, les anciennes copies locales (`src/lib/legacyCleanup.ts`).
- Les inscriptions n'alimentent plus le CRM : elles arrivent par e-mail (Web3Forms) et WhatsApp, en attendant les fonctions serveur (phase 1).
- `supabase/migrations/0000_phase0_lockdown.sql` verrouille la base ; `scripts/verify-lockdown.mjs` le contrôle avec la clé publique.
- `public/.htaccess` : en-têtes de sécurité (CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP), vraie 404 (`404.html` pré-rendue). `scripts/serve-dist.mjs` reproduit ces règles en local.
- Aucun secret dans le dépôt : les vraies valeurs vont dans des variables d'environnement / un gestionnaire de mots de passe, jamais dans `.env.example` ni les fichiers `.md`.
## 13. Sécurité — Phase 1 (novembre 2026)
Guide de mise en service : `docs/SECURITE_PHASE1.md`.
- **Base** : `supabase/migrations/0001_secure_schema.sql` (tables typées, rôles `owner/manager/advisor/accountant`, RLS exigeant la MFA `aal2`, IBAN chiffrés via Vault, audit en ajout seul, `rate_limit_hit`). Les anciennes tables deviennent `legacy_*`.
- **Fonctions serveur** (`supabase/functions`) : logique testable dans `_shared/handlers.ts` (ports injectés), raccordement Supabase dans `_shared/supabase.ts`. Publiques : `submit-application|contact|referral|insurance`, `request-upload-url` (origine autorisée, Turnstile, limites, validation Zod, jeton de dépôt haché, URL signée vers stockage privé). Admin : `document-url` (JWT + RPC `request_document_access` journalisée).
- **Site** : `src/lib/api.ts` ; circuit sécurisé actif seulement si `VITE_API_URL` est défini, sinon ancien circuit (Web3Forms/Cloudinary) — à retirer après validation.
- **Administration** : `apps/admin` (build `npm run build:admin` → `dist-admin/`, sous-domaine séparé), Supabase Auth + TOTP obligatoire. Reste à porter en phase 2 : chauffeurs, paie, IBAN, statistiques, rattachement Uber/Bolt.
- **Tests** : `npm test` (55 tests : `supabase/tests/rls.test.ts` sur PGlite, `handlers.test.ts`). `npm run dev:api` lance les vraies fonctions en mémoire pour tester le site en local.