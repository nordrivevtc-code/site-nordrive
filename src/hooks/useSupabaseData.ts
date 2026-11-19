import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Driver, DriverPayrollWeek, FleetSettings } from '../types/fleet';

// ─── Types ───────────────────────────────────────────────────────────────────

type TableName = 'drivers' | 'payroll_weeks' | 'fleet_settings';
type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error' | 'offline';

// ─── Hook générique : useSupabaseTable ───────────────────────────────────────
// Pour drivers[] et payrollWeeks[] — stockés comme lignes individuelles (id + data jsonb)

function useSupabaseTable<T extends { id: string }>(
  tableName: TableName,
  localKey: string,
  defaultValue: T[]
): [T[], (updater: ((prev: T[]) => T[]) | T[]) => void, SyncStatus, (ids: string[]) => Promise<void>] {
  const configured = isSupabaseConfigured();

  // Fallback : localStorage si pas de Supabase configuré
  const getLocal = (): T[] => {
    try { return JSON.parse(localStorage.getItem(localKey) || 'null') ?? defaultValue; }
    catch { return defaultValue; }
  };

  const [data, setData] = useState<T[]>(getLocal);
  const [status, setStatus] = useState<SyncStatus>(configured ? 'loading' : 'offline');
  const isMounted = useRef(true);
  // Quand ce flag est true, la subscription Realtime ne recharge PAS les données
  const pauseReload = useRef(false);

  // ─── Chargement initial depuis Supabase ──────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    if (!configured) { setStatus('offline'); return; }

    const load = async () => {
      // Si une suppression en masse est en cours, on ne recharge pas
      if (pauseReload.current) return;

      setStatus('loading');
      try {
        const { data: rows, error } = await supabase
          .from(tableName)
          .select('id, data')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (isMounted.current && !pauseReload.current) {
          const items = (rows || []).map((r: { id: string; data: T }) => r.data as T);
          setData(items);
          localStorage.setItem(localKey, JSON.stringify(items)); // cache local
          setStatus('idle');
        }
      } catch (err) {
        console.error(`[Supabase] Erreur chargement ${tableName}:`, err);
        if (isMounted.current) setStatus('error');
        // Fallback sur localStorage si Supabase échoue
        const cached = getLocal();
        if (isMounted.current) setData(cached);
      }
    };

    load();

    // ─── Realtime subscription ───────────────────────────────────────────
    const channel = supabase
      .channel(`nordrive-${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (_payload) => {
        if (!pauseReload.current) {
          load(); // Recharge les données à chaque changement (sauf si pause active)
        }
      })
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, tableName]);

  // ─── Setter qui écrit aussi dans Supabase ────────────────────────────────
  const setItems = useCallback((updater: ((prev: T[]) => T[]) | T[]) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      // Sauvegarder en local d'abord (UI réactive instantanée)
      localStorage.setItem(localKey, JSON.stringify(next));

      if (configured) {
        setStatus('syncing');

        // Calculer les diffs : upserts + suppressions
        const prevIds = new Set(prev.map(i => i.id));
        const nextIds = new Set(next.map(i => i.id));

        // Items à upsert (nouveau ou modifié)
        const toUpsert = next.map(item => ({ id: item.id, data: item }));

        // Items supprimés
        const toDelete = [...prevIds].filter(id => !nextIds.has(id));

        Promise.all([
          toUpsert.length > 0
            ? supabase.from(tableName).upsert(toUpsert, { onConflict: 'id' })
            : Promise.resolve({ error: null }),
          ...toDelete.map(id => supabase.from(tableName).delete().eq('id', id)),
        ])
          .then(results => {
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
              console.error(`[Supabase] Erreur sync ${tableName}:`, errors);
              setStatus('error');
            } else {
              setStatus('idle');
            }
          })
          .catch(err => {
            console.error(`[Supabase] Erreur sync ${tableName}:`, err);
            setStatus('error');
          });
      }

      return next;
    });
  }, [configured, tableName, localKey]);

  // ─── Suppression directe (bypass diff) — pour Vider/Purger ───────────────
  const directDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    // Pause la subscription Realtime pendant la suppression
    pauseReload.current = true;

    // Mettre à jour l'état local immédiatement
    setData(prev => {
      const idSet = new Set(ids);
      const next = prev.filter(item => !idSet.has(item.id));
      localStorage.setItem(localKey, JSON.stringify(next));
      return next;
    });

    // Supprimer par batches de 50 dans Supabase
    if (configured) {
      try {
        const BATCH = 50;
        for (let i = 0; i < ids.length; i += BATCH) {
          const batch = ids.slice(i, i + BATCH);
          const { error } = await supabase.from(tableName).delete().in('id', batch);
          if (error) {
            console.error(`[Supabase] Erreur suppression batch ${tableName}:`, error);
          }
        }
      } catch (err) {
        console.error(`[Supabase] Erreur directDelete ${tableName}:`, err);
      }
    }

    // Reprendre la subscription après 1.5 secondes
    setTimeout(() => {
      pauseReload.current = false;
    }, 1500);
  }, [configured, tableName, localKey]);

  return [data, setItems, status, directDelete];
}


// ─── Hook spécial : useSupabaseSingleton ─────────────────────────────────────
// Pour fleet_settings — une seule ligne avec id = 'singleton'

function useSupabaseSingleton<T>(
  localKey: string,
  defaultValue: T
): [T, (updater: ((prev: T) => T) | T) => void, SyncStatus] {
  const configured = isSupabaseConfigured();

  const getLocal = (): T => {
    try { return JSON.parse(localStorage.getItem(localKey) || 'null') ?? defaultValue; }
    catch { return defaultValue; }
  };

  const [data, setData] = useState<T>(getLocal);
  const [status, setStatus] = useState<SyncStatus>(configured ? 'loading' : 'offline');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!configured) { setStatus('offline'); return; }

    const load = async () => {
      setStatus('loading');
      try {
        const { data: row, error } = await supabase
          .from('fleet_settings')
          .select('data')
          .eq('id', 'singleton')
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

        if (isMounted.current) {
          const value = (row?.data as T) ?? defaultValue;
          setData(value);
          localStorage.setItem(localKey, JSON.stringify(value));
          setStatus('idle');
        }
      } catch (err) {
        console.error('[Supabase] Erreur chargement fleet_settings:', err);
        if (isMounted.current) setStatus('error');
      }
    };

    load();

    const channel = supabase
      .channel('nordrive-fleet_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_settings' }, load)
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const setValue = useCallback((updater: ((prev: T) => T) | T) => {
    setData(prev => {
      const next: T = typeof updater === 'function'
        ? (updater as (prev: T) => T)(prev)
        : updater;
      localStorage.setItem(localKey, JSON.stringify(next));

      if (configured) {
        setStatus('syncing');
        supabase
          .from('fleet_settings')
          .upsert({ id: 'singleton', data: next }, { onConflict: 'id' })
          .then(({ error }) => {
            setStatus(error ? 'error' : 'idle');
            if (error) console.error('[Supabase] Erreur sync fleet_settings:', error);
          });
      }

      return next;
    });
  }, [configured, localKey]);

  return [data, setValue, status];
}

// ─── Exports propres ─────────────────────────────────────────────────────────

export function useDrivers(defaultValue: Driver[]) {
  return useSupabaseTable<Driver>('drivers', 'nordrive_real_drivers', defaultValue);
}

export function usePayrollWeeks(defaultValue: DriverPayrollWeek[]) {
  return useSupabaseTable<DriverPayrollWeek>('payroll_weeks', 'nordrive_real_payroll', defaultValue);
}

export function useFleetSettings(defaultValue: FleetSettings) {
  return useSupabaseSingleton<FleetSettings>('nordrive_real_settings', defaultValue);
}

// ─── Sync Logs Hook (read-only, for displaying sync history) ─────────────────

export interface SyncLogEntry {
  id: string;
  platform: string;
  action: string;
  status: string;
  records_count: number;
  details: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export function useSyncLogs(limit = 20) {
  const configured = isSupabaseConfigured();
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [status, setStatus] = useState<SyncStatus>(configured ? 'loading' : 'offline');

  useEffect(() => {
    if (!configured) { setStatus('offline'); return; }

    const load = async () => {
      setStatus('loading');
      try {
        const { data, error } = await supabase
          .from('sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setLogs((data || []) as SyncLogEntry[]);
        setStatus('idle');
      } catch (err) {
        console.error('[Supabase] Error loading sync_logs:', err);
        setStatus('error');
      }
    };

    load();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('nordrive-sync_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [configured, limit]);

  return { logs, status };
}
