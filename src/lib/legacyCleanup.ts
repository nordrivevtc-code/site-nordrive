/**
 * Efface, chez les visiteurs qui reviennent, les anciennes copies locales de données de chauffeurs.
 *
 * Contexte : l'ancienne version du site chargeait la liste des chauffeurs (et la paie) dans le navigateur de
 * CHAQUE visiteur et la gardait dans le stockage local (clés « nordrive_real_drivers », « nordrive_real_payroll »,
 * identifiants API, jeton d'appareil, session de l'ancienne base…). Ces copies restent sur les appareils tant qu'on
 * ne les supprime pas : ce nettoyage les retire dès la prochaine visite.
 *
 * Les clés actuelles du site utilisent « : » (ex. « nordrive:no-analytics ») et ne sont jamais touchées.
 */
const LEGACY_LOCAL = /^(nordrive_|sb-.*-auth-token$)/; // anciennes clés « nordrive_… » et session de l'ancien client de base
const LEGACY_SESSION = /^nordrive_/;

export function purgeLegacyData(local: Storage, session: Storage): string[] {
  const removed: string[] = [];
  for (const [store, pattern] of [[local, LEGACY_LOCAL], [session, LEGACY_SESSION]] as const) {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && pattern.test(key)) keys.push(key);
    }
    for (const key of keys) {
      store.removeItem(key);
      removed.push(key);
    }
  }
  return removed;
}

/** À appeler une fois au démarrage du site. Ne lève jamais d'erreur (stockage indisponible, navigation privée…). */
export function runLegacyCleanup(): void {
  try {
    purgeLegacyData(window.localStorage, window.sessionStorage);
  } catch {
    /* stockage inaccessible : rien à nettoyer */
  }
}
