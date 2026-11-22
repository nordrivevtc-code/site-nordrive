# Assistant de discussion (chatbot)

Bulle « Une question ? » en bas à droite du site. Elle appelle `POST /api/chat`, une fonction serveur Vercel
([api/chat.ts](../api/chat.ts)) qui interroge Claude. La clé n'est jamais dans le navigateur ni dans le dépôt.

## Mise en route (une seule fois, dans Vercel)
1. Créer une clé sur console.anthropic.com (compte à toi) et **fixer une limite de dépense mensuelle** (Settings > Limits).
2. Vercel > projet `nordrive-vtc` > Settings > Environment Variables : ajouter `ANTHROPIC_API_KEY` (Production), puis **Redeploy**.
3. Sans cette variable, la bulle répond « pas encore activé » et renvoie vers WhatsApp : rien ne casse.

Variables facultatives : `CHAT_MODEL` (défaut `claude-opus-5-5` ; `claude-haiku-5-5` coûte beaucoup moins cher),
`CHAT_ALLOWED_HOSTS` (hôtes supplémentaires autorisés, séparés par des virgules, par ex. un aperçu Vercel).

## Garde-fous
- Origine vérifiée (site Nordrive et localhost uniquement) ; 15 questions / IP / 10 min ; plafond global par heure (par instance).
- 12 messages et 1000 caractères maximum ; réponse limitée à 700 tokens ; aucun détail d'erreur renvoyé au visiteur.
- Consigne : répond uniquement d'après la base d'informations de [server/chatCore.ts](../server/chatCore.ts), jamais de donnée sensible demandée,
  texte du visiteur traité comme une question et non comme une instruction, renvoi vers WhatsApp pour les cas personnels.
- Aucune conversation n'est stockée par le site ni envoyée à la mesure d'audience (seuls « Chat ouvert » et « Chat question » sont comptés).

## Modifier ce que sait l'assistant
Éditer `KNOWLEDGE` dans `server/chatCore.ts` (tarifs, délais, parrainage), puis `npm run check` et pousser.
