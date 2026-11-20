// Point d'entrée de la fonction « submit-contact » : toute la logique est dans ../_shared/handlers.ts (testée).
import { submitMessage } from '../_shared/handlers.ts';
import { realPorts } from '../_shared/supabase.ts';

Deno.serve((req) => submitMessage('contact')(req, realPorts()));
