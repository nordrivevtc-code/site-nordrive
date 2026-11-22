# Documentation

## Par où commencer la relecture
1. `../README.md` : vue d'ensemble, structure, commandes.
2. `SECURITE_PHASE0.md` : ce qui a été corrigé en urgence et les actions à faire dans les consoles (Supabase, GitHub, Cloudinary…).
3. `../supabase/migrations/0001_secure_schema.sql` : la base (tables, rôles, règles d'accès, chiffrement des IBAN, audit).
4. `../supabase/tests/rls.test.ts` : ce que chaque rôle peut et ne peut pas faire.
5. `../supabase/functions/_shared/handlers.ts` : logique des formulaires (origine, anti-robot, limites, jetons, documents).
6. `../src/PublicApp.tsx` puis `../src/components/` : le site public.
7. `../apps/admin/src/` : l'administration (connexion + double authentification).
8. `../a-porter-phase2/README.md` : ce qui reste à reconstruire dans l'administration.

## Guides
| Fichier | Contenu |
|---|---|
| `SECURITE_PHASE0.md` | Urgence : verrouillage de la base, secrets à changer, GitHub, RGPD |
| `SECURITE_PHASE1.md` | Mise en service : base sécurisée, fonctions, administration, bascule du site |
| `MEMOIRE_PROJET.md` | Mémoire chronologique du projet (décisions, changements, état) |

## Règles de documentation
Tout changement notable est noté dans `MEMOIRE_PROJET.md` ; les consignes pour les assistants de code sont dans `../CLAUDE.md`.