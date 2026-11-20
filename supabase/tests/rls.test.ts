import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Teste les règles d'accès (RLS) de 0001_secure_schema.sql sur un vrai PostgreSQL (PGlite).
 * Les pièces propres à Supabase (schéma auth, rôles, Vault) sont simulées ci-dessous.
 */

const U = {
  owner: '00000000-0000-0000-0000-000000000001',
  manager: '00000000-0000-0000-0000-000000000002',
  advisor: '00000000-0000-0000-0000-000000000003',
  accountant: '00000000-0000-0000-0000-000000000004',
  inactive: '00000000-0000-0000-0000-000000000005',
  stranger: '00000000-0000-0000-0000-000000000006', // connecté mais sans profil
};
const IBAN = 'FR7630006000011234567890189';

const PUBLIC_TABLES = [
  'profiles', 'applications', 'inbound_messages', 'drivers', 'driver_documents', 'driver_banking',
  'platform_enrollments', 'activities', 'payroll_weeks', 'fleet_settings', 'audit_log', 'rate_limits',
];

let db: PGlite;
let driverId: string;
let appId: string;
let docId: string;

/** Exécute `fn` comme le ferait Supabase : rôle Postgres + claims JWT (sub, aal) */
async function as<T>(role: 'anon' | 'authenticated' | 'service_role', claims: { sub?: string; aal?: 'aal1' | 'aal2' }, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
const staff = (who: keyof typeof U, aal: 'aal1' | 'aal2' = 'aal2') => ({ sub: U[who], aal });
const count = async (table: string) => Number((await db.query<{ n: string }>(`select count(*)::text as n from public.${table}`)).rows[0].n);

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });

  // — Éléments fournis par Supabase, simulés pour le test —
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    create schema vault;
    create view vault.decrypted_secrets as select 'iban_encryption_key'::text as name, 'cle-de-test-0123456789'::text as decrypted_secret;
    grant usage on schema vault to postgres;
  `);
  for (const [name, id] of Object.entries(U)) await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${name}@test.local`]);

  // — Migration à tester —
  await db.exec(readFileSync(path.resolve(__dirname, '../migrations/0001_secure_schema.sql'), 'utf8'));

  // — Données de test (créées en tant que propriétaire de la base, hors RLS) —
  await db.exec(`
    insert into public.profiles (user_id, role, full_name, active) values
      ('${U.owner}', 'owner', 'Owner', true), ('${U.manager}', 'manager', 'Manager', true),
      ('${U.advisor}', 'advisor', 'Advisor', true), ('${U.accountant}', 'accountant', 'Accountant', true),
      ('${U.inactive}', 'advisor', 'Inactif', false);
    insert into public.applications (first_name, last_name, phone, email, city, vtc_card_status, consent_rgpd)
      values ('Alice', 'Exemple', '0612345678', 'alice@example.com', 'Paris', 'oui', true);
  `);
  appId = (await db.query<{ id: string }>(`select id from public.applications limit 1`)).rows[0].id;
  await db.exec(`
    insert into public.driver_documents (application_id, doc_type, storage_path, mime_type, size_bytes)
      values ('${appId}', 'vtc_card_front', 'applications/${appId}/vtc_card_front.jpg', 'image/jpeg', 12345);
    insert into public.drivers (first_name, last_name, phone, city) values ('Bob', 'Exemple', '0701020304', 'Lyon');
  `);
  driverId = (await db.query<{ id: string }>(`select id from public.drivers limit 1`)).rows[0].id;
  docId = (await db.query<{ id: string }>(`select id from public.driver_documents limit 1`)).rows[0].id;
  await db.exec(`insert into public.payroll_weeks (driver_id, year, week, gross, fees, net) values ('${driverId}', 2026, 46, 1000, 50, 950);`);
});

afterAll(async () => {
  await db.close();
});

describe('anon (clé publique du site) : aucun accès', () => {
  for (const table of PUBLIC_TABLES) {
    it(`ne peut ni lire, ni écrire, ni supprimer ${table}`, async () => {
      await as('anon', {}, async () => {
        await expect(db.query(`select * from public.${table} limit 1`)).rejects.toThrow(/permission denied/i);
        await expect(db.query(`delete from public.${table}`)).rejects.toThrow(/permission denied/i);
        await expect(db.query(`update public.${table} set id = id`)).rejects.toThrow(/permission denied|column|does not exist/i);
      });
    });
  }
  it('ne peut appeler aucune fonction d\'administration', async () => {
    await as('anon', {}, async () => {
      await expect(db.query(`select public.get_driver_iban('${driverId}')`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`select public.promote_application('${appId}')`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`select public.request_document_access('${docId}')`)).rejects.toThrow(/permission denied/i);
    });
  });
  it('ne voit pas l\'annuaire des chauffeurs', async () => {
    await as('anon', {}, async () => {
      await expect(db.query(`select * from public.driver_directory`)).rejects.toThrow(/permission denied/i);
    });
  });
});

