import { describe, expect, it } from 'vitest';
import { buildPayload } from './ChatWidget';

const u = (content: string) => ({ role: 'user' as const, content });
const a = (content: string) => ({ role: 'assistant' as const, content });

describe('buildPayload', () => {
  it("retire un message d'assistant placé en tête (l'API exige de commencer par une question)", () => {
    expect(buildPayload([a('Bonjour !')], 'Salut')).toEqual([u('Salut')]);
  });

  it('garde au plus 11 messages et commence toujours par une question', () => {
    const history = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? u(`q${i}`) : a(`r${i}`)));
    const payload = buildPayload(history, 'dernière');
    expect(payload.length).toBeLessThanOrEqual(11);
    expect(payload[0].role).toBe('user');
    expect(payload[payload.length - 1]).toEqual(u('dernière'));
    for (let i = 1; i < payload.length; i++) expect(payload[i].role).not.toBe(payload[i - 1].role);
  });
});
