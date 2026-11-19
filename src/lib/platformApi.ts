// ─── Nordrive API Service ────────────────────────────────────────────────────
// Frontend service layer that calls Supabase Edge Functions
// Never talks directly to Uber/Bolt APIs — always goes through the secure backend

import { supabase, isSupabaseConfigured } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  recordsProcessed?: number;
  weekNumber?: number;
  year?: number;
  driversInFleet?: number;
  csvFallback?: boolean;
}

export interface SyncLog {
  id: string;
  platform: 'uber' | 'bolt';
  action: string;
  status: 'success' | 'error' | 'partial';
  records_count: number;
  details: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface PlatformStatus {
  enabled: boolean;
  hasCredentials: boolean;
  hasValidToken: boolean;
  fleetId: string | null;
  tokenExpiresAt?: string | null;
  csvFallback?: boolean;
}

// ─── Helper: Call Edge Function ──────────────────────────────────────────────

async function callEdgeFunction(functionName: string, body: Record<string, any>): Promise<any> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase non configuré. Ajoutez vos variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans le fichier .env');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok && !data.success) {
    throw new Error(data.error || data.message || `Erreur ${response.status}`);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UBER API
// ═══════════════════════════════════════════════════════════════════════════════

export const uberApi = {
  /**
   * Save Uber credentials securely on the backend
   */
  async saveCredentials(clientId: string, clientSecret: string, fleetId?: string): Promise<ApiResponse> {
    return callEdgeFunction('uber-auth', {
      action: 'save_credentials',
      clientId,
      clientSecret,
      fleetId,
    });
  },

  /**
   * Test connection by performing real OAuth2 token exchange
   */
  async testConnection(): Promise<ApiResponse> {
    return callEdgeFunction('uber-auth', {
      action: 'test_connection',
    });
  },

  /**
   * Get current Uber integration status
   */
  async getStatus(): Promise<ApiResponse<PlatformStatus>> {
    return callEdgeFunction('uber-auth', {
      action: 'get_status',
    });
  },

  /**
   * Sync earnings from Uber for a specific week
   */
  async syncEarnings(weekNumber?: number, year?: number): Promise<ApiResponse> {
    return callEdgeFunction('uber-sync', {
      weekNumber,
      year,
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOLT API
// ═══════════════════════════════════════════════════════════════════════════════

export const boltApi = {
  /**
   * Save Bolt credentials securely on the backend
   */
  async saveCredentials(clientId: string, clientSecret: string, fleetId?: string): Promise<ApiResponse> {
    return callEdgeFunction('bolt-sync', {
      action: 'save_credentials',
      clientId,
      clientSecret,
      fleetId,
    });
  },

  /**
   * Test Bolt connection
   */
  async testConnection(): Promise<ApiResponse> {
    return callEdgeFunction('bolt-sync', {
      action: 'test_connection',
    });
  },

  /**
   * Get current Bolt integration status
   */
  async getStatus(): Promise<ApiResponse<PlatformStatus>> {
    return callEdgeFunction('bolt-sync', {
      action: 'get_status',
    });
  },

  /**
   * Sync Bolt earnings via CSV data
   */
  async syncCsv(csvData: string, weekNumber?: number, year?: number): Promise<ApiResponse> {
    return callEdgeFunction('bolt-sync', {
      action: 'sync_csv',
      csvData,
      weekNumber,
      year,
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC LOGS
// ═══════════════════════════════════════════════════════════════════════════════

export const syncLogsApi = {
  /**
   * Fetch recent sync logs (read directly from Supabase — anon policy allows SELECT)
   */
  async getRecentLogs(limit = 20): Promise<SyncLog[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return [];
    }

    return (data || []) as SyncLog[];
  },

  /**
   * Fetch logs for a specific platform
   */
  async getLogsByPlatform(platform: 'uber' | 'bolt', limit = 10): Promise<SyncLog[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return [];
    }

    return (data || []) as SyncLog[];
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM EARNINGS (Raw data from APIs)
// ═══════════════════════════════════════════════════════════════════════════════

export const earningsApi = {
  /**
   * Fetch raw earnings for a specific week
   */
  async getWeekEarnings(weekNumber: number, year: number) {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('platform_earnings_raw')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', year)
      .order('platform', { ascending: true });

    if (error) {
      console.error('Error fetching earnings:', error);
      return [];
    }

    return data || [];
  },
};