describe('limitation de débit (rate_limit_hit)', () => {
  it('compte les appels par clé pour service_role, et reste interdite à anon et aux connectés', async () => {
    await as('service_role', {}, async () => {
      const hits: number[] = [];
      for (let i = 0; i < 3; i++) hits.push((await db.query<{ n: number }>(`select public.rate_limit_hit('test:a', 3600) as n`)).rows[0].n);
      expect(hits).toEqual([1, 2, 3]);
      expect((await db.query<{ n: number }>(`select public.rate_limit_hit('test:b', 3600) as n`)).rows[0].n).toBe(1);
    });
    await as('anon', {}, async () => {
      await expect(db.query(`select public.rate_limit_hit('x', 60)`)).rejects.toThrow(/permission denied/i);
    });
    await as('authenticated', staff('owner'), async () => {
      await expect(db.query(`select public.rate_limit_hit('x', 60)`)).rejects.toThrow(/permission denied/i);
    });
  });
});

describe('utilisateur connecté sans droit', () => {
  it('sans profil : ne voit rien', async () => {
    await as('authenticated', staff('stranger'), async () => {
      for (const t of ['applications', 'drivers', 'driver_documents', 'payroll_weeks', 'audit_log']) expect(await count(t)).toBe(0);
    });
  });
  it('profil désactivé : ne voit rien', async () => {
    await as('authenticated', staff('inactive'), async () => {
      expect(await count('applications')).toBe(0);
      expect(await count('drivers')).toBe(0);
    });
  });
  it('sans double authentification (aal1) : ne voit rien, même avec un bon rôle', async () => {
    for (const who of ['owner', 'manager', 'advisor', 'accountant'] as const) {
      await as('authenticated', staff(who, 'aal1'), async () => {
        for (const t of ['applications', 'drivers', 'driver_documents', 'payroll_weeks', 'fleet_settings', 'profiles']) expect(await count(t)).toBe(0);
        await expect(db.query(`select public.get_driver_iban('${driverId}')`)).rejects.toThrow(/accès refusé/);
        await expect(db.query(`select public.promote_application('${appId}')`)).rejects.toThrow(/accès refusé/);
      });
    }
  });
});

describe('conseiller (advisor, MFA)', () => {
  it('voit candidatures, chauffeurs et documents, mais ni la paie ni l\'audit', async () => {
    await as('authenticated', staff('advisor'), async () => {
      expect(await count('applications')).toBe(1);
      expect(await count('drivers')).toBe(1);
      expect(await count('driver_documents')).toBe(1);
      expect(await count('payroll_weeks')).toBe(0);
      expect(await count('audit_log')).toBe(0);
      expect(await count('fleet_settings')).toBe(0);
    });
  });
  it('ne peut pas toucher aux IBAN ni lire driver_banking', async () => {
    await as('authenticated', staff('advisor'), async () => {
      await expect(db.query(`select public.get_driver_iban('${driverId}')`)).rejects.toThrow(/accès refusé/);
      await expect(db.query(`select public.set_driver_iban('${driverId}', '${IBAN}')`)).rejects.toThrow(/accès refusé/);
      await expect(db.query(`select * from public.driver_banking`)).rejects.toThrow(/permission denied/i);
    });
  });
  it('ne peut pas supprimer un chauffeur', async () => {
    await as('authenticated', staff('advisor'), async () => {
      const r = await db.query(`delete from public.drivers where id = '${driverId}' returning id`);
      expect(r.rows.length).toBe(0);
    });
    expect(await count('drivers')).toBe(1);
  });
  it('journalise l\'ouverture d\'un document', async () => {
    const before = await count('audit_log');
    await as('authenticated', staff('advisor'), async () => {
      const r = await db.query<{ request_document_access: string }>(`select public.request_document_access('${docId}')`);
      expect(r.rows[0].request_document_access).toContain('vtc_card_front');
    });
    const rows = (await db.query<{ action: string; actor_role: string }>(`select action, actor_role from public.audit_log order by id desc limit 1`)).rows;
    expect(await count('audit_log')).toBe(before + 1);
    expect(rows[0]).toEqual({ action: 'VIEW_DOCUMENT', actor_role: 'advisor' });
  });
  it('ne peut écrire une note qu\'en son nom', async () => {
    await as('authenticated', staff('advisor'), async () => {
      await expect(db.query(`insert into public.activities (driver_id, kind, content, author) values ('${driverId}', 'note', 'x', '${U.owner}')`)).rejects.toThrow(/row-level security/i);
      await db.query(`insert into public.activities (driver_id, kind, content, author) values ('${driverId}', 'note', 'ok', '${U.advisor}')`);
    });
  });
});

