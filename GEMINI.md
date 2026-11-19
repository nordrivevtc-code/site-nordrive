# FLEET OS — SITE WEB NORDRIVE VTC (`app-site-nordrive`)

> **Mémoire opérationnelle pour tout agent travaillant sur le site web Nordrive VTC.**  
> Ce dépôt est dédié à 100% au site vitrine et au portail chauffeur de Nordrive VTC.

---

## 1. Règles d'Or du Projet
1. **Charte Graphique du Flyer** : Respecter scrupuleusement la palette ardoise titane / midnight sombre (`#0B1119` à `#121C28`), les accents or champagne (`#E5C158`) et vert émeraude WhatsApp (`#25D366`).
2. **Coordonnées Intouchables** :
   - Numéro WhatsApp : `07 43 76 74 00`
   - Lien WhatsApp : `https://wa.me/33743767400`
   - Domaine : `https://nordrive-flotte.com/`
3. **Ergonomie Mobile-First** : Ne jamais compliquer les formulaires. L'inscription doit pouvoir se faire en 15 secondes chrono avec 4 champs essentiels.
4. **Mise à Jour Systématique de la Mémoire** : Tout ajout de page, modification de composant ou retour utilisateur doit être documenté dans `MEMOIRE_PROJET_SITE_NORDRIVE.md`, `AGENTS.md` et `GEMINI.md`.

---

## 2. Commandes Utiles
```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement local
npm run dev

# Tester la compilation TypeScript et le build Vite
npm run build
```


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