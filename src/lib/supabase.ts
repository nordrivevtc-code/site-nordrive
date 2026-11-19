import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || supabaseUrl === 'COLLER_VOTRE_PROJECT_URL_ICI') {
  console.warn('⚠️ Supabase URL manquante dans .env — mode localStorage activé en fallback.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseUrl !== 'COLLER_VOTRE_PROJECT_URL_ICI' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'COLLER_VOTRE_ANON_KEY_ICI'
  );
};
