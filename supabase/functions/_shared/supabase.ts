// Raccordement des `Ports` à Supabase (exécuté uniquement par Deno, dans les Edge Functions).
// Volontairement sans logique : toute la logique de sécurité est dans core.ts / handlers.ts (testée).
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { Ports } from './core.ts';

const BUCKET = 'driver-documents';

export function realPorts(): Ports {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // fournie automatiquement ; JAMAIS exposée au navigateur
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const insert = async (table: string, row: Record<string, unknown>) => {
    const { data, error } = await admin.from(table).insert(row).select('id').single();
    if (error) throw error;
    return data as { id: string };
  };

  return {
    env: Deno.env.toObject(),
    fetch,
    now: () => new Date(),

    rateLimit: async (key, seconds) => {
      const { data, error } = await admin.rpc('rate_limit_hit', { p_key: key, p_window_seconds: seconds });
      if (error) throw error;
      return data as number;
    },

    insertApplication: (row) => insert('applications', row),
    insertMessage: (kind, payload) => insert('inbound_messages', { kind, payload }),

    getApplicationUpload: async (id) => {
      const { data } = await admin.from('applications').select('upload_token_hash, upload_expires_at').eq('id', id).maybeSingle();
      if (!data) return null;
      const { count } = await admin.from('driver_documents').select('id', { count: 'exact', head: true }).eq('application_id', id);
      return { uploadTokenHash: data.upload_token_hash, uploadExpiresAt: data.upload_expires_at, docCount: count ?? 0 };
    },

    createSignedUpload: async (path) => {
      const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      return { signedUrl: data.signedUrl, token: data.token };
    },

    insertDocument: async (row) => {
      await insert('driver_documents', row);
    },

    // Notification interne par e-mail (Resend). Silencieuse si non configurée ; n'échoue jamais.
    notify: async (subject, text) => {
      const key = Deno.env.get('RESEND_API_KEY');
      const to = Deno.env.get('NOTIFY_EMAIL_TO');
      const from = Deno.env.get('NOTIFY_EMAIL_FROM');
      if (!key || !to || !from) return;
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), subject, text }),
        });
      } catch {
        /* la notification ne doit jamais faire échouer l'enregistrement */
      }
    },

    // Exécute une fonction SQL AVEC L'IDENTITÉ de l'administrateur (son JWT) : la base contrôle rôle, MFA et audit.
    rpcAsUser: async (jwt, fn, args) => {
      const asUser = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
      const { data, error } = await asUser.rpc(fn, args);
      return { data, error: error?.message ?? null };
    },

    signDownload: async (path, seconds) => {
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, seconds);
      if (error) throw error;
      return data.signedUrl;
    },
  };
}
