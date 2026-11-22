# À porter en phase 2 (référence, non compilé)

Ce dossier contient l'**ancien CRM**. Il n'est ni compilé ni déployé : ses imports pointent vers l'ancienne structure.
Il sert de référence pour reconstruire les écrans dans `apps/admin`, branchés sur la base sécurisée (rôles, double authentification).

| Fichier | Rôle d'origine | À reconstruire sur |
|---|---|---|
| `crm/DriverCRM.tsx` | Liste et fiche des chauffeurs, pipeline, notes, import/export CSV | tables `drivers`, `activities`, `driver_documents` ; fonction `promote_application` |
| `crm/FleetEnrollment.tsx` | Rattachement Uber (invitation) et Bolt (lien à envoyer), boutons Copier, messages WhatsApp | table `platform_enrollments` |
| `crm/AccountingPayroll.tsx`, `crm/statementParsers.ts` | Paie hebdomadaire, import des relevés Uber/Bolt, export virements | table `payroll_weeks` ; fonctions `set_driver_iban` / `get_driver_iban` (IBAN chiffrés) |
| `crm/AudienceDashboard.tsx` | Statistiques du site et des inscrits | tableau de bord Umami + requêtes sur `applications` |
| `crm/Navbar.tsx` | Barre d'onglets de l'administration | structure de `apps/admin/src/App.tsx` |
| `crm/ApiIntegrationGuide.tsx` | Guide d'intégration Uber/Bolt | `docs/` |
| `crm/useLocalStorage.ts` | Stockage local de données | **à ne pas reprendre** : aucune donnée personnelle dans le navigateur |

Règles pour la reconstruction : aucune donnée en dur, aucune copie locale de données personnelles, tarifs et noms uniquement depuis la base, chaque action sensible passe par une fonction SQL ou serveur journalisée.