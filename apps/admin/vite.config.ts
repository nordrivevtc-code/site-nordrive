import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));

// Application d'administration : build et déploiement SÉPARÉS du site public (autre sous-domaine, autre dossier).
export default defineConfig({
  root: here,
  envDir: path.resolve(here, '../..'), // même fichier .env.local que le site (variables VITE_*)
  plugins: [react()],
  build: { outDir: path.resolve(here, '../../dist-admin'), emptyOutDir: true, sourcemap: false },
  server: { port: 5175, strictPort: true },
});
