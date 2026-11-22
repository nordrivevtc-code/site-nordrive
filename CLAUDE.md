# Nordrive — consignes du projet

Site public + administration de la flotte VTC **Nordrive** (rattachement Uber, Bolt, Heetch). Dirigeants : Aimen et Rayen.
Vue d'ensemble : `README.md`. Mémoire chronologique : `docs/MEMOIRE_PROJET.md`. Guides sécurité : `docs/SECURITE_PHASE0.md`, `docs/SECURITE_PHASE1.md`.

## Commandes
```bash
npm install
npm run dev          # site public (5173)         npm run dev:admin   # administration (5175)
npm run dev:api      # fonctions serveur simulées  npm run check       # tsc + 58 tests : avant chaque envoi
npm run build        # dist/ (+ pré-rendu)         npm run build:admin # dist-admin/
```

## Structure
`src/` site public (seul code déployé) · `public/` fichiers statiques et `.htaccess` · `scripts/` pré-rendu, aperçu, API de test ·
`supabase/` migrations, fonctions serveur, tests d'accès · `apps/admin/` administration · `docs/` guides ·
`a-porter-phase2/` ancien CRM (référence, non compilé) · `assets-archive/` visuels non utilisés.

## Règles de sécurité (non négociables)
1. **Aucune donnée personnelle dans le code, les tests, les docs ou l'historique** (noms, e-mails, téléphones, IBAN, plaques, SIREN de chauffeurs). Les exemples utilisent des valeurs évidemment fictives (Jean Dupont, 06 12 34 56 78).
2. **Aucun secret dans le dépôt** : valeurs réelles dans `.env.local` (ignoré) ou dans les secrets Supabase. `.env.example` ne contient que des étiquettes.
3. **Le site public ne lit jamais la base.** Il n'envoie que des formulaires, par les fonctions `supabase/functions`.
4. La base n'accorde aucun droit à `anon`. Chaque table a des règles d'accès par rôle exigeant la double authentification. Toute modification de règle s'accompagne d'un test dans `supabase/tests/rls.test.ts`.
5. Aucune administration, mot de passe ou donnée dans le build public. Vérifier `dist/` avant tout envoi.
6. Lancer `npm run check` avant de commiter ; ne pas pousser sur `main` sans que les tests passent.

## Charte graphique
Fond ardoise / midnight (`#0b1119` à `#121c28`), or champagne (`#e5c158`, dégradé `#fbe5a9` → `#e5c158` → `#b88514`), vert WhatsApp (`#25d366`). Rythme : bandes sombres et claires en alternance. Pas de photo détourée. Styles de l'accueil et des sous-pages : `src/components/home.css` (préfixe `.nh-`).

## Coordonnées officielles
WhatsApp : 07 43 76 74 00 (`https://wa.me/33743767400`) · Domaine : `https://nordrive-flotte.com/` · Contact : `nordrivevtc@gmail.com`.

## Formulaires
- Circuit sécurisé (fonctions Supabase) actif si `VITE_API_URL` est défini ; sinon ancien circuit (Web3Forms/Cloudinary) à retirer après bascule (`src/lib/api.ts`, `PublicPortal.tsx`).
- Rattachement express : 4 champs visibles ; parrainage : jusqu'à 200 € ; documents facultatifs au premier envoi.

## SEO et mesure
Pages pré-rendues (`scripts/prerender.mjs`, routes lues dans `public/sitemap.xml` ; ajouter une page = la déclarer dans le sitemap **et** dans `src/lib/seo.ts`). Un seul H1 par page. Mesure d'audience sans cookie (Umami ou Plausible) activée par variables d'environnement.

## Mémoire du projet
Tout changement notable est noté dans `docs/MEMOIRE_PROJET.md`.