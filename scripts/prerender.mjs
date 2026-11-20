// Pré-rendu : génère un HTML complet pour chaque page du site.
//
// Pourquoi : le site est une application qui s'affiche dans le navigateur. Sans pré-rendu,
// le HTML envoyé aux robots est vide (<div id="root"></div>) et la plupart des robots des IA
// (ChatGPT, Claude, Perplexity…) ne l'exécutent pas. Ici on ouvre chaque page dans un vrai
// navigateur (Chrome ou Edge déjà installés), on capture le HTML obtenu et on l'enregistre :
//   dist/index.html, dist/parrainage.html, dist/faq.html, ...
// Les visiteurs reçoivent ce HTML puis l'application prend le relais comme avant.
//
// Les pages à générer sont lues dans public/sitemap.xml. Ne fait jamais échouer le build :
// sans navigateur, le site reste valide (simplement non pré-rendu).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createStaticServer } from './static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://nordrive-flotte.com';

function findBrowser() {
  const env = process.env.CHROME_PATH;
  const local = process.env.LOCALAPPDATA ?? '';
  const candidates = [
    env,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((c) => c && existsSync(c));
}

async function routesFromSitemap() {
  const xml = await readFile(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return urls.map((u) => (u.replace(SITE_URL, '') || '/').replace(/\/+$/, '') || '/');
}

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html introuvable : lancer d\'abord "vite build". Pré-rendu ignoré.');
    return;
  }
  const executablePath = findBrowser();
  if (!executablePath) {
    console.warn('[prerender] Aucun Chrome/Edge trouvé (variable CHROME_PATH possible). Pré-rendu ignoré : le site reste fonctionnel mais non pré-rendu.');
    return;
  }

  // + la page d'erreur 404 (adresse volontairement inconnue de l'application => page « introuvable »)
  const NOT_FOUND_ROUTE = '/page-introuvable';
  const routes = [...(await routesFromSitemap()), NOT_FOUND_ROUTE];
  const template = await readFile(path.join(DIST, 'index.html')); // gabarit d'origine, jamais écrasé avant la fin
  const server = createStaticServer(DIST, { indexHtml: template });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const results = [];

  try {
    for (const route of routes) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1280, height: 900 });
        // On ne charge que le site lui-même (pas de polices ni d'API externes) : plus rapide et déterministe.
        await page.setRequestInterception(true);
        page.on('request', (r) => (r.url().startsWith(origin) ? r.continue() : r.abort()));

        await page.goto(`${origin}${route}`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForFunction(
          () => document.querySelector('#root main') && document.querySelector('script#seo-jsonld') && document.querySelector('main h1, main h2'),
          { timeout: 15000 },
        );
        await new Promise((r) => setTimeout(r, 400));

        const html = await page.content();
        const file = route === '/' ? 'index.html' : route === NOT_FOUND_ROUTE ? '404.html' : `${route.slice(1)}.html`;
        await writeFile(path.join(DIST, file), html, 'utf8');
        const title = await page.title();
        results.push({ route, file, ok: true, bytes: Buffer.byteLength(html), title });
      } catch (err) {
        results.push({ route, ok: false, error: err.message });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  for (const r of results) {
    console.log(r.ok ? `[prerender] OK    ${r.route.padEnd(18)} -> ${r.file} (${(r.bytes / 1024).toFixed(0)} Ko) "${r.title}"` : `[prerender] ECHEC ${r.route}: ${r.error}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`[prerender] ${results.length - failed}/${results.length} pages pré-rendues.`);
}

main().catch((err) => {
  console.warn('[prerender] Erreur inattendue, pré-rendu ignoré :', err.message);
});
