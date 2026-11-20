// Point d'entrée de la fonction « document-url » : toute la logique est dans ../_shared/handlers.ts (testée).
import { documentAccess } from '../_shared/handlers.ts';
import { realPorts } from '../_shared/supabase.ts';

Deno.serve((req) => documentAccess(req, realPorts()));
