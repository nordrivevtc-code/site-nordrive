import { defineConfig } from 'vitest/config';

// Tests de sécurité : règles d'accès de la base (PGlite = vrai PostgreSQL en mémoire) et logique des Edge Functions.
export default defineConfig({
  test: {
    include: ['supabase/**/*.test.ts', 'src/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
