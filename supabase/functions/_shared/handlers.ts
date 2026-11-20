// Logique des Edge Functions (formulaires publics, dépôt de documents, accès admin aux documents).
// Chaque handler reçoit une Request et des `Ports` ; aucun accès direct à Deno ni à Supabase.
import {
  clientIp, issues, json, randomToken, readJson, safeEqual, sha256Hex, verifyCaptcha, type Ports,
} from './core.ts';
import {
  ALLOWED_MIME, MAX_DOCS_PER_APPLICATION, applicationSchema, contactSchema, documentAccessSchema,
  insuranceSchema, referralSchema, uploadRequestSchema,
} from './schemas.ts';

const digits = (s: string) => s.replace(/\D/g, '');
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;
const tooMany = (cors: Record<string, string>) => json(429, { error: 'Trop de demandes, réessayez plus tard' }, cors);
const serverError = (cors: Record<string, string>) => json(500, { error: 'Erreur interne' }, cors);

/** Honeypot : un robot remplit le champ caché. On répond « succès » sans rien enregistrer, pour ne pas l'informer. */
const isBot = (body: Record<string, unknown>) => typeof body.website === 'string' && body.website.length > 0;

export async function submitApplication(req: Request, p: Ports): Promise<Response> {
  const r = await readJson(req, p);
  if ('res' in r) return r.res;
  const { body, cors } = r;
  try {
    if (isBot(body)) return json(200, { ok: true, applicationId: crypto.randomUUID(), uploadToken: randomToken() }, cors);
    const ip = clientIp(req);
    if ((await p.rateLimit(`app:ip:${ip}`, 3600)) > 5) return tooMany(cors);

    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) return json(400, { error: 'Données invalides', issues: issues(parsed.error) }, cors);
    const d = parsed.data;

    if (!(await verifyCaptcha(p, d.captchaToken, ip))) return json(403, { error: 'Vérification anti-robot échouée' }, cors);
    if ((await p.rateLimit(`app:phone:${digits(d.phone)}`, 86400)) > 3) return tooMany(cors);

    const uploadToken = randomToken();
    const { id } = await p.insertApplication({
      first_name: d.firstName, last_name: d.lastName, phone: d.phone, email: d.email ?? null, city: d.city,
      vtc_card_status: d.vtcCardStatus, has_vehicle: d.hasVehicle, vehicle_model: d.vehicleModel ?? null,
      vehicle_plate: d.vehiclePlate ?? null, platforms: d.platforms, notes: d.notes ?? null,
      source: d.source ?? null, source_detail: d.sourceDetail ?? null,
      consent_rgpd: true, consent_at: p.now().toISOString(),
      upload_token_hash: await sha256Hex(uploadToken),
      upload_expires_at: new Date(p.now().getTime() + TOKEN_LIFETIME_MS).toISOString(),
    });
    await p.notify(`Nouvelle candidature chauffeur : ${d.firstName} ${d.lastName.charAt(0)}.`, `Ville : ${d.city}\nIdentifiant : ${id}\nÀ traiter dans l'espace d'administration.`);
    return json(200, { ok: true, applicationId: id, uploadToken }, cors);
  } catch {
    return serverError(cors);
  }
}

type MessageKind = 'contact' | 'referral' | 'insurance';
const messageSchemas = { contact: contactSchema, referral: referralSchema, insurance: insuranceSchema } as const;
const messageSubject: Record<MessageKind, string> = {
  contact: 'Nouveau message de contact',
  referral: 'Nouveau parrainage',
  insurance: "Nouvelle demande de devis d'assurance",
};

export function submitMessage(kind: MessageKind) {
  return async (req: Request, p: Ports): Promise<Response> => {
    const r = await readJson(req, p);
    if ('res' in r) return r.res;
    const { body, cors } = r;
    try {
      if (isBot(body)) return json(200, { ok: true }, cors);
      const ip = clientIp(req);
      if ((await p.rateLimit(`msg:${kind}:${ip}`, 3600)) > 5) return tooMany(cors);

      const parsed = messageSchemas[kind].safeParse(body);
      if (!parsed.success) return json(400, { error: 'Données invalides', issues: issues(parsed.error) }, cors);
      const { captchaToken, website: _website, ...payload } = parsed.data as Record<string, unknown> & { captchaToken?: string; website?: string };

      if (!(await verifyCaptcha(p, captchaToken, ip))) return json(403, { error: 'Vérification anti-robot échouée' }, cors);
      const { id } = await p.insertMessage(kind, payload);
      await p.notify(messageSubject[kind], `Identifiant : ${id}\nÀ traiter dans l'espace d'administration.`);
      return json(200, { ok: true }, cors);
    } catch {
      return serverError(cors);
    }
  };
}

/** Délivre une URL de dépôt signée, courte, pour UN fichier d'une candidature, si le jeton remis à la candidature est valide. */
export async function requestUploadUrl(req: Request, p: Ports): Promise<Response> {
  const r = await readJson(req, p);
  if ('res' in r) return r.res;
  const { body, cors } = r;
  try {
    const ip = clientIp(req);
    if ((await p.rateLimit(`upload:ip:${ip}`, 3600)) > 60) return tooMany(cors);

    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success) return json(400, { error: 'Données invalides', issues: issues(parsed.error) }, cors);
    const d = parsed.data;

    const app = await p.getApplicationUpload(d.applicationId);
    const hash = await sha256Hex(d.uploadToken);
    const valid =
      app !== null && app.uploadTokenHash !== null && safeEqual(app.uploadTokenHash, hash) &&
      app.uploadExpiresAt !== null && new Date(app.uploadExpiresAt).getTime() > p.now().getTime();
    if (!valid) return json(403, { error: 'Dépôt non autorisé' }, cors); // même réponse pour « inconnu », « mauvais jeton » et « expiré »
    if (app.docCount >= MAX_DOCS_PER_APPLICATION) return json(409, { error: 'Nombre maximal de documents atteint' }, cors);

    const path = `applications/${d.applicationId}/${d.docType}-${crypto.randomUUID()}.${ALLOWED_MIME[d.mimeType]}`;
    const signed = await p.createSignedUpload(path);
    await p.insertDocument({
      application_id: d.applicationId, doc_type: d.docType, storage_path: path, mime_type: d.mimeType, size_bytes: d.sizeBytes,
    });
    return json(200, { ok: true, bucket: 'driver-documents', path, signedUrl: signed.signedUrl, token: signed.token }, cors);
  } catch {
    return serverError(cors);
  }
}

/** Administrateur connecté : URL de téléchargement valable 60 s. Le rôle, la double authentification et la trace d'audit sont gérés par la fonction SQL. */
export async function documentAccess(req: Request, p: Ports): Promise<Response> {
  const r = await readJson(req, p, 2048);
  if ('res' in r) return r.res;
  const { body, cors } = r;
  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!jwt) return json(401, { error: 'Authentification requise' }, cors);

    const parsed = documentAccessSchema.safeParse(body);
    if (!parsed.success) return json(400, { error: 'Données invalides', issues: issues(parsed.error) }, cors);

    const { data, error } = await p.rpcAsUser(jwt, 'request_document_access', { p_document: parsed.data.documentId });
    if (error || typeof data !== 'string') return json(403, { error: 'Accès refusé' }, cors);
    return json(200, { url: await p.signDownload(data, 60), expiresIn: 60 }, cors);
  } catch {
    return serverError(cors);
  }
}
