import { describe, expect, it } from 'vitest';
import { purgeLegacyData } from './legacyCleanup.ts';

/** Faux stockage minimal (même interface que localStorage) */
function fakeStorage(initial: Record<string, string>): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  } as Storage;
}

describe('nettoyage des anciennes données de chauffeurs', () => {
  it('supprime toutes les anciennes clés, y compris plusieurs à la suite', () => {
    const local = fakeStorage({
      nordrive_real_drivers: '[{"x":1}]', nordrive_real_payroll: '[]', nordrive_real_settings: '{}',
      nordrive_real_vehicles: '[]', nordrive_real_fines: '[]', nordrive_real_contracts: '[]', nordrive_real_maintenances: '[]',
      nordrive_api_settings: '{"clientSecret":"x"}', nordrive_trusted_device_token_v2: 'tok',
      'sb-abcdefghij-auth-token': '{"access_token":"x"}',
    });
    const session = fakeStorage({ nordrive_admin_auth: 'authenticated' });
    const removed = purgeLegacyData(local, session);
    expect(removed).toHaveLength(11);
    expect(local.length).toBe(0);
    expect(session.length).toBe(0);
  });

  it('ne touche jamais aux clés actuelles ni aux données étrangères au site', () => {
    const local = fakeStorage({
      'nordrive:no-analytics': '1', 'nordrive:portal-urls': '{}', theme: 'dark', 'autre-site': 'x',
      nordrive_real_drivers: '[]',
    });
    const session = fakeStorage({ cle_quelconque: 'x' });
    purgeLegacyData(local, session);
    expect(local.getItem('nordrive:no-analytics')).toBe('1');
    expect(local.getItem('nordrive:portal-urls')).toBe('{}');
    expect(local.getItem('theme')).toBe('dark');
    expect(local.getItem('autre-site')).toBe('x');
    expect(local.getItem('nordrive_real_drivers')).toBeNull();
    expect(session.getItem('cle_quelconque')).toBe('x');
  });

  it('ne fait rien quand il n\'y a rien à nettoyer', () => {
    expect(purgeLegacyData(fakeStorage({}), fakeStorage({}))).toEqual([]);
  });
});
