// Schémas de validation des formulaires publics. Source unique : utilisée par les Edge Functions (Deno)
// ET par le site (Vite), pour que le navigateur et le serveur appliquent exactement les mêmes règles.
import { z } from 'zod';

const phone = z.string().trim().regex(/^\+?[0-9][0-9\s.\-]{8,17}$/, 'téléphone invalide');
const name = z.string().trim().min(1, 'obligatoire').max(100);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const email = z.string().trim().email('e-mail invalide').max(254);
const antiBot = {
  captchaToken: z.string().max(4096).optional(), // jeton Cloudflare Turnstile
  website: z.string().max(0).optional(), // champ piège : doit rester vide
};

export const PLATFORMS = ['uber', 'bolt', 'heetch', 'caocao', 'lecab'] as const;

export const applicationSchema = z.object({
  firstName: name,
  lastName: name,
  phone,
  email: z.union([email, z.literal('')]).optional().transform((v) => v || undefined),
  city: z.string().trim().min(1).max(100),
  vtcCardStatus: z.enum(['oui', 'encours', 'non']),
  hasVehicle: z.boolean().default(true),
  vehicleModel: optionalText(100),
  vehiclePlate: optionalText(20),
  platforms: z.array(z.enum(PLATFORMS)).max(5).default([]),
  notes: optionalText(2000),
  source: optionalText(60),
  sourceDetail: optionalText(120),
  consentRgpd: z.literal(true, { error: 'consentement obligatoire' }),
  ...antiBot,
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const contactSchema = z.object({
  name,
  phone,
  email: z.union([email, z.literal('')]).optional().transform((v) => v || undefined),
  message: z.string().trim().min(1).max(2000),
  ...antiBot,
});

export const referralSchema = z.object({
  referrerName: name,
  referrerPhone: phone,
  friendName: name,
  friendPhone: phone,
  ...antiBot,
});

export const insuranceSchema = z.object({
  firstName: name,
  lastName: name,
  phone,
  email,
  city: z.string().trim().min(1).max(100),
  insuranceType: z.enum(['rc_circulation_pro', 'flotte_vtc', 'vehicule_tout_risque']),
  vehicleModel: optionalText(100),
  vehiclePlate: optionalText(20),
  notes: optionalText(2000),
  ...antiBot,
});

// Types de documents acceptés pour une candidature de chauffeur
export const DRIVER_DOC_TYPES = [
  'vtc_card_front', 'vtc_card_back', 'driving_license', 'id_photo', 'rc_circulation',
  'vehicle_registration', 'insurance_memo', 'signature',
] as const;

export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
};
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_DOCS_PER_APPLICATION = 8;

export const uploadRequestSchema = z.object({
  applicationId: z.string().uuid(),
  uploadToken: z.string().min(20).max(200),
  docType: z.enum(DRIVER_DOC_TYPES),
  mimeType: z.string().refine((m) => m in ALLOWED_MIME, 'type de fichier non autorisé'),
  sizeBytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  captchaToken: z.string().max(4096).optional(),
});

export const documentAccessSchema = z.object({ documentId: z.string().uuid() });
