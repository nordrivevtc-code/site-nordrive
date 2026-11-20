import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;
const API_URL = env.VITE_API_URL?.replace(/\/+$/, '');
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? API_URL?.replace(/\/functions\/v1$/, '');
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Client « navigateur » : n'a que la clé PUBLIQUE. Ce que l'utilisateur peut lire ou écrire dépend uniquement
 * de son rôle et de sa session à double authentification, vérifiés PAR LA BASE (RLS), pas par ce code.
 */
export const supabase = createClient(SUPABASE_URL ?? 'http://localhost:54321', ANON_KEY ?? 'non-configure', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';
