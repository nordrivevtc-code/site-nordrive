// Serveur LOCAL de test des fonctions serveur : exécute les VRAIS handlers (supabase/functions/_shared) avec une mémoire
// à la place de Supabase, et imite l'URL de dépôt signée du stockage. Aucune donnée n'est conservée.
//
// Usage :  node scripts/dev-api.mjs            (port 54321)
// Puis lancer le site avec :  VITE_API_URL=http://127.0.0.1:54321/functions/v1  (voir docs/SECURITE_PHASE1.md)
import { createServer } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { documentAccess, requestUploadUrl, submitApplication, submitMessage } from '../supabase/functions/_shared/handlers.ts';

const PORT = Number(process.env.PORT ?? 54321);
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:4173').split(',');

const db = { applications: [], messages: [], documents: [], uploads: [], notifications: [], rate: new Map() };
export const state = db;

const ports = {
  env: { ALLOWED_ORIGINS: ORIGINS.join(','), REQUIRE_CAPTCHA: 'false' },
  fetch,
  now: () => new Date(),
  rateLimit: async (key) => { db.rate.set(key, (db.rate.get(key) ?? 0) + 1); return db.rate.get(key); },
  insertApplication: async (row) => { const id = randomUUID(); db.applications.push({ id, ...row }); return { id }; },
  insertMessage: async (kind, payload) => { const id = randomUUID(); db.messages.push({ id, kind, payload }); return { id }; },
  getApplicationUpload: async (id) => {
    const a = db.applications.find((x) => x.id === id);
    return a ? { uploadTokenHash: a.upload_token_hash, uploadExpiresAt: a.upload_expires_at, docCount: db.documents.filter((d) => d.application_id === id).length } : null;
  },
  createSignedUpload: async (path) => ({ signedUrl: `http://127.0.0.1:${PORT}/storage/v1/object/upload/sign/driver-documents/${path}?token=tok-${randomUUID()}`, token: `tok-${randomUUID()}` }),
  insertDocument: async (row) => { db.documents.push(row); },
  notify: async (subject) => { db.notifications.push(subject); },
  rpcAsUser: async () => ({ data: null, error: 'non disponible en test local' }),
  signDownload: async (p) => `http://127.0.0.1:${PORT}/fake-download/${p}`,
};

const routes = {
  'submit-application': (r) => submitApplication(r, ports),
  'submit-contact': (r) => submitMessage('contact')(r, ports),
  'submit-referral': (r) => submitMessage('referral')(r, ports),
  'submit-insurance': (r) => submitMessage('insurance')(r, ports),
  'request-upload-url': (r) => requestUploadUrl(r, ports),
  'document-url': (r) => documentAccess(r, ports),
};

const readBody = (req) => new Promise((resolve) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); });
const cors = (origin) => (origin && ORIGINS.includes(origin)
  ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' } : {});

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const origin = req.headers.origin;
  try {
    // Imitation du stockage : dépôt d'un fichier par URL signée
    if (url.pathname.startsWith('/storage/v1/object/upload/sign/')) {
      if (req.method === 'OPTIONS') { res.writeHead(204, cors(origin)); return res.end(); }
      const body = await readBody(req);
      db.uploads.push({ method: req.method, path: decodeURIComponent(url.pathname.split('/sign/driver-documents/')[1]), bytes: body.length, contentType: req.headers['content-type'], hasToken: url.searchParams.has('token'), sha: createHash('sha256').update(body).digest('hex').slice(0, 12) });
      res.writeHead(200, { 'Content-Type': 'application/json', ...cors(origin) });
      return res.end(JSON.stringify({ Key: `driver-documents/${url.pathname}` }));
    }
    if (url.pathname === '/__state') { res.writeHead(200, { 'Content-Type': 'application/json', ...cors(origin) }); return res.end(JSON.stringify({ ...db, rate: undefined })); }

    const name = url.pathname.replace('/functions/v1/', '');
    const handler = url.pathname.startsWith('/functions/v1/') ? routes[name] : undefined;
    if (!handler) { res.writeHead(404); return res.end('not found'); }
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    const response = await handler(new Request(url, { method: req.method, headers: req.headers, body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`API de test locale : http://127.0.0.1:${PORT}/functions/v1  (état : /__state)`));
