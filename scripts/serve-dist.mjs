// Sert le dossier dist/ comme le ferait OVH : mêmes règles de pages, de 404 et mêmes en-têtes de sécurité
// (lus dans public/.htaccess). Usage : node scripts/serve-dist.mjs [port]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/** Lit les lignes `Header always set <Nom> "<valeur>"` du .htaccess */
function headersFromHtaccess() {
  const headers = {};
  for (const line of readFileSync(path.join(ROOT, 'public', '.htaccess'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*Header\s+always\s+set\s+(\S+)\s+"(.*)"\s*$/i);
    if (m) headers[m[1]] = m[2];
  }
  return headers;
}

const port = Number(process.argv[2] ?? 4173);
createStaticServer(DIST, { spaFallback: false, headers: headersFromHtaccess() }).listen(port, '127.0.0.1', () =>
  console.log(`Site compilé (règles OVH, en-têtes de sécurité, vraie 404) : http://127.0.0.1:${port}`),
);
