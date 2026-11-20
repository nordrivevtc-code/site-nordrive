import { PublicPortal } from './components/PublicPortal';

/**
 * Application du site PUBLIC (celle qui est déployée sur nordrive-flotte.com).
 *
 * Sécurité : elle n'importe NI le CRM, NI la connexion admin, NI les données d'exemple, NI le
 * client Supabase. Elle ne lit donc aucune donnée de chauffeur. Les formulaires envoient
 * leurs données par e-mail / WhatsApp (en attendant les fonctions serveur de la phase 1).
 *
 * L'ancienne application d'administration (connexion en dur, données d'exemple, client de base ouvert au public)
 * a été supprimée. Elle est remplacée par apps/admin (Supabase Auth + double authentification + rôles).
 */
const noop = () => undefined;

export function PublicApp() {
  return <PublicPortal onRegisterDriver={noop} onOpenAdminCrm={noop} drivers={[]} />;
}
