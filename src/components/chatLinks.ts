// Transforme les adresses écrites par l'assistant en boutons cliquables.
// Seuls le site Nordrive et WhatsApp sont autorisés : toute autre adresse reste du texte simple (jamais cliquable).

export type Segment =
  | { type: 'text'; text: string }
  | { type: 'link'; href: string; label: string; external: boolean };

const SITE_HOSTS = ['nordrive-flotte.com', 'www.nordrive-flotte.com'];

const LABELS: Record<string, string> = {
  '/assurance': 'Voir la page Assurance',
  '/parrainage': 'Voir le parrainage',
  '/simulateur': 'Ouvrir le simulateur',
  '/comparatif': 'Voir le comparatif',
  '/faq': 'Voir la FAQ',
  '/contact': 'Page contact',
  '/qui-sommes-nous': 'Qui sommes-nous',
};

function toLink(raw: string): Extract<Segment, { type: 'link' }> | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  if (u.hostname === 'wa.me') {
    if (!/^\/\d{6,15}$/.test(u.pathname)) return null;
    return { type: 'link', href: u.href, label: 'Écrire sur WhatsApp', external: true };
  }
  if (!SITE_HOSTS.includes(u.hostname)) return null;
  const path = u.pathname.replace(/\/+$/, '') || '/';
  if (u.hash === '#formulaire') return { type: 'link', href: `https://nordrive-flotte.com/${u.hash}`, label: 'Ouvrir le formulaire', external: false };
  return { type: 'link', href: `https://nordrive-flotte.com${path === '/' ? '/' : path}`, label: LABELS[path] ?? 'Ouvrir la page', external: false };
}

export function splitLinks(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const start = m.index ?? 0;
    // on retire la ponctuation collée à l'adresse (« …/assurance. » ou « (…/faq) »)
    const url = m[0].replace(/[.,;:!?)\]]+$/, '');
    const link = toLink(url);
    if (!link) continue;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    out.push(link);
    last = start + url.length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}
