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
   - `access_key` : `7dc10224-3e56-4c49-850d-cb01c1e52a5e`
   - Utilisé pour le formulaire contact, devis assurance et récapitulatif chauffeur.
2. **Cloudinary (Stockage Documents Chauffeurs)** :
   - Endpoint : `https://api.cloudinary.com/v1_1/rabmjbbf/auto/upload`
   - Cloud Name : `rabmjbbf`
   - Upload Preset : `nordrive_docs`
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
