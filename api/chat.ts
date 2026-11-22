// Fonction serveur Vercel : POST /api/chat
// La clé ANTHROPIC_API_KEY est lue dans l'environnement Vercel (jamais dans le code ni dans le navigateur).
import Anthropic from '@anthropic-ai/sdk';
import { answer, createLimiter, DEFAULT_MODEL, isAllowedOrigin, parseBody, type Ports } from '../server/chatCore.js';

// 15 questions par IP et par 10 minutes ; plafond global de 600 questions par heure et par instance.
const perIp = createLimiter(15, 10 * 60_000);
const global = createLimiter(600, 60 * 60_000);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

let client: Anthropic | null = null;

function ports(): Ports {
  client ??= new Anthropic(); // lit ANTHROPIC_API_KEY
  const c = client;
  return {
    async complete({ model, system, messages, maxTokens }) {
      const res = await c.beta.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages,
        output_config: { effort: 'low' },
        // Repli côté serveur si le modèle refuse (option recommandée par Anthropic)
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
      return { stop_reason: res.stop_reason, content: res.content as Array<{ type: string; text?: string }> };
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "L'assistant n'est pas encore activé. Écrivez-nous sur WhatsApp au 07 43 76 74 00." });

  const extra = (process.env.CHAT_ALLOWED_HOSTS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!isAllowedOrigin(request.headers.get('origin'), extra)) return json(403, { error: 'Origine non autorisée.' });

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'inconnu';
  if (!perIp.hit(ip) || !global.hit('global')) return json(429, { error: 'Trop de questions pour le moment. Réessayez dans quelques minutes ou écrivez-nous sur WhatsApp.' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }
  const parsed = parseBody(body);
  if (!parsed.ok) return json(400, { error: parsed.error });

  const result = await answer(parsed.messages, ports(), process.env.CHAT_MODEL || DEFAULT_MODEL);
  return json(result.status, result.body);
}
