// Briques communes des Edge Functions. Aucune dépendance à Deno ni à Supabase : tout est injecté (voir `Ports`),
// ce qui permet de tester la logique de sécurité avec Vitest.

export interface Ports {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  now: () => Date;
  /** Incrémente et renvoie le compteur de la clé pour la fenêtre courante */
  rateLimit: (key: string, windowSeconds: number) => Promise<number>;
  insertApplication: (row: Record<string, unknown>) => Promise<{ id: string }>;
  insertMessage: (kind: 'contact' | 'referral' | 'insurance', payload: Record<string, unknown>) => Promise<{ id: string }>;
  getApplicationUpload: (id: string) => Promise<{ uploadTokenHash: string | null; uploadExpiresAt: string | null; docCount: number } | null>;
  createSignedUpload: (path: string) => Promise<{ signedUrl: string; token: string }>;
  insertDocument: (row: Record<string, unknown>) => Promise<void>;
  /** Notification interne (e-mail à l'équipe). N'échoue jamais. */
  notify: (subject: string, text: string) => Promise<void>;
  /** Appelle une fonction SQL avec l'identité de l'administrateur connecté (son JWT) */
  rpcAsUser: (jwt: string, fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: string | null }>;
  signDownload: (path: string, seconds: number) => Promise<string>;
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

const allowedOrigins = (p: Ports) => (p.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request, p: Ports): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins(p).includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export const clientIp = (req: Request) =>
  req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32): string {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Comparaison en temps constant (évite de deviner un jeton caractère par caractère) */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCaptcha(p: Ports, token: string | undefined, ip: string): Promise<boolean> {
  const secret = p.env.TURNSTILE_SECRET;
  if (!secret) return p.env.REQUIRE_CAPTCHA !== 'true'; // pas configuré : autorisé en développement, refusé en production
  if (!token) return false;
  try {
    const res = await p.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Contrôles communs : méthode, origine autorisée, taille, JSON valide.
 * Renvoie soit une réponse d'erreur, soit le corps analysé.
 */
export async function readJson(req: Request, p: Ports, maxBytes = 16_384): Promise<{ res: Response } | { body: Record<string, unknown>; cors: Record<string, string> }> {
  const cors = corsHeaders(req, p);
  if (req.method === 'OPTIONS') return { res: new Response(null, { status: cors['Access-Control-Allow-Origin'] ? 204 : 403, headers: cors }) };
  if (req.method !== 'POST') return { res: json(405, { error: 'Méthode non autorisée' }, cors) };
  if (!cors['Access-Control-Allow-Origin']) return { res: json(403, { error: 'Origine non autorisée' }) };
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return { res: json(413, { error: 'Requête trop volumineuse' }, cors) };
  const text = await req.text();
  if (text.length > maxBytes) return { res: json(413, { error: 'Requête trop volumineuse' }, cors) };
  try {
    const body = JSON.parse(text);
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('forme');
    return { body: body as Record<string, unknown>, cors };
  } catch {
    return { res: json(400, { error: 'JSON invalide' }, cors) };
  }
}

/** Erreurs de validation : on renvoie les champs fautifs, jamais les valeurs saisies */
export const issues = (error: { issues: Array<{ path: PropertyKey[]; message: string }> }) =>
  error.issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message }));
