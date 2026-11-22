// Assistant sans IA : réponses rédigées et validées par Nordrive, choisies par boutons ou par mots-clés.
// Gratuit, sans compte ni clé, et rien n'est envoyé à un service externe.
// Pour modifier une réponse : changer son `answer` ci-dessous (les adresses https://… deviennent des boutons).

export interface Topic {
  id: string;
  /** Texte du bouton */
  title: string;
  /** Mots (sans accents, minuscules) ; un mot comme « rattach » reconnaît aussi « rattachement » */
  keywords: string[];
  answer: string;
  /** Boutons proposés après la réponse */
  next: string[];
}

const WA = 'https://wa.me/33743767400';
const SITE = 'https://nordrive-flotte.com';

export const TOPICS: Topic[] = [
  {
    id: 'prix',
    title: 'Combien ça coûte ?',
    keywords: ['prix', 'cout', 'tarif', 'combien', 'euro', 'payer', 'commission', 'frais', 'abonnement', 'cher'],
    answer: `Le tarif est de 50 € par semaine, uniquement les semaines où vous roulez. Si vous ne roulez pas (repos, vacances, aucune course), vous payez 0 €. Il n'y a aucune commission sur votre chiffre d'affaires (0 %) et aucun frais caché annoncé.`,
    next: ['semaine_sans', 'rattachement', 'simulateur'],
  },
  {
    id: 'semaine_sans',
    title: 'Et si je ne roule pas ?',
    keywords: ['repos', 'vacance', 'conge', 'ne roule pas', 'pas roule', 'sans course', 'aucune course', 'malade', 'pause'],
    answer: 'Si vous ne roulez pas une semaine, vous payez 0 € cette semaine-là : les 50 € ne sont dus que pour une semaine travaillée.',
    next: ['prix', 'arret'],
  },
  {
    id: 'paiement',
    title: 'Quand suis-je payé ?',
    keywords: ['paye', 'virement', 'lundi', 'versement', 'sepa', 'releve', 'recevoir mon argent', 'quand je recois'],
    answer: 'Vos relevés Uber, Bolt et Heetch sont rapprochés chaque semaine, et le virement SEPA arrive chaque lundi.',
    next: ['contrat', 'prix'],
  },
  {
    id: 'rattachement',
    title: 'Je veux me rattacher',
    keywords: ['rattach', 'rejoindre', 'inscri', 'document', 'piece', 'papier', 'fournir', 'dossier', 'carte grise', 'carte vtc', 'permis', 'comment faire', 'comment ca marche', 'comment ca se passe', 'adhere', 'demarrer'],
    answer: 'Pour vous dire exactement ce qu’il faut préparer, indiquez-moi votre situation :',
    next: ['sit_proprio', 'sit_loue', 'location'],
  },
  {
    id: 'sit_proprio',
    title: 'Je suis propriétaire de ma voiture',
    keywords: ['proprietaire', 'j ai ma voiture', 'j ai mon vehicule', 'j ai un vehicule', 'j ai une voiture'],
    answer: `Vous êtes propriétaire de votre véhicule. Préparez : votre nom et prénom, l’adresse e-mail de votre compte Uber et celle de votre compte Bolt, la carte grise du véhicule, votre carte VTC et votre permis.\n\nSi vos coordonnées sont différentes sur Uber et sur Bolt : l’adresse e-mail et le téléphone de votre compte Uber, et l’adresse e-mail et le téléphone de votre compte Bolt.\n\nEnvoyez tout cela par le formulaire du site ou sur WhatsApp, pas dans cette discussion : ${SITE}/#formulaire ${WA}`,
    next: ['delai', 'prix'],
  },
  {
    id: 'sit_loue',
    title: 'Je loue déjà une voiture',
    keywords: ['je loue', 'je loue deja', 'locataire', 'voiture louee', 'vehicule loue'],
    answer: `Vous louez déjà un véhicule. Préparez : votre nom et prénom, l’adresse e-mail de votre compte Uber et celle de votre compte Bolt, la carte grise du véhicule que vous utilisez, votre carte VTC et votre permis.\n\nSi vos coordonnées sont différentes sur Uber et sur Bolt : l’adresse e-mail et le téléphone de votre compte Uber, et l’adresse e-mail et le téléphone de votre compte Bolt.\n\nEnvoyez tout cela par le formulaire du site ou sur WhatsApp, pas dans cette discussion : ${SITE}/#formulaire ${WA}`,
    next: ['amendes', 'entretien'],
  },
  {
    id: 'location',
    title: 'Je veux louer une voiture',
    keywords: ['louer', 'location', 'loueur', 'pas de voiture', 'sans voiture', 'vehicule a louer', 'je n ai pas de voiture'],
    answer: `Nordrive propose des véhicules à la location. Vous n’avez pas de carte grise à fournir, mais la carte VTC et le permis sont nécessaires. Pour connaître les véhicules disponibles et les conditions, écrivez à l’équipe sur WhatsApp : ${WA}`,
    next: ['rattachement', 'contact'],
  },
  {
    id: 'compte_existant',
    title: 'Je suis déjà sur Uber ou Bolt',
    keywords: ['deja inscrit', 'deja uber', 'deja bolt', 'deja sur', 'ma note', 'historique', 'compte existant', 'perdre', 'garder mon compte', 'mon compte uber', 'mon compte bolt'],
    answer: 'Vous ne perdez rien. Nordrive rattache vos comptes existants en quelques minutes, sans interruption, et vous gardez votre note chauffeur et votre historique.',
    next: ['rattachement', 'delai'],
  },
  {
    id: 'arret',
    title: 'Puis-je arrêter quand je veux ?',
    keywords: ['arreter', 'quitter', 'engagement', 'duree', 'resili', 'suspendre', 'liberte', 'sortir'],
    answer: 'Oui : il n’y a aucun engagement de durée. Vous pouvez suspendre ou quitter la flotte à tout moment par un simple message, sans frais.',
    next: ['prix', 'contrat'],
  },
  {
    id: 'vieux',
    title: 'Véhicule de plus de 12 ans',
    keywords: ['12 ans', 'plus de 12 ans', 'vieux', 'vieille', 'ancien', 'age du vehicule', 'annee', 'kilometr', 'vehicule age'],
    answer: 'Oui : les véhicules de plus de 12 ans en bon état de circulation sont acceptés sur Uber, Bolt et Heetch grâce au statut de flotte de Nordrive.',
    next: ['rattachement', 'prix'],
  },
  {
    id: 'delai',
    title: 'Combien de temps pour démarrer ?',
    keywords: ['macaron', 'delai', 'combien de temps', 'rapide', 'activation', 'quand puis je rouler', 'commencer a rouler', 'demarre'],
    answer: 'Le macaron VTC et l’activation de vos comptes sont annoncés en moins d’1 heure après réception de vos pièces (carte VTC et permis). Vous pouvez commencer à rouler le jour même.',
    next: ['rattachement', 'prix'],
  },
  {
    id: 'contrat',
    title: 'Contrat et fiche de paie',
    keywords: ['contrat', 'cdi', 'cdd', 'fiche de paie', 'bulletin', 'salarie', 'statut', 'mutuelle', 'retraite', 'salaire', 'justificatif'],
    answer: 'Le rattachement vous donne un contrat CDI ou CDD et une fiche de paie chaque mois, avec des droits sociaux (assurance maladie, retraite, mutuelle) et des justificatifs de revenus.',
    next: ['paiement', 'arret'],
  },
  {
    id: 'parrainage',
    title: 'Parrainage',
    keywords: ['parrain', '200', 'prime', 'recommand', 'ami', 'collegue', 'filleul'],
    answer: `Parrainage : jusqu’à 200 € de prime pour vous, dès que le dossier du chauffeur que vous parrainez est validé et qu’il commence à rouler. ${SITE}/parrainage`,
    next: ['rattachement', 'prix'],
  },
  {
    id: 'zones',
    title: 'Où puis-je rouler ?',
    keywords: ['zone', 'ville', 'region', 'paris', 'france', 'secteur', 'departement', 'lyon', 'marseille', 'province', 'ile de france'],
    answer: 'Nordrive rattache les chauffeurs pour rouler partout en France.',
    next: ['rattachement', 'prix'],
  },
  {
    id: 'amendes',
    title: 'Qui paie les amendes ?',
    keywords: ['amende', 'pv', 'contravention', 'radar', 'infraction', 'flash'],
    answer: 'Si vous êtes propriétaire de votre véhicule, vous êtes seul responsable de vos amendes. Si vous louez votre véhicule, ce sont les conditions de votre loueur qui s’appliquent.',
    next: ['entretien', 'location'],
  },
  {
    id: 'entretien',
    title: 'Entretien et carburant',
    keywords: ['entretien', 'carburant', 'essence', 'gazole', 'diesel', 'reparation', 'garage', 'panne', 'vidange', 'pneu', 'electrique', 'recharge'],
    answer: 'Si vous êtes propriétaire de votre véhicule, l’entretien et le carburant sont à votre charge. Si vous louez, cela dépend des conditions de votre loueur.',
    next: ['amendes', 'location'],
  },
  {
    id: 'assurance',
    title: 'Assurance',
    keywords: ['assurance', 'assure', 'rc pro', 'sinistre', 'accident', 'couverture', 'couvert', 'garantie'],
    answer: `Pour l’assurance, contactez l’équipe sur WhatsApp : ${WA}\n\nVous pouvez aussi demander un devis sur la page Assurance : ${SITE}/assurance`,
    next: ['contact', 'rattachement'],
  },
  {
    id: 'simulateur',
    title: 'Estimer mes gains',
    keywords: ['simulateur', 'simuler', 'estimer', 'estimation', 'gagne', 'je gagne', 'combien je gagne', 'gain', 'chiffre d affaires', 'revenu net', 'rentable'],
    answer: `Vous pouvez estimer votre revenu net par semaine ou par mois avec le simulateur : ${SITE}/simulateur`,
    next: ['prix', 'comparatif'],
  },
  {
    id: 'comparatif',
    title: 'Seul ou avec une flotte ?',
    keywords: ['comparatif', 'comparer', 'seul', 'independant', 'difference', 'avantage', 'pourquoi nordrive'],
    answer: `Pour comparer le fait de rouler seul ou avec une flotte, voyez le comparatif : ${SITE}/comparatif`,
    next: ['prix', 'rattachement'],
  },
  {
    id: 'contact',
    title: 'Parler à l’équipe',
    keywords: ['horaire', 'ouverture', 'joignable', 'contact', 'whatsapp', 'telephone', 'numero', 'appeler', 'parler', 'equipe', 'humain', 'conseiller', 'disponible', 'telegram'],
    answer: `L’équipe répond sur WhatsApp 7 jours sur 7, en journée, au 07 43 76 74 00 : ${WA}`,
    next: ['rattachement', 'prix'],
  },
];

