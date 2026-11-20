// Point d'entrée de la fonction « request-upload-url » : toute la logique est dans ../_shared/handlers.ts (testée).
import { requestUploadUrl } from '../_shared/handlers.ts';
import { realPorts } from '../_shared/supabase.ts';

Deno.serve((req) => requestUploadUrl(req, realPorts()));
