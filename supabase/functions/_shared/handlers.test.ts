import { beforeEach, describe, expect, it } from 'vitest';
import type { Ports } from './core.ts';
import { sha256Hex } from './core.ts';
import { documentAccess, requestUploadUrl, submitApplication, submitMessage } from './handlers.ts';

const ORIGIN = 'https://nordrive-flotte.com';
const APP_ID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-11-20T10:00:00Z');

type Fake = ReturnType<typeof makePorts>;
function makePorts(env: Record<string, string> = {}) {
  const counters = new Map<string, number>();
  const state = {
    applications: [] as Record<string, unknown>[],
    messages: [] as { kind: string; payload: Record<string, unknown> }[],
    documents: [] as Record<string, unknown>[],
    notifications: [] as string[],
    app: null as { uploadTokenHash: string | null; uploadExpiresAt: string | null; docCount: number } | null,
    rpcCalls: [] as { jwt: string; fn: string }[],
    rpcResult: { data: 'applications/x/vtc_card_front-1.jpg' as unknown, error: null as string | null },
    captchaResponses: [] as unknown[],
  };
  const ports: Ports = {
    env: { ALLOWED_ORIGINS: `${ORIGIN},https://admin.nordrive-flotte.com`, ...env },
    fetch: (async () => new Response(JSON.stringify({ success: state.captchaResponses.shift() ?? true }))) as typeof fetch,
    now: () => NOW,
    rateLimit: async (key) => { counters.set(key, (counters.get(key) ?? 0) + 1); return counters.get(key)!; },
    insertApplication: async (row) => { state.applications.push(row); return { id: APP_ID }; },
    insertMessage: async (kind, payload) => { state.messages.push({ kind, payload }); return { id: 'msg-1' }; },
    getApplicationUpload: async () => state.app,
    createSignedUpload: async (path) => ({ signedUrl: `https://x.supabase.co/storage/v1/object/upload/sign/driver-documents/${path}?token=t`, token: 't' }),
    insertDocument: async (row) => { state.documents.push(row); },
    notify: async (subject) => { state.notifications.push(subject); },
    rpcAsUser: async (jwt, fn) => { state.rpcCalls.push({ jwt, fn }); return state.rpcResult; },
    signDownload: async (path) => `https://signed.example/${path}?exp=60`,
  };
  return { ports, state, counters };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://fn.example/x', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': '203.0.113.9', ...headers }, body: JSON.stringify(body) });

const validApplication = {
  firstName: 'Alice', lastName: 'Exemple', phone: '06 12 34 56 78', email: 'alice@example.com', city: 'Paris',
  vtcCardStatus: 'oui', hasVehicle: true, platforms: ['uber', 'bolt'], consentRgpd: true,
};

describe('garde-fous communs', () => {
  let f: Fake;
  beforeEach(() => { f = makePorts(); });

  it('refuse une origine inconnue (et n\'écrit rien)', async () => {
    const res = await submitApplication(post(validApplication, { origin: 'https://evil.example' }), f.ports);
    expect(res.status).toBe(403);
    expect(f.state.applications).toHaveLength(0);
  });
  it('refuse une requête sans origine', async () => {
    const req = new Request('https://fn.example/x', { method: 'POST', body: JSON.stringify(validApplication) });
    expect((await submitApplication(req, f.ports)).status).toBe(403);
  });
  it('répond au préflight CORS seulement pour une origine autorisée', async () => {
    const ok = await submitApplication(new Request('https://fn.example/x', { method: 'OPTIONS', headers: { origin: ORIGIN } }), f.ports);
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const ko = await submitApplication(new Request('https://fn.example/x', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), f.ports);
    expect(ko.status).toBe(403);
    expect(ko.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('refuse GET, JSON invalide et corps trop gros', async () => {
    expect((await submitApplication(new Request('https://fn.example/x', { method: 'GET', headers: { origin: ORIGIN } }), f.ports)).status).toBe(405);
    expect((await submitApplication(new Request('https://fn.example/x', { method: 'POST', headers: { origin: ORIGIN }, body: '{pas du json' }), f.ports)).status).toBe(400);
    expect((await submitApplication(post({ ...validApplication, notes: 'x'.repeat(20_000) }), f.ports)).status).toBe(413);
  });
});

describe('submit-application', () => {
  let f: Fake;
  beforeEach(() => { f = makePorts(); });

  it('enregistre une candidature valide et remet un jeton de dépôt dont seule l\'empreinte est stockée', async () => {
    const res = await submitApplication(post(validApplication), f.ports);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applicationId).toBe(APP_ID);
    expect(body.uploadToken.length).toBeGreaterThan(30);
    const row = f.state.applications[0];
    expect(row.first_name).toBe('Alice');
    expect(row.consent_rgpd).toBe(true);
    expect(row.upload_token_hash).toBe(await sha256Hex(body.uploadToken));
    expect(JSON.stringify(row)).not.toContain(body.uploadToken);
    expect(new Date(row.upload_expires_at as string).getTime()).toBe(NOW.getTime() + 2 * 3600 * 1000);
    expect(f.state.notifications[0]).toContain('Alice E.');
    expect(f.state.notifications[0]).not.toContain('0612');
  });
  it('rejette les données invalides en nommant les champs, sans renvoyer les valeurs', async () => {
    const res = await submitApplication(post({ ...validApplication, phone: 'abc', email: 'pas-un-mail', consentRgpd: false }), f.ports);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.map((i: { field: string }) => i.field).sort()).toEqual(['consentRgpd', 'email', 'phone']);
    expect(JSON.stringify(body)).not.toContain('pas-un-mail');
    expect(f.state.applications).toHaveLength(0);
  });
  it('ignore les champs inattendus (pas d\'injection de colonnes comme status)', async () => {
    await submitApplication(post({ ...validApplication, status: 'approved', id: 'forge', role: 'owner' }), f.ports);
    const row = f.state.applications[0];
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('id');
    expect(row).not.toHaveProperty('role');
  });
  it('piège anti-robot : réponse « succès » mais rien d\'enregistré', async () => {
    const res = await submitApplication(post({ ...validApplication, website: 'http://spam.example' }), f.ports);
    expect(res.status).toBe(200);
    expect(f.state.applications).toHaveLength(0);
    expect(f.state.notifications).toHaveLength(0);
  });
  it('limite à 5 envois par heure et par adresse IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await submitApplication(post({ ...validApplication, phone: `06 12 34 56 7${i}` }), f.ports)).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
  });
  it('limite à 3 candidatures par jour pour un même numéro', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await submitApplication(post(validApplication, { 'x-forwarded-for': `198.51.100.${i}` }), f.ports)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
  it('anti-robot Turnstile : exigé quand configuré, refusé si invalide', async () => {
    const g = makePorts({ TURNSTILE_SECRET: 's', REQUIRE_CAPTCHA: 'true' });
    expect((await submitApplication(post(validApplication), g.ports)).status).toBe(403); // pas de jeton
    g.state.captchaResponses.push(false);
    expect((await submitApplication(post({ ...validApplication, captchaToken: 'mauvais' }), g.ports)).status).toBe(403);
    g.state.captchaResponses.push(true);
    expect((await submitApplication(post({ ...validApplication, captchaToken: 'bon' }), g.ports)).status).toBe(200);
  });
  it('en production sans clé Turnstile : refuse (jamais de formulaire ouvert par oubli)', async () => {
    const g = makePorts({ REQUIRE_CAPTCHA: 'true' });
    expect((await submitApplication(post(validApplication), g.ports)).status).toBe(403);
  });
  it('erreur serveur : message générique, aucun détail interne', async () => {
    f.ports.insertApplication = async () => { throw new Error('connexion à la base 10.0.0.5 refusée'); };
    const res = await submitApplication(post(validApplication), f.ports);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('10.0.0.5');
  });
});

describe('formulaires contact, parrainage, devis assurance', () => {
  it('enregistre sans les champs techniques (jeton, piège)', async () => {
    const f = makePorts();
    const res = await submitMessage('contact')(post({ name: 'Claire', phone: '0612345679', message: 'Bonjour', captchaToken: 'x' }), f.ports);
    expect(res.status).toBe(200);
    expect(f.state.messages[0].kind).toBe('contact');
    expect(f.state.messages[0].payload).toEqual({ name: 'Claire', phone: '0612345679', message: 'Bonjour' });
  });
  it('valide chaque type de formulaire', async () => {
    const f = makePorts();
    expect((await submitMessage('referral')(post({ referrerName: 'A', referrerPhone: '0612345678', friendName: 'B' }), f.ports)).status).toBe(400);
    expect((await submitMessage('referral')(post({ referrerName: 'A', referrerPhone: '0612345678', friendName: 'B', friendPhone: '0712345678' }), f.ports)).status).toBe(200);
    expect((await submitMessage('insurance')(post({ firstName: 'A', lastName: 'B', phone: '0612345678', email: 'a@b.fr', city: 'Paris', insuranceType: 'inconnu' }), f.ports)).status).toBe(400);
  });
});

describe('request-upload-url', () => {
  const TOKEN = 'jeton-de-depot-0123456789abcdefghij';
  let f: Fake;
  beforeEach(async () => {
    f = makePorts();
    f.state.app = { uploadTokenHash: await sha256Hex(TOKEN), uploadExpiresAt: new Date(NOW.getTime() + 3600_000).toISOString(), docCount: 0 };
  });
  const req = (over: Record<string, unknown> = {}) => post({ applicationId: APP_ID, uploadToken: TOKEN, docType: 'vtc_card_front', mimeType: 'image/jpeg', sizeBytes: 500_000, ...over });

  it('délivre une URL de dépôt pour un jeton valide, dans le dossier de la candidature', async () => {
    const res = await requestUploadUrl(req(), f.ports);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path).toMatch(new RegExp(`^applications/${APP_ID}/vtc_card_front-[0-9a-f-]{36}\\.jpg$`));
    expect(body.signedUrl).toContain('/upload/sign/driver-documents/');
    expect(f.state.documents[0]).toMatchObject({ application_id: APP_ID, doc_type: 'vtc_card_front', mime_type: 'image/jpeg', size_bytes: 500_000 });
  });
  it('refuse un mauvais jeton, un jeton expiré et une candidature inconnue avec la MÊME réponse', async () => {
    const bad = await requestUploadUrl(req({ uploadToken: 'mauvais-jeton-0123456789abcdefghij' }), f.ports);
    f.state.app!.uploadExpiresAt = new Date(NOW.getTime() - 1000).toISOString();
    const expired = await requestUploadUrl(req(), f.ports);
    f.state.app = null;
    const unknown = await requestUploadUrl(req(), f.ports);
    for (const r of [bad, expired, unknown]) expect(r.status).toBe(403);
    expect(await bad.text()).toBe(await expired.text());
    expect(f.state.documents).toHaveLength(0);
  });
  it('refuse les types de fichier dangereux et les fichiers trop gros', async () => {
    expect((await requestUploadUrl(req({ mimeType: 'text/html' }), f.ports)).status).toBe(400);
    expect((await requestUploadUrl(req({ mimeType: 'application/x-msdownload' }), f.ports)).status).toBe(400);
    expect((await requestUploadUrl(req({ sizeBytes: 50 * 1024 * 1024 }), f.ports)).status).toBe(400);
    expect((await requestUploadUrl(req({ docType: '../../etc/passwd' }), f.ports)).status).toBe(400);
    expect(f.state.documents).toHaveLength(0);
  });
  it('limite le nombre de documents par candidature', async () => {
    f.state.app!.docCount = 8;
    expect((await requestUploadUrl(req(), f.ports)).status).toBe(409);
  });
});

describe('document-url (administrateur)', () => {
  let f: Fake;
  const DOC = '22222222-2222-4222-8222-222222222222';
  const adminReq = (headers: Record<string, string> = {}) =>
    post({ documentId: DOC }, { origin: 'https://admin.nordrive-flotte.com', authorization: 'Bearer jwt-admin', ...headers });
  beforeEach(() => { f = makePorts(); });

  it('sans identité : 401, aucune signature', async () => {
    const res = await documentAccess(post({ documentId: DOC }, { origin: 'https://admin.nordrive-flotte.com' }), f.ports);
    expect(res.status).toBe(401);
    expect(f.state.rpcCalls).toHaveLength(0);
  });
  it('appelle la fonction SQL avec le JWT de l\'utilisateur (c\'est elle qui contrôle rôle, MFA et audit) puis signe 60 s', async () => {
    const res = await documentAccess(adminReq(), f.ports);
    expect(res.status).toBe(200);
    expect(f.state.rpcCalls).toEqual([{ jwt: 'jwt-admin', fn: 'request_document_access' }]);
    expect(await res.json()).toEqual({ url: 'https://signed.example/applications/x/vtc_card_front-1.jpg?exp=60', expiresIn: 60 });
  });
  it('accès refusé par la base (mauvais rôle, pas de MFA) : 403 sans détail et aucune URL', async () => {
    f.state.rpcResult = { data: null, error: 'accès refusé' };
    const res = await documentAccess(adminReq(), f.ports);
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('signed.example');
  });
  it('refuse un identifiant de document invalide', async () => {
    expect((await documentAccess(post({ documentId: '1 OR 1=1' }, { origin: 'https://admin.nordrive-flotte.com', authorization: 'Bearer x' }), f.ports)).status).toBe(400);
  });
});
