# Nordrive — site de rattachement VTC

Site public (React + Vite, pages pré-rendues) et administration sécurisée (Supabase) de la flotte Nordrive.
Site : https://nordrive-flotte.com

## Pour commencer
```bash
npm install
npm run dev        # site public sur http://localhost:5173
npm run check      # compilation + tous les tests (à lancer avant chaque envoi)
```
Node 22 ou plus récent. Les variables d'environnement se mettent dans `.env.local` (voir `.env.example`) ; ce fichier n'est jamais versionné.

## Structure
```
src/                Site public : seul code déployé sur nordrive-flotte.com
  main.tsx            point d'entrée (nettoyage, mesure d'audience, rendu)
  PublicApp.tsx       application publique (aucun accès à la base)
  components/         HomePage, SubPages (pages du site), PublicPortal (menu, formulaires, logique d'envoi)
  lib/                seo, analytics, acquisition, api (appels aux fonctions serveur), legacyCleanup
  types/fleet.ts      types de données
public/             Fichiers servis tels quels : .htaccess (en-têtes de sécurité), robots.txt, sitemap.xml, llms.txt, icônes
scripts/            Pré-rendu des pages, serveur d'aperçu, API de test locale, vérification du verrouillage de la base
supabase/           migrations/ (base sécurisée), functions/ (fonctions serveur), tests/ (règles d'accès)
apps/admin/         Administration sécurisée (connexion + double authentification), déployée à part
docs/               Guides de sécurité et mémoire du projet (commencer par docs/README.md)
a-porter-phase2/    Ancien CRM, conservé comme référence pour la phase 2 (non compilé, non déployé)
assets-archive/     Logos et images non utilisés par le site (hors du site déployé)
```

## Commandes
| Commande | Rôle |
|---|---|
| `npm run dev` | Site public en développement |
| `npm run dev:admin` | Administration en développement (port 5175) |
| `npm run dev:api` | Fonctions serveur simulées en mémoire (test des formulaires sans Supabase) |
| `npm test` | 58 tests : règles d'accès de la base, fonctions serveur, nettoyage |
| `npm run check` | Compilation TypeScript + tests |
| `npm run build` | Site de production dans `dist/` (+ pré-rendu de chaque page) |
| `npm run build:admin` | Administration dans `dist-admin/` |
| `npm run serve:dist` | Sert `dist/` comme OVH (mêmes en-têtes, vraie page 404) |
| `npm run lint` | Analyse du code (oxlint) |

## Sécurité (à lire avant de déployer)
- Le site public **ne lit jamais la base** : les formulaires passent par des fonctions serveur (`supabase/functions`).
- La base n'accorde **aucun droit** à la clé publique ; chaque rôle ne voit que ce qui le concerne, et seulement avec la double authentification.
- **Aucune donnée personnelle ni secret dans le code ou l'historique.** Les valeurs réelles vivent dans les variables d'environnement et les secrets Supabase.
- Guides : `docs/SECURITE_PHASE0.md` (urgence) puis `docs/SECURITE_PHASE1.md` (mise en service).

## Déploiement
- **Site** : `npm run build`, puis envoi du contenu de `dist/` sur l'hébergement (OVH ; `public/.htaccess` applique les protections). `vercel.json` reprend les mêmes en-têtes si Vercel est utilisé.
- **Administration** : `npm run build:admin`, puis envoi de `dist-admin/` sur un sous-domaine séparé.
- **Base et fonctions** : voir `docs/SECURITE_PHASE1.md`.