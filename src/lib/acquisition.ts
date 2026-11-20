/**
 * Provenance du visiteur (d'où il vient), pour savoir quelles sources apportent de vrais inscrits.
 *
 * Calculée une seule fois à l'arrivée sur le site et gardée EN MÉMOIRE uniquement : rien n'est
 * écrit dans le navigateur (ni cookie, ni stockage local). Si le visiteur recharge la page après
 * avoir quitté l'adresse d'arrivée, la provenance devient « Direct ».
 *
 * Priorité : paramètre ?utm_source=... (liens que vous créez) puis site référent (document.referrer).
 */

export interface Acquisition {
  /** Libellé lisible : « Google », « ChatGPT », « WhatsApp », « Direct »… */
  source: string;
  /** Détail utile : utm_medium / utm_campaign ou domaine référent */
  detail?: string;
}

const KNOWN: Array<[RegExp, string]> = [
  [/chatgpt\.com|chat\.openai\.com|openai/i, 'ChatGPT'],
  [/perplexity/i, 'Perplexity'],
  [/claude\.ai|anthropic/i, 'Claude'],
  [/gemini\.google|bard\.google|gemini/i, 'Gemini'],
  [/copilot/i, 'Copilot'],
  [/(^|\.)google\.|^google$/i, 'Google'],
  [/bing\./i, 'Bing'],
  [/duckduckgo/i, 'DuckDuckGo'],
  [/qwant|ecosia|yahoo/i, 'Autre moteur'],
  [/facebook|(^|\.)fb\.com|^fb$/i, 'Facebook'],
  [/instagram/i, 'Instagram'],
  [/tiktok/i, 'TikTok'],
  [/youtube|youtu\.be/i, 'YouTube'],
  [/snapchat/i, 'Snapchat'],
  [/linkedin|lnkd\.in/i, 'LinkedIn'],
  [/(^|\.)t\.co$|twitter|(^|\.)x\.com$/i, 'X / Twitter'],
  [/whatsapp|(^|\.)wa\.me$/i, 'WhatsApp'],
  [/telegram|(^|\.)t\.me$/i, 'Telegram'],
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function label(raw: string): string | null {
  for (const [re, name] of KNOWN) if (re.test(raw)) return name;
  return null;
}

function compute(): Acquisition {
  if (typeof window === 'undefined') return { source: 'Direct' };

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source')?.trim();
  const utmMedium = params.get('utm_medium')?.trim();
  const utmCampaign = params.get('utm_campaign')?.trim();

  let refHost = '';
  try {
    if (document.referrer) refHost = new URL(document.referrer).hostname.replace(/^www\./, '');
  } catch {
    /* référent illisible */
  }
  if (refHost === window.location.hostname.replace(/^www\./, '')) refHost = ''; // navigation interne

  if (utmSource) {
    const detail = [utmMedium, utmCampaign].filter(Boolean).join(' / ');
    return { source: label(utmSource) ?? capitalize(utmSource), detail: detail || undefined };
  }
  if (refHost) return { source: label(refHost) ?? refHost, detail: refHost };
  return { source: 'Direct' };
}

const acquisition: Acquisition = compute();

export function getAcquisition(): Acquisition {
  return acquisition;
}
