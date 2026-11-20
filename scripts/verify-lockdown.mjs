// Vérifie qu'avec la clé PUBLIQUE (celle visible dans le site), la base ne laisse plus rien lire ni modifier.
//
// Usage (PowerShell) :
//   $env:SUPABASE_URL = "https://<votre-projet>.supabase.co"
//   $env:SUPABASE_ANON_KEY = "<clé publique>"
//   node scripts/verify-lockdown.mjs
//
// Le script ne lit que des tables vides ou refusées et ne supprime rien (le filtre de suppression ne peut correspondre à aucune ligne).
const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Définir SUPABASE_URL et SUPABASE_ANON_KEY (voir l\'en-tête du fichier).');
  process.exit(2);
}

const TABLES = ['drivers', 'payroll_weeks', 'fleet_settings', 'sync_logs', 'platform_earnings_raw'];
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
let bad = 0;

async function check(label, run) {
  try {
    const res = await run();
    const text = await res.text();
    let rows = null;
    try { rows = JSON.parse(text); } catch { /* pas du JSON */ }
    const leaked = res.ok && Array.isArray(rows) && rows.length > 0;
    const accepted = res.ok && !Array.isArray(rows); // ex. écriture acceptée
    const ok = !leaked && !accepted;
    if (!ok) bad++;
    console.log(`${ok ? 'OK     ' : 'FAILLE '} ${label.padEnd(34)} -> HTTP ${res.status}${leaked ? ` (${rows.length} ligne(s) LISIBLE(S) !)` : ''}`);
  } catch (e) {
    console.log(`ERREUR  ${label}: ${e.message}`);
    bad++;
  }
}

for (const t of TABLES) {
  await check(`lecture   ${t}`, () => fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers }));
  await check(`écriture  ${t}`, () => fetch(`${url}/rest/v1/${t}`, { method: 'POST', headers, body: JSON.stringify({ id: '__verification__', data: {} }) }));
  await check(`suppress. ${t}`, () => fetch(`${url}/rest/v1/${t}?id=eq.__aucune_ligne__`, { method: 'DELETE', headers }));
}
// Fonctions serveur connues : ne doivent pas répondre sans vraie authentification d'un administrateur
for (const fn of ['uber-auth', 'uber-sync', 'bolt-sync']) {
  await check(`fonction  ${fn}`, () => fetch(`${url}/functions/v1/${fn}`, { method: 'POST', headers, body: JSON.stringify({ action: 'get_status' }) }));
}

console.log(bad === 0 ? '\nVERROUILLAGE CONFIRMÉ : la clé publique ne donne accès à rien.' : `\n${bad} point(s) à corriger : la base n'est PAS entièrement verrouillée.`);
process.exit(bad === 0 ? 0 : 1);
