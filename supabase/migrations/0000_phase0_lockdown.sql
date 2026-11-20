-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 0 : VERROUILLAGE D'URGENCE DE LA BASE (à exécuter dans Supabase > SQL Editor)
--
-- Effet : plus personne (clé publique « anon » ni utilisateur connecté) ne peut lire, écrire ou
-- supprimer dans les tables du schéma public. Seules les fonctions serveur et la console
-- (rôle service_role / postgres) conservent l'accès.
--
-- ⚠️ AVANT DE L'EXÉCUTER : exporter les tables (voir docs/SECURITE_PHASE0.md, étape 1).
-- ⚠️ Conséquence voulue : l'ancien CRM cesse de fonctionner (il lisait la base avec la clé publique).
-- Ce script est rejouable sans danger.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Supprimer TOUTES les policies existantes du schéma public (elles autorisaient l'accès anonyme)
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2) Activer (et forcer) la RLS sur toutes les tables du schéma public : sans policy = accès refusé
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('alter table public.%I force row level security', r.tablename);
  end loop;
end $$;

-- 3) Retirer tous les droits aux rôles publics (défense en profondeur, en plus de la RLS)
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Les futures tables créées ne donneront aucun droit par défaut à anon / authenticated
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 4) Couper Realtime : plus d'abonnement possible aux changements des tables
do $$
declare r record;
begin
  for r in select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' loop
    execute format('alter publication supabase_realtime drop table %I.%I', r.schemaname, r.tablename);
  end loop;
end $$;

-- 5) Contrôle : doit afficher 0 ligne dans « policies_restantes » et rowsecurity = true partout
select 'policies_restantes' as controle, count(*) as valeur from pg_policies where schemaname = 'public'
union all
select 'tables_sans_rls', count(*) from pg_tables where schemaname = 'public' and not rowsecurity
union all
select 'tables_realtime_public', count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public';