describe('comptable (accountant, MFA)', () => {
  it('voit la paie et l\'annuaire minimal, pas les candidatures ni les chauffeurs détaillés ni les documents', async () => {
    await as('authenticated', staff('accountant'), async () => {
      expect(await count('payroll_weeks')).toBe(1);
      expect(await count('applications')).toBe(0);
      expect(await count('drivers')).toBe(0);
      expect(await count('driver_documents')).toBe(0);
      const dir = await db.query<{ first_name: string }>(`select * from public.driver_directory`);
      expect(dir.rows.length).toBe(1);
      expect(Object.keys(dir.rows[0]).sort()).toEqual(['first_name', 'id', 'last_name']);
      await expect(db.query(`select public.request_document_access('${docId}')`)).rejects.toThrow(/accès refusé/);
      await expect(db.query(`select public.promote_application('${appId}')`)).rejects.toThrow(/accès refusé/);
    });
  });
  it('enregistre et relit un IBAN, chiffré en base, avec traces d\'audit', async () => {
    await as('authenticated', staff('accountant'), async () => {
      await db.query(`select public.set_driver_iban('${driverId}', ' fr76 3000 6000 0112 3456 7890 189 ', 'agrifrpp')`);
      const r = await db.query<{ get_driver_iban: string }>(`select public.get_driver_iban('${driverId}')`);
      expect(r.rows[0].get_driver_iban).toBe(IBAN);
      await expect(db.query(`select * from public.driver_banking`)).rejects.toThrow(/permission denied/i);
    });
    const raw = (await db.query<{ t: string }>(`select encode(iban_enc, 'escape') as t from public.driver_banking`)).rows[0].t;
    expect(raw).not.toContain('FR76');
    expect(raw).not.toContain(IBAN);
    const actions = (await db.query<{ action: string }>(`select action from public.audit_log where action in ('SET_IBAN','READ_IBAN') order by id`)).rows.map((r) => r.action);
    expect(actions).toEqual(['SET_IBAN', 'READ_IBAN']);
  });
  it('refuse un IBAN invalide', async () => {
    await as('authenticated', staff('accountant'), async () => {
      await expect(db.query(`select public.set_driver_iban('${driverId}', 'pas-un-iban')`)).rejects.toThrow(/IBAN invalide/);
    });
  });
});

describe('responsable (manager, MFA)', () => {
  it('lit la paie et les réglages mais ne peut pas les modifier', async () => {
    await as('authenticated', staff('manager'), async () => {
      expect(await count('payroll_weeks')).toBe(1);
      expect(await count('fleet_settings')).toBe(1);
      await expect(db.query(`insert into public.payroll_weeks (driver_id, year, week) values ('${driverId}', 2026, 47)`)).rejects.toThrow(/row-level security/i);
      const r = await db.query(`update public.fleet_settings set data = '{"x":1}' returning id`);
      expect(r.rows.length).toBe(0);
      await expect(db.query(`select public.get_driver_iban('${driverId}')`)).rejects.toThrow(/accès refusé/);
    });
  });
});

describe('transformer une candidature en chauffeur', () => {
  it('fonctionne pour un conseiller (reprend les documents), pas deux fois', async () => {
    let newDriver = '';
    await as('authenticated', staff('advisor'), async () => {
      const r = await db.query<{ promote_application: string }>(`select public.promote_application('${appId}')`);
      newDriver = r.rows[0].promote_application;
      await expect(db.query(`select public.promote_application('${appId}')`)).rejects.toThrow(/déjà traitée/);
    });
    const d = (await db.query<{ status: string; first_name: string }>(`select status, first_name from public.drivers where id = '${newDriver}'`)).rows[0];
    expect(d).toEqual({ status: 'docs_received', first_name: 'Alice' });
    const doc = (await db.query<{ driver_id: string }>(`select driver_id from public.driver_documents where id = '${docId}'`)).rows[0];
    expect(doc.driver_id).toBe(newDriver);
  });
});

describe('propriétaire (owner, MFA) et journal d\'audit', () => {
  it('lit l\'audit et gère les profils', async () => {
    await as('authenticated', staff('owner'), async () => {
      expect(await count('audit_log')).toBeGreaterThan(0);
      expect(await count('profiles')).toBe(5);
    });
  });
  it('journal en ajout seul : impossible de le modifier ou de le vider', async () => {
    await as('authenticated', staff('owner'), async () => {
      await expect(db.query(`update public.audit_log set action = 'x'`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`delete from public.audit_log`)).rejects.toThrow(/permission denied/i);
    });
    // même le propriétaire de la base est bloqué par le déclencheur
    await expect(db.exec(`update public.audit_log set action = 'x'`)).rejects.toThrow(/ajout seul/);
    await expect(db.exec(`delete from public.audit_log`)).rejects.toThrow(/ajout seul/);
  });
  it('trace les modifications sans copier les données personnelles', async () => {
    await as('authenticated', staff('owner'), async () => {
      await db.query(`update public.drivers set city = 'Marseille' where id = '${driverId}'`);
    });
    const row = (await db.query<{ details: { changed_columns: string[] }; actor_role: string }>(
      `select details, actor_role from public.audit_log where table_name = 'drivers' and action = 'UPDATE' order by id desc limit 1`,
    )).rows[0];
    expect(row.actor_role).toBe('owner');
    expect(row.details.changed_columns).toContain('city');
    expect(JSON.stringify(row.details)).not.toContain('Marseille');
  });
  it('rate_limits n\'est accessible à personne côté API', async () => {
    await as('authenticated', staff('owner'), async () => {
      await expect(db.query(`select * from public.rate_limits`)).rejects.toThrow(/permission denied/i);
    });
  });
});
