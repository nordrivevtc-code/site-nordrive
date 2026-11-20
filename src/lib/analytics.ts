/**
 * Mesure d'audience respectueuse de la vie privée (sans cookie) : Plausible ou Umami.
 *
 * - Ne charge rien tant qu'aucun identifiant n'est configuré (voir .env.example).
 * - N'envoie jamais de donnée personnelle : aucun nom, téléphone, e-mail ni document.
 * - Désactivée : en développement (les événements s'affichent dans la console),
 *   dans l'espace admin, pour les robots automatisés (dont le pré-rendu) et pour les
 *   navigateurs de l'équipe (visiter une fois le site avec ?notrack=1 ; ?notrack=0 pour annuler).
 *
 * Événements suivis : voir `track(...)` dans HomePage.tsx et PublicPortal.tsx.
 * Côté Plausible, chaque événement doit être déclaré comme « Goal » du même nom.
 */

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: ((name: string, options?: { props?: Props }) => void) & { q?: unknown[] };
    umami?: { track: (name: string, data?: Props) => void };
  }
}

const env = import.meta.env as Record<string, string | undefined>;
const PLAUSIBLE_DOMAIN = env.VITE_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_SRC = env.VITE_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
const UMAMI_ID = env.VITE_UMAMI_WEBSITE_ID;
const UMAMI_SRC = env.VITE_UMAMI_SRC || 'https://cloud.umami.is/script.js';
const IS_DEV = Boolean(import.meta.env.DEV);
const OPT_OUT_KEY = 'nordrive:no-analytics';

let enabled = false;
const sentOnce = new Set<string>();
const umamiQueue: Array<[string, Props | undefined]> = [];

function readOptOut(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('notrack') === '1') localStorage.setItem(OPT_OUT_KEY, '1');
    if (params.get('notrack') === '0') localStorage.removeItem(OPT_OUT_KEY);
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false; // stockage indisponible : on ne bloque pas la mesure
  }
}

function shouldTrack(): boolean {
  if (typeof window === 'undefined') return false;
  if (navigator.webdriver) return false; // pré-rendu et robots automatisés
  const { pathname, search } = window.location;
  if (pathname.startsWith('/admin')) return false;
  const params = new URLSearchParams(search);
  if (['key', 'sec', 'admin', 'mode'].some((k) => params.has(k))) return false;
  return !readOptOut();
}

function loadScript(src: string, attrs: Record<string, string>, onLoad?: () => void) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  if (onLoad) s.addEventListener('load', onLoad);
  document.head.appendChild(s);
}

function onDocumentClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.('a');
  if (!a) return;
  const href = a.getAttribute('href') ?? '';
  const zone =
    (a.closest('[data-zone]') as HTMLElement | null)?.dataset.zone ??
    a.closest('section')?.id ??
    (a.closest('footer') ? 'pied de page' : a.closest('header') ? 'en-tête' : 'autre');
  const page = window.location.pathname;

  if (href.includes('wa.me/')) track('Clic WhatsApp', { page, zone });
  else if (href === '#formulaire') track('Clic rejoindre', { page, zone });
  else if (href.startsWith('tel:')) track('Clic téléphone', { page, zone });
}

/** État de la configuration (affiché dans l'onglet Statistiques de l'admin). */
export function analyticsStatus() {
  return {
    provider: PLAUSIBLE_DOMAIN ? 'Plausible' : UMAMI_ID ? 'Umami' : null,
    dashboardUrl: env.VITE_ANALYTICS_DASHBOARD_URL || null,
  };
}

/** À appeler une fois au démarrage (main.tsx). */
export function initAnalytics() {
  if (!shouldTrack()) return;

  const hasProvider = Boolean(PLAUSIBLE_DOMAIN || UMAMI_ID);
  if (!IS_DEV && !hasProvider) return; // rien de configuré : aucune requête, aucun suivi

  if (!IS_DEV) {
    if (PLAUSIBLE_DOMAIN) {
      // File d'attente officielle de Plausible : les événements envoyés avant le chargement du script ne sont pas perdus
      window.plausible =
        window.plausible ||
        Object.assign(
          function (...args: unknown[]) {
            (window.plausible!.q = window.plausible!.q || []).push(args);
          },
          { q: [] as unknown[] },
        );
      loadScript(PLAUSIBLE_SRC, { 'data-domain': PLAUSIBLE_DOMAIN });
    }
    if (UMAMI_ID) {
      loadScript(UMAMI_SRC, { 'data-website-id': UMAMI_ID }, () => {
        while (umamiQueue.length) {
          const [name, data] = umamiQueue.shift()!;
          window.umami?.track(name, data);
        }
      });
    }
  }

  enabled = true;
  document.addEventListener('click', onDocumentClick, true);
}

/** Envoie un événement (sans effet si la mesure est inactive). Ne jamais y mettre de donnée personnelle. */
export function track(name: string, props?: Props) {
  if (!enabled) return;
  if (IS_DEV) console.info('[analytics]', name, props ?? '');
  try {
    window.plausible?.(name, props ? { props } : undefined);
    if (UMAMI_ID && !IS_DEV) {
      if (window.umami) window.umami.track(name, props);
      else umamiQueue.push([name, props]);
    }
  } catch {
    /* la mesure ne doit jamais casser le site */
  }
}

/** Comme `track`, mais une seule fois par visite (ex. « Formulaire vu »). */
export function trackOnce(key: string, name: string, props?: Props) {
  if (sentOnce.has(key)) return;
  sentOnce.add(key);
  track(name, props);
}
