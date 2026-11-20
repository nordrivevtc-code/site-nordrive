/**
 * Appels du site PUBLIC vers les fonctions serveur sécurisées (Supabase Edge Functions).
 *
 * Interrupteur : le circuit sécurisé n'est utilisé que si VITE_API_URL est défini
 * (ex. https://<projet>.supabase.co/functions/v1). Sinon le site garde l'ancien circuit (Web3Forms/Cloudinary),
 * ce qui permet de déployer les fonctions, de tester, puis de basculer sans coupure.
 *
 * Le site n'utilise JAMAIS de clé secrète : la clé publique (VITE_SUPABASE_ANON_KEY) ne donne accès à rien
 * (base verrouillée, voir supabase/migrations). Les fichiers partent vers un stockage PRIVÉ par URL signée.
 */
import type { DRIVER_DOC_TYPES } from '../../supabase/functions/_shared/schemas.ts';

type DocType = (typeof DRIVER_DOC_TYPES)[number];

const env = import.meta.env as Record<string, string | undefined>;
const API_URL = env.VITE_API_URL?.replace(/\/+$/, '');
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const TURNSTILE_KEY = env.VITE_TURNSTILE_SITE_KEY;

export const apiEnabled = Boolean(API_URL);

/** Champ du formulaire (clé interne) -> type de document attendu par le serveur */
export const SECURE_DOC_TYPES: Record<string, DocType> = {
  vtcRecto: 'vtc_card_front',
  vtcVerso: 'vtc_card_back',
  rcCirculation: 'rc_circulation',
  carteGrise: 'vehicle_registration',
  memoAssurance: 'insurance_memo',
  signature: 'signature',
};

const OK_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;

async function postJson(fn: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${API_URL}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(ANON_KEY ? { apikey: ANON_KEY } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* corps vide */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

/* ───────── Anti-robot Cloudflare Turnstile (facultatif tant que VITE_TURNSTILE_SITE_KEY n'est pas défini) ───────── */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      execute: (el: HTMLElement | string) => void;
      remove: (id: string) => void;
    };
  }
}
let turnstileScript: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  turnstileScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile'));
    document.head.appendChild(s);
  });
  return turnstileScript;
}

async function getCaptchaToken(): Promise<string | undefined> {
  if (!TURNSTILE_KEY) return undefined;
  try { await loadTurnstile(); } catch { return undefined; }
  return new Promise((resolve) => {
    const holder = document.createElement('div');
    document.body.appendChild(holder);
    let widgetId = '';
    const finish = (token?: string) => {
      clearTimeout(timer);
      try { if (widgetId) window.turnstile?.remove(widgetId); } catch { /* déjà retiré */ }
      holder.remove();
      resolve(token);
    };
    const timer = setTimeout(() => finish(undefined), 15_000);
    try {
      widgetId = window.turnstile!.render(holder, {
        sitekey: TURNSTILE_KEY,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (t: string) => finish(t),
        'error-callback': () => finish(undefined),
      });
      window.turnstile!.execute(holder);
    } catch {
      finish(undefined);
    }
  });
}

/* ───────── Dépôt d'un document : URL signée courte -> stockage privé ───────── */
async function uploadDocument(applicationId: string, uploadToken: string, docType: DocType, file: File): Promise<boolean> {
  if (!OK_MIME.has(file.type) || file.size > MAX_BYTES) return false;
  const r = await postJson('request-upload-url', { applicationId, uploadToken, docType, mimeType: file.type, sizeBytes: file.size });
  if (!r.ok || !r.data?.path) return false;
  try {
    // Chargé à la demande : uniquement quand un document est réellement envoyé
    const { StorageClient } = await import('@supabase/storage-js');
    const storage = new StorageClient(`${API_URL!.replace(/\/functions\/v1$/, '')}/storage/v1`, {
      apikey: ANON_KEY ?? '',
      Authorization: `Bearer ${ANON_KEY ?? ''}`,
    });
    const { error } = await storage.from(r.data.bucket).uploadToSignedUrl(r.data.path, r.data.token, file, { contentType: file.type });
    return !error;
  } catch {
    return false;
  }
}

export interface SecureApplication {
  firstName: string; lastName: string; phone: string; email?: string; city: string;
  vtcCardStatus: 'oui' | 'encours' | 'non'; hasVehicle: boolean; vehicleModel?: string; vehiclePlate?: string;
  platforms: string[]; notes?: string; source?: string; sourceDetail?: string; consentRgpd: true; website?: string;
}

/** Envoie la candidature puis les documents. Ne lève jamais d'erreur : le site continue vers WhatsApp quoi qu'il arrive. */
export async function submitApplicationSecure(
  application: SecureApplication,
  files: Array<{ key: string; docType: DocType; file: File }>,
): Promise<{ ok: boolean; uploaded: string[] }> {
  const captchaToken = await getCaptchaToken();
  const res = await postJson('submit-application', { ...application, captchaToken });
  if (!res.ok || !res.data?.applicationId) return { ok: false, uploaded: [] };
  const uploaded: string[] = [];
  for (const f of files) {
    if (await uploadDocument(res.data.applicationId, res.data.uploadToken, f.docType, f.file)) uploaded.push(f.key);
  }
  return { ok: true, uploaded };
}

export async function submitMessageSecure(kind: 'contact' | 'referral' | 'insurance', payload: Record<string, unknown>): Promise<boolean> {
  const captchaToken = await getCaptchaToken();
  return (await postJson(`submit-${kind}`, { ...payload, captchaToken, website: '' })).ok;
}

/** Circuit sécurisé si configuré, sinon ancien circuit fourni par l'appelant */
export function sendMessage(kind: 'contact' | 'referral' | 'insurance', payload: Record<string, unknown>, legacy: () => void): void {
  if (apiEnabled) void submitMessageSecure(kind, payload);
  else legacy();
}
