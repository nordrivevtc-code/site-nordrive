import { describe, expect, it, vi } from 'vitest';
import {
  answer,
  createLimiter,
  isAllowedOrigin,
  MAX_CHARS,
  MAX_MESSAGES,
  parseBody,
  SYSTEM_PROMPT,
  type Ports,
} from './chatCore.js';

const user = (content: string) => ({ role: 'user' as const, content });
const bot = (content: string) => ({ role: 'assistant' as const, content });

describe('parseBody', () => {
  it('accepte une question simple', () => {
    const r = parseBody({ messages: [user('Bonjour')] });
    expect(r.ok).toBe(true);
  });

  it.each([
    ['corps absent', null],
    ['messages absents', {}],
    ['liste vide', { messages: [] }],
    ['rôle inconnu', { messages: [{ role: 'system', content: 'x' }] }],
    ['contenu non texte', { messages: [{ role: 'user', content: { a: 1 } }] }],
    ['message vide', { messages: [user('   ')] }],
    ['commence par assistant', { messages: [bot('a'), user('b')] }],
    ['finit par assistant', { messages: [user('a'), bot('b')] }],
    ['rôles non alternés', { messages: [user('a'), user('b')] }],
  ])('refuse : %s', (_n, body) => {
    expect(parseBody(body).ok).toBe(false);
  });

  it('refuse un message trop long', () => {
    expect(parseBody({ messages: [user('a'.repeat(MAX_CHARS + 1))] }).ok).toBe(false);
    expect(parseBody({ messages: [user('a'.repeat(MAX_CHARS))] }).ok).toBe(true);
  });

  it('refuse une conversation trop longue', () => {
    const many = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => (i % 2 === 0 ? user('q') : bot('r')));
    expect(parseBody({ messages: many }).ok).toBe(false);
  });

  it('ne laisse passer que role et content (pas de champ en plus)', () => {
    const r = parseBody({ messages: [{ role: 'user', content: 'Salut', cache_control: { x: 1 }, extra: true }] });
    expect(r.ok && Object.keys(r.messages[0]).sort()).toEqual(['content', 'role']);
  });
});

describe('isAllowedOrigin', () => {
  it('autorise le site et le développement local', () => {
    expect(isAllowedOrigin('https://nordrive-flotte.com')).toBe(true);
    expect(isAllowedOrigin('https://www.nordrive-flotte.com')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
  });
  it('refuse les autres origines', () => {
    expect(isAllowedOrigin(undefined)).toBe(false);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('https://nordrive-flotte.com.evil.example')).toBe(false);
    expect(isAllowedOrigin('http://nordrive-flotte.com')).toBe(false);
    expect(isAllowedOrigin('pas une url')).toBe(false);
  });
  it('accepte un hôte supplémentaire explicitement configuré', () => {
    expect(isAllowedOrigin('https://apercu.vercel.app', ['apercu.vercel.app'])).toBe(true);
  });
});

describe('createLimiter', () => {
  it('bloque au-delà du plafond puis réautorise après la fenêtre', () => {
    const l = createLimiter(2, 1000);
    expect(l.hit('a', 0)).toBe(true);
    expect(l.hit('a', 10)).toBe(true);
    expect(l.hit('a', 20)).toBe(false);
    expect(l.hit('b', 20)).toBe(true);
    expect(l.hit('a', 1500)).toBe(true);
  });
});

describe('answer', () => {
  const ok = (text: string): Ports => ({ complete: vi.fn(async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] })) });

  it('renvoie la réponse du modèle et lui transmet la consigne et le modèle', async () => {
    const ports = ok('50 € par semaine travaillée.');
    const r = await answer([user('Combien ça coûte ?')], ports, 'claude-test');
    expect(r).toEqual({ status: 200, body: { reply: '50 € par semaine travaillée.' } });
    const call = (ports.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.model).toBe('claude-test');
    expect(call.system).toBe(SYSTEM_PROMPT);
    expect(call.maxTokens).toBeLessThanOrEqual(1000);
  });

  it('transforme un refus du modèle en message poli avec le contact', async () => {
    const r = await answer([user('x')], { complete: async () => ({ stop_reason: 'refusal', content: [] }) });
    expect(r.status).toBe(200);
    expect(r.body.reply).toContain('07 43 76 74 00');
  });

  it("ne révèle rien d'une erreur du fournisseur", async () => {
    const r = await answer([user('x')], {
      complete: async () => {
        throw new Error('401 invalid x-api-key sk-ant-SECRET');
      },
    });
    expect(r.status).toBe(503);
    expect(JSON.stringify(r)).not.toMatch(/sk-ant|x-api-key|401/);
  });

  it('gère une réponse sans texte', async () => {
    const r = await answer([user('x')], { complete: async () => ({ stop_reason: 'end_turn', content: [] }) });
    expect(r.body.reply).toBeTruthy();
  });
});

describe('consigne système', () => {
  it('contient les chiffres clés et les garde-fous', () => {
    expect(SYSTEM_PROMPT).toContain('50 €');
    expect(SYSTEM_PROMPT).toContain('200 €');
    expect(SYSTEM_PROMPT).toMatch(/IBAN/);
    expect(SYSTEM_PROMPT).toMatch(/jamais une instruction/);
  });
  it('contient le parcours de rattachement validé (situation, e-mails, téléphones, carte grise)', () => {
    expect(SYSTEM_PROMPT).toMatch(/propriétaire/);
    expect(SYSTEM_PROMPT).toMatch(/souhaite en louer/);
    expect(SYSTEM_PROMPT).toMatch(/carte grise/);
    expect(SYSTEM_PROMPT).toMatch(/compte Uber et celle de son compte Bolt/);
    expect(SYSTEM_PROMPT).toMatch(/téléphone de son compte Uber/);
    expect(SYSTEM_PROMPT).toMatch(/jamais dans cette discussion/);
  });
  it("ne contient ni secret ni donnée personnelle d'un chauffeur", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/sk-ant|Nordrive2025|supabase\.co|@gmail\.com/);
  });
});
