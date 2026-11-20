/**
 * SEO par page : titre, description, URL canonique, Open Graph / Twitter et
 * données structurées JSON-LD. Appelé à chaque changement de page ; le script de
 * pré-rendu (scripts/prerender.mjs) capture ensuite le HTML obtenu pour chaque route.
 *
 * Les routes pré-rendues sont déduites de public/sitemap.xml : pour ajouter une page,
 * l'ajouter ici ET dans le sitemap.
 */

export const SITE_URL = 'https://nordrive-flotte.com';
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export interface FaqItem {
  q: string;
  a: string;
}

interface PageSeo {
  title: string;
  description: string;
  /** Nom court affiché dans le fil d'Ariane */
  crumb: string;
  /** Type schema.org de la page */
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'FAQPage';
}

const PAGES: Record<string, PageSeo> = {
  '/': {
    title: 'Rattachement flotte VTC à 50 €/semaine | Nordrive',
    description:
      "Rejoignez la flotte Nordrive : 50 € par semaine travaillée, 0 € si vous ne roulez pas, 0 % de commission. Véhicules +12 ans acceptés, macaron VTC en moins d'1h.",
    crumb: 'Accueil',
  },
  '/comparatif': {
    title: 'Rouler seul ou avec une flotte VTC : le comparatif | Nordrive',
    description:
      'Comparez la gestion en solo et le rattachement à la flotte Nordrive : démarches, coûts, paiement hebdomadaire et accompagnement pour chauffeurs VTC.',
    crumb: 'Comparatif',
  },
  '/assurance': {
    title: 'Assurance VTC : devis rapide | Nordrive',
    description:
      "Demandez votre devis d'assurance VTC : RC circulation professionnelle, assurance flotte ou véhicule tout risque. Un conseiller Nordrive vous répond rapidement.",
    crumb: 'Assurance VTC',
  },
  '/simulateur': {
    title: 'Simulateur de gains VTC : combien gardez-vous ? | Nordrive',
    description:
      'Simulez votre revenu net par semaine ou par mois avec la flotte Nordrive : 50 € prélevés uniquement les semaines travaillées, 0 € sinon.',
    crumb: 'Simulateur',
  },
  '/parrainage': {
    title: "Parrainage VTC : jusqu'à 200 € par chauffeur | Nordrive",
    description:
      "Parrainez un confrère VTC et touchez jusqu'à 200 € dès que sa première semaine de courses est validée. Invitation WhatsApp ou formulaire en 4 champs.",
    crumb: 'Parrainage',
  },
  '/qui-sommes-nous': {
    title: 'Qui sommes-nous ? | Nordrive, flotte VTC',
    description:
      'Découvrez Nordrive, gestionnaire de flotte VTC : notre mission, notre fonctionnement et notre support humain joignable par WhatsApp.',
    crumb: 'Qui sommes-nous',
    type: 'AboutPage',
  },
  '/faq': {
    title: 'FAQ rattachement VTC : vos questions | Nordrive',
    description:
      'Macaron, tarif de 50 €/semaine, véhicules +12 ans, paiement du lundi, contrat : toutes les réponses sur le rattachement à la flotte Nordrive.',
    crumb: 'FAQ',
    type: 'FAQPage',
  },
  '/contact': {
    title: 'Contact Nordrive : WhatsApp et formulaire',
    description:
      "Contactez l'équipe Nordrive par WhatsApp au 07 43 76 74 00 ou via le formulaire. Réponse rapide pour votre rattachement VTC.",
    crumb: 'Contact',
    type: 'ContactPage',
  },
};

/** Nombre de questions de la FAQ affichées sur l'accueil (doit correspondre à HomePage) */
const HOME_FAQ_COUNT = 4;

const normalize = (path: string) => {
  const p = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function faqSchema(faq: FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

function buildGraph(path: string, page: PageSeo, url: string, faq: FaqItem[]) {
  const graph: Record<string, unknown>[] = [
    {
      '@type': page.type === 'FAQPage' ? 'WebPage' : page.type ?? 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'fr-FR',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': ORG_ID },
    },
  ];

  if (path === '/') {
    graph.push({
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: 'Nordrive VTC',
      inLanguage: 'fr-FR',
      publisher: { '@id': ORG_ID },
    });
    if (faq.length) graph.push(faqSchema(faq.slice(0, HOME_FAQ_COUNT)));
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: PAGES['/'].crumb, item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: page.crumb, item: url },
      ],
    });
    if (path === '/faq' && faq.length) graph.push(faqSchema(faq));
  }

  if (path === '/assurance') {
    graph.push({
      '@type': 'Service',
      name: 'Assurance VTC',
      serviceType: 'Assurance VTC : RC circulation professionnelle, flotte, véhicule tout risque',
      provider: { '@id': ORG_ID },
      areaServed: { '@type': 'Country', name: 'France' },
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Applique les balises SEO de la page `path` dans le <head>. Sans effet côté serveur. */
export function applySeo(rawPath: string, faq: FaqItem[] = []) {
  if (typeof document === 'undefined') return;

  const path = normalize(rawPath);
  const known = path in PAGES;
  const page: PageSeo = known
    ? PAGES[path]
    : { title: 'Page introuvable | Nordrive', description: "Cette page n'existe pas ou a été déplacée. Retrouvez l'offre de rattachement à la flotte Nordrive sur l'accueil.", crumb: 'Page introuvable' };
  const url = known && path !== '/' ? `${SITE_URL}${path}` : `${SITE_URL}/`;

  document.title = page.title;
  setMeta('name', 'description', page.description);
  // Pages inconnues : ne pas les indexer
  setMeta('name', 'robots', known
    ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    : 'noindex, follow');
  setCanonical(url);

  setMeta('property', 'og:title', page.title);
  setMeta('property', 'og:description', page.description);
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:title', page.title);
  setMeta('name', 'twitter:description', page.description);

  let script = document.head.querySelector<HTMLScriptElement>('script#seo-jsonld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'seo-jsonld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(buildGraph(known ? path : '/', page, url, faq));
}
