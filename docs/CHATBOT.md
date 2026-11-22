# Assistant de discussion (chatbot) : version gratuite, sans IA

Bulle « Une question ? » en bas à droite du site, au-dessus des boutons WhatsApp et Telegram.

**Gratuit, sans compte, sans clé** : l'assistant ne contacte aucun service externe. Il choisit une réponse écrite à l'avance,
soit parce que le visiteur clique sur un bouton, soit parce qu'il reconnaît des mots-clés dans sa question.
Rien n'est enregistré ; seuls « Chat ouvert », « Chat question » et « Chat sujet » (identifiant du sujet) sont comptés par la mesure d'audience.

## Modifier ou ajouter une réponse
Tout est dans [src/components/chatEngine.ts](../src/components/chatEngine.ts), tableau `TOPICS` : chaque sujet a un titre (le bouton),
des mots-clés, la réponse et les boutons proposés ensuite (`next`).
- Les adresses `https://…` écrites dans une réponse deviennent des boutons cliquables (WhatsApp et pages du site seulement : voir `chatLinks.ts`).
- Les mots-clés s'écrivent sans accents, en minuscules ; « rattach » reconnaît aussi « rattachement ».
- Après modification : `npm run check`, puis pousser sur `main`.

## Garde-fous
- Si le visiteur écrit un IBAN, un e-mail ou une longue suite de chiffres, l'assistant lui demande de ne pas le partager et l'oriente vers le formulaire ou WhatsApp.
- Question inconnue : il propose les sujets et le lien WhatsApp. Il ne répond jamais au hasard.

## Version IA (abandonnée, payante)
Une version avec Claude (fonction serveur + clé payante) existe dans l'historique Git (commit `4d1e267`). Elle comprenait mieux les questions libres,
mais exigeait un compte Anthropic payant. Elle a été retirée pour rester gratuit.
