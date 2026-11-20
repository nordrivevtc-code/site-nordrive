# Sécurité — Phase 0 : urgence (guide pas à pas)

> Objectif : arrêter l'exposition des données de chauffeurs **aujourd'hui**, avant de reconstruire proprement (phases 1 à 3 du plan).
> Fais les étapes **dans l'ordre**. Ne passe pas à l'étape suivante tant que la vérification de l'étape en cours n'est pas bonne.
> Ce guide n'est pas un avis juridique : pour la partie RGPD (étape 8), fais-toi conseiller.

## Ce qui est déjà fait dans le code (cette version)
- Le site public **ne contient plus** l'ancienne administration (mot de passe en clair), ni les données d'exemple (e-mails/téléphones), ni la connexion à la base. Il ne peut donc plus rien lire.
- Les `console.log` qui affichaient des liens de documents et des réponses de formulaires sont supprimés.
- En-têtes de sécurité, vraie page 404 (`/admin` n'existe plus), `robots.txt` qui ne cite plus l'administration.
- Les vraies clés ont été retirées de `.env.example`, `CLAUDE.md` et `MEMOIRE_PROJET_SITE_NORDRIVE.md` (remplacées par des étiquettes).
- Script de verrouillage : `supabase/migrations/0000_phase0_lockdown.sql`. Script de contrôle : `scripts/verify-lockdown.mjs`.

**Ce que ça change pour toi en attendant la phase 1** : les inscriptions ne remplissent plus le CRM. Elles arrivent **par e-mail (Web3Forms) et par WhatsApp**, comme avant. L'ancien CRM et ses données d'exemple ont été supprimés du dépôt ; la nouvelle administration est dans `apps/admin` (phase 1).

---

## 1. Sauvegarder les données (avant de verrouiller)
1. Supabase → **Table Editor** → pour chaque table (`drivers`, `payroll_weeks`, `fleet_settings`, `sync_logs`, `platform_earnings_raw`) → **Export** (CSV) — ou dans **SQL Editor** : `select * from public.drivers;` puis télécharger en JSON/CSV.
2. Enregistre les fichiers sur un support **chiffré** (dossier protégé par mot de passe, clé USB chiffrée). Ils contiennent des IBAN : ne les envoie ni par e-mail ni par messagerie.
3. Vérifie que les fichiers s'ouvrent et que le nombre de lignes est cohérent.

## 2. Verrouiller la base
1. Supabase → **SQL Editor** → **New query**.
2. Copie tout le contenu de `supabase/migrations/0000_phase0_lockdown.sql`, colle, **Run**.
3. Le dernier tableau doit afficher **0** pour `policies_restantes`, `tables_sans_rls` et `tables_realtime_public`.
4. Vérifie avec la clé publique (PowerShell, dans le dossier du projet) :
   ```powershell
   $env:SUPABASE_URL = "https://<VOTRE-PROJET>.supabase.co"
   $env:SUPABASE_ANON_KEY = "<clé publique : Supabase > Project Settings > API > anon / publishable>"
   node scripts/verify-lockdown.mjs
   ```
   Tout doit afficher `OK`, puis « VERROUILLAGE CONFIRMÉ ».
   **Si une ligne affiche `FAILLE`, ne continue pas** : dis-le-moi avec la sortie complète.

## 3. Fonctions Supabase (Uber / Bolt)
Les fonctions `uber-auth`, `uber-sync`, `bolt-sync` acceptent la clé publique : n'importe qui peut les appeler.
1. Supabase → **Edge Functions** → **supprime ou désactive** chacune des trois.
2. Elles seront réécrites dans le dépôt avec vérification d'un administrateur connecté (phase 2).
3. **Change les identifiants Uber et Bolt** enregistrés dans l'ancien écran « Paramètres API » (ils ont transité par le navigateur) : nouveau secret côté Uber for Business / Bolt, révoque l'ancien.

## 4. Changer les secrets exposés
| Quoi | Où | Action |
|---|---|---|
| Mot de passe de l'ancien admin | partout où tu l'as réutilisé | Le changer **partout** (considère-le comme public). L'ancienne porte d'accès n'existe plus. |
| Clé Web3Forms | tableau de bord Web3Forms | Régénérer la clé, activer la restriction de domaine si ton offre la propose. Donne-moi la nouvelle clé (elle est publique par nature) : je la remplace dans le code. |
| Cloudinary | Settings → Upload → Upload presets | Passer le preset utilisé de « Unsigned » à **Signed**, ou le désactiver. Les envois de documents depuis le site seront alors refusés : le formulaire continue de fonctionner et demande les pièces sur WhatsApp. |
| Fichiers déjà envoyés sur Cloudinary | Media Library | Noter la liste ; ils seront rapatriés puis supprimés à la phase 2. Rends les dossiers sensibles privés/authentifiés si l'offre le permet. |
| Mot de passe de la base Supabase | Project Settings → Database | Le régénérer. |
| Clés Supabase | Project Settings → API | La clé publique n'est pas secrète, mais n'a de sens qu'avec la RLS (étape 2). Régénère le secret JWT **seulement** si les journaux (étape 8) montrent des accès suspects : cela invalide toutes les clés (la publique, à remplacer dans le code, et la clé serveur). |
| Comptes (GitHub, Supabase, OVH, Cloudinary, Web3Forms, Gmail `nordrivevtc@…`) | chacun | Activer la **double authentification** partout. |

## 5. GitHub
1. Dépôt → **Settings** → **General** → vérifie que la visibilité est **Private**. Si elle était **Public**, tout ce qui figure dans l'historique (mot de passe, clés, données d'exemple) est à considérer comme diffusé.
2. **Settings → Code security** : active *Secret scanning*, *Push protection* et *Dependabot alerts*.
3. **Settings → Branches** : protège `main` (pull request obligatoire, pas de force-push).
4. **Settings → Collaborators** : retire toute personne ou application qui n'a pas besoin d'accès.
5. Attention : `git push` sur `main` peut déclencher un déploiement automatique (Vercel, d'après `CLAUDE.md`). Vérifie ce qui est connecté avant de pousser.

## 6. Historique git (facultatif, après l'étape 4)
Le mot de passe admin, les données d'exemple et les anciennes clés restent dans l'historique. Une fois les secrets changés, tu peux les effacer (sauvegarde d'abord le dépôt) :
```powershell
pip install git-filter-repo
git filter-repo --path src/data/mockData.ts --path src/components/AdminLogin.tsx --invert-paths
git push --force-with-lease origin --all   # réécrit l'historique : prévenir toutes les personnes qui ont une copie
```
À faire en priorité si le dépôt a été public ou partagé. Sinon, le changement des secrets suffit.

## 7. Mettre en ligne le nouveau site (et retirer l'ancien)
1. `npm run build` puis envoie **tout le contenu de `dist/`** sur OVH en **supprimant d'abord les anciens fichiers** (l'ancien site contient l'ancienne administration).
2. Vérifie que `.htaccess` est bien envoyé (FileZilla : *Serveur → Forcer l'affichage des fichiers cachés*).
3. **Supprime l'ancienne archive** `C:\Users\Klaip\Documents\nordrive-ovh-upload.zip` si elle date d'avant cette version, ainsi que toute copie de l'ancien build.
4. Contrôle sur le vrai site : `https://nordrive-flotte.com/admin` doit afficher **« Page introuvable »** ; `https://securityheaders.com` doit donner au moins un B ; la console du navigateur ne doit montrer aucune violation CSP.
5. Si le site est aussi servi par Vercel, vérifie que l'ancien déploiement est remplacé ou supprimé.

## 8. Enquête et RGPD (à ne pas sauter)
Des données personnelles réelles (noms, téléphones, e-mails, IBAN, documents) ont pu être lisibles par n'importe qui. Il faut **évaluer** si des données ont été consultées.
1. **Journaux Supabase** → *Logs* → *API Edge Logs* / *Postgres Logs* : cherche des requêtes sur `drivers` et `payroll_weeks` depuis des adresses inconnues, des volumes anormaux, des suppressions. Note les dates.
2. **Journaux Cloudinary** (rapports d'usage) : téléchargements massifs ou dépôts de fichiers inconnus.
3. Ouvre un **registre des violations** (date de découverte, description, données concernées, nombre de personnes, mesures prises, conclusions).
4. Si un risque pour les personnes est possible, la **notification à la CNIL est à faire dans les 72 h** après en avoir eu connaissance (cnil.fr → « Notifier une violation de données personnelles »), et une **information des chauffeurs** peut être obligatoire si le risque est élevé. **Fais-toi conseiller** (juriste, CNIL) : c'est toi qui es responsable de traitement.

## 9. Contrôle final
- [ ] Sauvegarde des tables faite et stockée de façon chiffrée
- [ ] `verify-lockdown.mjs` : « VERROUILLAGE CONFIRMÉ »
- [ ] Fonctions `uber-auth`, `uber-sync`, `bolt-sync` supprimées ou désactivées ; identifiants Uber/Bolt changés
- [ ] Mots de passe et clés changés ; double authentification sur tous les comptes
- [ ] Dépôt GitHub privé, secret scanning actif, `main` protégé
- [ ] Nouveau site en ligne, ancien site et ancienne archive supprimés
- [ ] `/admin` renvoie une page 404 ; en-têtes de sécurité présents
- [ ] Journaux vérifiés, registre des violations ouvert, avis RGPD demandé

Quand tout est coché : on passe à la **phase 1** (Supabase Auth + MFA + rôles, fonctions serveur pour les formulaires, documents privés).