const byId = new Map(TOPICS.map(t => [t.id, t]));

export const MENU = ['prix', 'rattachement', 'vieux', 'parrainage', 'assurance', 'contact'];

export interface Reply {
  text: string;
  chips: string[];
}

export function topicTitle(id: string): string {
  return byId.get(id)?.title ?? id;
}

export const WELCOME: Reply = {
  text: 'Bonjour ! Je suis l’assistant de Nordrive. Choisissez un sujet ci-dessous, ou écrivez votre question.',
  chips: MENU,
};

const GREETING: Reply = { text: 'Avec plaisir ! Choisissez un sujet ci-dessous, ou écrivez votre question.', chips: MENU };

const FALLBACK: Reply = {
  text: `Je n’ai pas la réponse à cette question. Choisissez un sujet ci-dessous, ou écrivez directement à l’équipe sur WhatsApp : ${WA}`,
  chips: MENU,
};

const PRIVACY: Reply = {
  text: `Pour votre sécurité, n’écrivez pas ici vos données personnelles (IBAN, pièces d’identité, e-mail, téléphone). Utilisez le formulaire du site ou WhatsApp : ${SITE}/#formulaire ${WA}`,
  chips: ['rattachement', 'contact'],
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Détecte ce qui ressemble à une donnée personnelle sensible (IBAN, e-mail, longue suite de chiffres). */
export function looksSensitive(text: string): boolean {
  const compact = text.replace(/[\s.-]/g, '');
  return /\b[a-z]{2}\d{2}[a-z0-9]{10,}/i.test(compact) || /@/.test(text) || /\d{9,}/.test(compact);
}

function fromTopic(t: Topic): Reply {
  return { text: t.answer, chips: t.next };
}

export function answerTopic(id: string): Reply {
  const t = byId.get(id);
  return t ? fromTopic(t) : FALLBACK;
}

export function answerText(raw: string): Reply {
  if (looksSensitive(raw)) return PRIVACY;
  const q = ` ${normalize(raw)} `;
  if (q.trim() === '') return FALLBACK;
  if (/ (bonjour|salut|hello|coucou|bonsoir|merci|ok) /.test(q) && q.trim().split(' ').length <= 3) return GREETING;

  let best: Topic | null = null;
  let bestScore = 0;
  for (const t of TOPICS) {
    let score = 0;
    for (const k of t.keywords) {
      // le mot doit commencer un mot de la question (« rattach » reconnaît « rattachement »)
      if (q.includes(` ${k}`)) score += k.split(' ').length;
    }
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best ? fromTopic(best) : FALLBACK;
}
