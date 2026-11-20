// Petit serveur statique qui imite les règles du .htaccess (OVH) :
//   fichier existant -> servi tel quel ; /page -> page.html ; sinon -> 404 (page 404.html) ou, pour le pré-rendu, index.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const isFile = (p) => existsSync(p) && statSync(p).isFile();

/**
 * @param {string} distDir dossier du site compilé (chemin absolu natif)
 * @param {{ indexHtml?: Buffer, spaFallback?: boolean, headers?: Record<string,string> }} [options]
 *   indexHtml   : contenu servi pour "/" (par défaut dist/index.html)
 *   spaFallback : true (pré-rendu) = toute route inconnue renvoie l'application ; false (aperçu OVH) = vraie 404
 *   headers     : en-têtes ajoutés à chaque réponse (ex. ceux du .htaccess)
 */
export function createStaticServer(distDir, options = {}) {
  const { spaFallback = true, headers = {} } = options;
  const send = (res, status, type, body) => {
    res.writeHead(status, { 'Content-Type': type, ...headers });
    res.end(body);
  };

  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const clean = pathname.replace(/\/+$/, '') || '/';
      const safe = path.normalize(path.join(distDir, clean));
      if (!safe.startsWith(distDir)) return send(res, 403, 'text/plain', 'Forbidden');

      let file = null;
      if (clean !== '/' && isFile(safe)) file = safe;
      else if (clean !== '/' && !path.extname(clean) && isFile(`${safe}.html`)) file = `${safe}.html`;

      if (file) return send(res, 200, MIME[path.extname(file)] ?? 'application/octet-stream', await readFile(file));

      if (clean === '/') return send(res, 200, MIME['.html'], options.indexHtml ?? (await readFile(path.join(distDir, 'index.html'))));

      // Route inconnue
      if (spaFallback) return send(res, 200, MIME['.html'], options.indexHtml ?? (await readFile(path.join(distDir, 'index.html'))));
      const notFound = path.join(distDir, '404.html');
      return send(res, 404, MIME['.html'], isFile(notFound) ? await readFile(notFound) : 'Not found');
    } catch (err) {
      send(res, 500, 'text/plain', String(err));
    }
  });
}
