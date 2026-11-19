# MÉMOIRE DU PROJET — SITE WEB NORDRIVE VTC (`app-site-nordrive`)

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
- **Notifications E-mail** : Service Web3Forms (`access_key: 7dc10224-3e56-4c49-850d-cb01c1e52a5e`).
- **Hébergement des Documents Chauffeurs** : Cloudinary (Cloud name : `rabmjbbf`, Preset non signé : `nordrive_docs`).
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