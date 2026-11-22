# MÉMOIRE DU PROJET — SITE WEB NORDRIVE VTC (`app-site-nordrive`)
> **Note (réorganisation)** : l'ancien CRM est maintenant dans -porter-phase2/ (référence, non compilé) ; src/ ne contient plus que le site public. Les chemins ci-dessous ont été mis à jour. Les consignes pour les assistants de code sont dans CLAUDE.md.


> **Ce fichier est la mémoire vivante et opérationnelle permanente du site internet Nordrive VTC.**  
> Tout agent Antigravity, Gemini ou développeur qui ouvre ce dossier (sur PC, Mac ou Linux) doit lire et appliquer rigoureusement les directives ci-dessous.  
> **RÈGLE D'OR :** À chaque fois que l'utilisateur apporte une modification, soulève une objection ou ajoute une fonctionnalité au site, mets à jour automatiquement ce fichier, ainsi que `AGENTS.md` et `GEMINI.md`.

---

## 1. Contexte & Identité de la Marque
- **Entreprise** : Flotte VTC Nordrive (Dirigée par Aimen & Rayen).
- **Activité** : Gestionnaire de flotte VTC et rattacheur officiel agréé pour **Uber**, **Bolt** et **Heetch**.
- **Site Officiel** : `https://nordrive-flotte.com/`
- **Contact WhatsApp Direct** : `07 43 76 74 00` (Lien direct : `https://wa.me/33743767400`).
- **Objectif du Site** : Capter de nouveaux chauffeurs VTC et convaincre les anciens chauffeurs indépendants ou insatisfaits de leur flotte actuelle de se rattacher à Nordrive grâce à des conditions imbattables.

---

## 2. Direction Artistique (DA) & Charte Graphique
Le design est directement calqué sur le **flyer officiel Nordrive VTC**, avec une finition haut de gamme, sobre, épurée et professionnelle (sans surcharge visuelle) :
- **Fond du site** : Dégradé studio sombre ardoise titane / midnight profond (`#0B1119` à `#121C28`) avec halo satiné et rétro-éclairage saphir discret (`src/components/Background3D.tsx`).
- **Or Champagne Métallique Raffiné** (`#E5C158`, dégradé `linear-gradient(135deg, #FBE5A9 0%, #E5C158 50%, #B88514 100%)`) : Utilisé pour les titres phares, les bordures de cartes d'honneur et les boutons d'action clés.
- **Vert Émeraude WhatsApp** (`#25D366`) : Utilisé pour les badges et le bouton d'appel à l'action WhatsApp instantané.
- **Pas de photos bitmap détourées disgracieuses** : Le design privilégie des cartes modernes sculptées avec ombres douces et bordures fines (`rgba(229, 193, 88, 0.25)`).

---

## 3. Les 5 Arguments Massue Mis en Avant sur le Site
1. **50 €* / Semaine SI VOUS TRAVAILLEZ • 0 € SI VOUS ÊTES EN REPOS / VACANCES** :
   Le seul modèle 100 % équitable du marché. Les concurrents facturent 70 € à 100 € fixe toutes les semaines, même en arrêt ou en vacances. Chez Nordrive, 0 course = 0 € prélevé.
2. **Véhicules de plus de 12 ans acceptés** :
   Grâce à la licence transporteur Nordrive, les chauffeurs peuvent rentabiliser des véhicules plus anciens et économiques, alors qu'Uber direct interdit les véhicules de plus de 6-7 ans.
3. **Macaron VTC délivré en moins d'1 heure** :
   Validation et activation express pour commencer à rouler et encaisser le jour même.
4. **100 % du Chiffre d'Affaires conservé (0 % de commission)** :
   Toutes les courses nettes Uber, Bolt et Heetch reviennent au chauffeur. Virements automatiques chaque lundi matin par SEPA Qonto.
5. **Prime de Parrainage allant jusqu'à 200 € Cash** :
   Chaque chauffeur qui recommande un confrère touche jusqu'à 200 € dès la première semaine validée du filleul.

---

## 4. Parcours Utilisateur & Ergonomie Épurée

### A. Le Hero Section (Accueil)
- Capsule officielle : `FLOTTE AGRÉÉE • UBER, BOLT, HEETCH`.
- Titre sculpté en dégradé or : `Votre Rattachement VTC en toute sérénité`.
- Action Hub immédiat : 
  - Bouton 1 : `WhatsApp Direct (07 43 76 74 00)` (Lien `https://wa.me/33743767400`).
  - Bouton 2 : `Formulaire Express (2 min)` (Ancre `#formulaire`).
- 3 Cartes Piliers : `50€* / SEMAINE`, `Véhicules +12 ans acceptés`, `Macaron VTC < 1h`.

### B. Le Formulaire de Rattachement Express (`#formulaire`)
- Conçu pour être rempli en **15 secondes** chrono par un chauffeur sur son mobile :
  - **4 champs visibles indispensables** : Nom complet, Téléphone WhatsApp, Ville, Statut Carte VTC.
  - **Accordéon pliable facultatif** (`showExtendedDocs`) : Permet d'ajouter carte grise, permis ou RIB immédiatement ou plus tard sans bloquer l'envoi.

### C. La Page Parrainage (`/parrainage`)
- Parcours allégé et incitatif à 4 champs :
  - Parrain : Votre Nom + Votre Téléphone (pour virer les 200 €).
  - Filleul : Nom de votre ami + Son Téléphone WhatsApp.
  - 1 Bouton Gold : `🎁 Enregistrer le Parrainage (Prime 200€) →`.
  - 1 Bouton direct viral : `📲 Partager directement l'invitation sur WhatsApp` (ouvre WhatsApp avec un message d'invitation pré-rempli).

---

## 5. Intégrations Techniques & APIs
- **Notifications E-mail** : Service Web3Forms (`access_key: <CLE_WEB3FORMS>`).
- **Hébergement des Documents Chauffeurs** : Cloudinary (Cloud name : `<CLOUD_NAME_CLOUDINARY>`, Preset non signé : `<PRESET_CLOUDINARY>`).
- **WhatsApp API** : Ouverture automatique avec message pré-rempli et numérotation internationale `+33743767400`.
- **SEO & Référencement Google** :
  - Title : `Nordrive VTC | Gestionnaire de Flotte & Rattacheur VTC Agréé Uber, Bolt, Heetch`
  - Meta description optimisée pour le taux de clic (CTR).
  - Micro-données Schema.org intégrées : `AutomotiveBusiness` et `FAQPage`.

---

## 6. Commandes & Déploiement
- Installation : `npm install`
- Lancement local : `npm run dev` (Port par défaut : `http://127.0.0.1:5173`)
- Build de production : `npm run build` (Vite + TypeScript)
- Déploiement Vercel : configuré via `vercel.json`.


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
- Composant `a-porter-phase2/crm/FleetEnrollment.tsx`, affiché en haut de la fiche chauffeur (`DriverCRM.tsx`). Processus réel de Nordrive : **Uber Fleet** = prénom, nom, e-mail, téléphone (Uber invite le chauffeur automatiquement) ; **Bolt Fleet** = e-mail et téléphone, puis Bolt génère un lien à copier et envoyer au chauffeur.
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