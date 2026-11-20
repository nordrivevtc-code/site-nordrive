// Point d'entrée de la fonction « submit-application » : toute la logique est dans ../_shared/handlers.ts (testée).
import { submitApplication } from '../_shared/handlers.ts';
import { realPorts } from '../_shared/supabase.ts';

Deno.serve((req) => submitApplication(req, realPorts()));
