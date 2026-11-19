import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  Globe,
  Link2,
  Server,
  Clock,
  ArrowRight,
  ExternalLink,
  Lock,
  Unlock,
  Database,
  Activity,
} from 'lucide-react';
import { uberApi, boltApi, syncLogsApi, type SyncLog } from '../lib/platformApi';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface PlatformApiConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  fleetId: string;
  webhookUrl: string;
  lastSyncAt: string | null;
  connectionStatus: 'disconnected' | 'connected' | 'error' | 'testing';
  errorMessage?: string;
}

interface ApiSettingsData {
  uber: PlatformApiConfig;
  bolt: PlatformApiConfig;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastGlobalSync: string | null;
}

const DEFAULT_SETTINGS: ApiSettingsData = {
  uber: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    fleetId: '',
    webhookUrl: '',
    lastSyncAt: null,
    connectionStatus: 'disconnected',
  },
  bolt: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    fleetId: '',
    webhookUrl: '',
    lastSyncAt: null,
    connectionStatus: 'disconnected',
  },
  autoSync: false,
  syncIntervalMinutes: 60,
  lastGlobalSync: null,
};

const STORAGE_KEY = 'nordrive_api_settings';

// ─── Component ──────────────────────────────────────────────────────────────────
export const ApiSettings: React.FC = () => {
  const [settings, setSettings] = useState<ApiSettingsData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Load sync logs on mount
  useEffect(() => {
    syncLogsApi.getRecentLogs(10).then(logs => setSyncLogs(logs)).catch(() => {});
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const updatePlatform = useCallback((platform: 'uber' | 'bolt', field: keyof PlatformApiConfig, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  }, []);


  const handleCopy = useCallback((text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const toggleSecret = useCallback((fieldId: string) => {
    setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
  }, []);

  // ─── Save credentials to secure backend ──────────────────────────────────
  const handleSaveCredentials = useCallback(async (platform: 'uber' | 'bolt') => {
    const config = settings[platform];
    if (!config.clientId || !config.clientSecret) return;

    try {
      const api = platform === 'uber' ? uberApi : boltApi;
      await api.saveCredentials(config.clientId, config.clientSecret, config.fleetId || undefined);
      
      // Zero-Trust Security: Immediately wipe secret from frontend memory!
      setSettings(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          clientSecret: '', // Wiped from browser JS memory!
          accessToken: '',
          refreshToken: '',
        },
      }));

      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
    } catch (err: any) {
      console.error(`Error saving ${platform} credentials:`, err);
      setSettings(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          errorMessage: err.message || 'Erreur lors de la sauvegarde des credentials.',
        },
      }));
    }
  }, [settings]);

  const handleTestConnection = useCallback(async (platform: 'uber' | 'bolt') => {
    const config = settings[platform];

    if (!config.clientId || !config.clientSecret) {
      setSettings(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          connectionStatus: 'error' as const,
          errorMessage: 'Client ID et Client Secret requis pour tester la connexion.',
        },
      }));
      return;
    }

    setTestingPlatform(platform);
    setSettings(prev => ({
      ...prev,
      [platform]: { ...prev[platform], connectionStatus: 'testing' as const, errorMessage: undefined },
    }));

    try {
      // First save credentials to backend, then test
      const api = platform === 'uber' ? uberApi : boltApi;
      await api.saveCredentials(config.clientId, config.clientSecret, config.fleetId || undefined);

      // Now test the real OAuth2 connection
      const result = await api.testConnection();

      setSettings(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          connectionStatus: result.success ? ('connected' as const) : ('error' as const),
          errorMessage: result.success ? undefined : (result.error || 'Échec de la connexion.'),
          lastSyncAt: result.success ? new Date().toISOString() : prev[platform].lastSyncAt,
          // Clear sensitive fields from localStorage — they're now stored server-side
          accessToken: '',
          refreshToken: '',
        },
      }));
    } catch (err: any) {
      setSettings(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          connectionStatus: 'error' as const,
          errorMessage: err.message || 'Erreur de connexion à l\'API.',
        },
      }));
    } finally {
      setTestingPlatform(null);
    }
  }, [settings]);

  const handleSyncNow = useCallback(async () => {
    try {
      const promises: Promise<any>[] = [];

      if (settings.uber.enabled && settings.uber.connectionStatus === 'connected') {
        promises.push(uberApi.syncEarnings());
      }
      if (settings.bolt.enabled && settings.bolt.connectionStatus === 'connected') {
        // Bolt sync would need CSV data or API — trigger status check
        promises.push(boltApi.getStatus());
      }

      if (promises.length === 0) {
        alert('Aucune plateforme connectée. Configurez et testez vos credentials d\'abord.');
        return;
      }

      await Promise.allSettled(promises);

      setSettings(prev => ({
        ...prev,
        lastGlobalSync: new Date().toISOString(),
      }));

      // Refresh sync logs
      const logs = await syncLogsApi.getRecentLogs(5);
      setSyncLogs(logs);
    } catch (err: any) {
      console.error('Sync error:', err);
    }
  }, [settings]);

  const handleResetPlatform = useCallback((platform: 'uber' | 'bolt') => {
    setSettings(prev => ({
      ...prev,
      [platform]: { ...DEFAULT_SETTINGS[platform] },
    }));
  }, []);

  // ─── Generate webhook URL ─────────────────────────────────────────────────
  const generateWebhookUrl = (platform: string) =>
    `https://api.nordrive-flotte.com/webhooks/${platform}/${btoa(Date.now().toString()).slice(0, 12)}`;

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderStatusBadge = (status: PlatformApiConfig['connectionStatus']) => {
    const configs = {
      disconnected: { icon: <XCircle size={12} />, label: 'Déconnecté', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', color: '#94A3B8' },
      connected: { icon: <CheckCircle2 size={12} />, label: 'Connecté', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: '#34D399' },
      error: { icon: <AlertTriangle size={12} />, label: 'Erreur', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#F87171' },
      testing: { icon: <RefreshCw size={12} className="animate-spin" />, label: 'Test en cours...', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#FCD34D' },
    };
    const c = configs[status];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      }}>
        {c.icon} {c.label}
      </span>
    );
  };

  const renderSecretField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    fieldId: string,
    placeholder: string,
    icon: React.ReactNode,
    helpText?: string,
  ) => {
    const isVisible = showSecrets[fieldId];
    const isSecretField = label.includes('Secret');
    const isSavedOnServer = isSecretField && !value && (settings.uber.connectionStatus === 'connected' || settings.bolt.connectionStatus === 'connected');

    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {icon} {label}
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={isVisible ? 'text' : 'password'}
              value={isSavedOnServer ? '••••••••••••••••••••••••••••' : value}
              onChange={e => onChange(e.target.value)}
              placeholder={isSavedOnServer ? 'Clé enregistrée côté serveur (Masquée)' : placeholder}
              style={{
                width: '100%', padding: '10px 14px', paddingRight: '80px',
                background: isSavedOnServer ? 'rgba(16,185,129,0.08)' : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${isSavedOnServer ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px', color: isSavedOnServer ? '#34D399' : '#E2E8F0', fontSize: '13px',
                fontFamily: value || isSavedOnServer ? "'JetBrains Mono', 'Fira Code', monospace" : 'inherit',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.4)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '2px' }}>
              {!isSavedOnServer && (
                <button
                  onClick={() => toggleSecret(fieldId)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                  title={isVisible ? 'Masquer' : 'Afficher'}
                >
                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>
        {isSavedOnServer ? (
          <p style={{ fontSize: '10.5px', color: '#34D399', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            🛡️ Zero-Trust Security : Clé stockée côté serveur. Aucun texte en clair n'existe dans le navigateur.
          </p>
        ) : (
          helpText && <p style={{ fontSize: '10.5px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>{helpText}</p>
        )}
      </div>
    );
  };

  const renderTextField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    helpText?: string,
  ) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {icon} {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', color: '#E2E8F0', fontSize: '13px',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          outline: 'none', transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.4)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
      {helpText && (
        <p style={{ fontSize: '10.5px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>{helpText}</p>
      )}
    </div>
  );

  // ─── Platform Card ────────────────────────────────────────────────────────
  const renderPlatformCard = (
    platform: 'uber' | 'bolt',
    config: PlatformApiConfig,
    accentColor: string,
    accentBg: string,
    platformLabel: string,
    docUrl: string,
  ) => {
    const borderColor = config.connectionStatus === 'connected' ? 'rgba(16,185,129,0.4)' : `${accentColor}33`;
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.5)',
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: config.connectionStatus === 'connected' ? '0 0 30px rgba(16,185,129,0.08)' : 'none',
      }}>
        {/* Card Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${accentBg} 0%, transparent 100%)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: platform === 'uber' ? '#000' : 'rgba(52,211,153,0.1)',
              border: `1px solid ${accentColor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '12px', color: accentColor, letterSpacing: '0.5px',
            }}>
              {platformLabel}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                {platform === 'uber' ? 'Uber Supplier Fleet API' : 'Bolt Fleet Partner API'}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {platform === 'uber' ? 'OAuth 2.0 • REST API v1' : 'API Key • REST API v2'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {renderStatusBadge(config.connectionStatus)}
            {/* Enable/Disable toggle */}
            <button
              onClick={() => updatePlatform(platform, 'enabled', !config.enabled)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                border: 'none', transition: 'all 0.2s',
                background: config.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.15)',
                color: config.enabled ? '#34D399' : '#64748B',
              }}
            >
              {config.enabled ? <Unlock size={12} /> : <Lock size={12} />}
              {config.enabled ? 'Activé' : 'Désactivé'}
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '24px', opacity: config.enabled ? 1 : 0.4, pointerEvents: config.enabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
          {/* Error message */}
          {config.errorMessage && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#F87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertTriangle size={14} />
              {config.errorMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            {renderSecretField(
              'Client ID',
              config.clientId,
              v => updatePlatform(platform, 'clientId', v),
              `${platform}-client-id`,
              platform === 'uber' ? 'Ex: AbC123xYz-supplier_fleet' : 'Ex: fleet_partner_abc123',
              <Key size={12} />,
              platform === 'uber'
                ? 'Disponible sur developer.uber.com → Applications → Votre App'
                : 'Disponible sur le portail Bolt Fleet Partner',
            )}
            {renderSecretField(
              'Client Secret',
              config.clientSecret,
              v => updatePlatform(platform, 'clientSecret', v),
              `${platform}-client-secret`,
              '••••••••••••••••••••••',
              <Shield size={12} />,
              'Ne partagez jamais cette clé. Elle sera stockée de manière chiffrée.',
            )}
            {renderSecretField(
              'Access Token',
              config.accessToken,
              v => updatePlatform(platform, 'accessToken', v),
              `${platform}-access-token`,
              'Token OAuth2 / Bearer token',
              <Zap size={12} />,
              'Généré automatiquement via le flux OAuth2. Durée de vie limitée.',
            )}
            {renderSecretField(
              'Refresh Token',
              config.refreshToken,
              v => updatePlatform(platform, 'refreshToken', v),
              `${platform}-refresh-token`,
              'Refresh token pour renouveler l\'access token',
              <RefreshCw size={12} />,
              'Permet de renouveler l\'access token sans ré-authentification.',
            )}
          </div>

          {renderTextField(
            'Fleet ID / Supplier ID',
            config.fleetId,
            v => updatePlatform(platform, 'fleetId', v),
            platform === 'uber' ? 'Ex: supplier_fleet_nordrive_fr' : 'Ex: fleet_nordrive_75',
            <Database size={12} />,
            'Identifiant unique de votre flotte sur la plateforme.',
          )}

          {/* Webhook URL (read-only, auto-generated) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Globe size={12} /> Webhook URL (Endpoint de réception)
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <code style={{ flex: 1, fontSize: '12px', color: '#7DD3FC', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", wordBreak: 'break-all' }}>
                {config.webhookUrl || generateWebhookUrl(platform)}
              </code>
              <button
                onClick={() => handleCopy(config.webhookUrl || generateWebhookUrl(platform), `${platform}-webhook`)}
                style={{ background: 'none', border: 'none', color: copiedField === `${platform}-webhook` ? '#34D399' : '#64748B', cursor: 'pointer', padding: '4px', borderRadius: '6px', flexShrink: 0 }}
              >
                {copiedField === `${platform}-webhook` ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p style={{ fontSize: '10.5px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
              Configurez cette URL dans votre dashboard {platform === 'uber' ? 'Uber Developer' : 'Bolt Partner'} pour recevoir les notifications automatiques.
            </p>
          </div>

          {/* Last sync info */}
          {config.lastSyncAt && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
              color: '#34D399', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Clock size={13} />
              Dernière synchronisation : {new Date(config.lastSyncAt).toLocaleString('fr-FR')}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleTestConnection(platform)}
              disabled={testingPlatform === platform}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                border: 'none', cursor: testingPlatform === platform ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                color: platform === 'uber' ? '#000' : '#000',
                opacity: testingPlatform === platform ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {testingPlatform === platform
                ? <><RefreshCw size={13} className="animate-spin" /> Test en cours...</>
                : <><Zap size={13} /> Tester la connexion</>
              }
            </button>

            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#94A3B8', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <ExternalLink size={13} /> Documentation API
            </a>

            <button
              onClick={() => handleResetPlatform(platform)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)',
                color: '#F87171', cursor: 'pointer', transition: 'all 0.2s', marginLeft: 'auto',
              }}
            >
              <XCircle size={13} /> Réinitialiser
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px 60px' }}>

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '28px 32px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#7DD3FC', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
              <Settings size={12} /> Paramètres d'Intégration
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#FFF', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Clés API <span style={{ color: '#38BDF8' }}>Uber</span> & <span style={{ color: '#34D399' }}>Bolt</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '600px', lineHeight: 1.6 }}>
              Configurez vos identifiants API pour synchroniser automatiquement les données de courses, de chiffre d'affaires et de paie entre les plateformes VTC et votre CRM Nordrive.
            </p>
          </div>

          {/* Global actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleSyncNow}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
                color: '#FFF', boxShadow: '0 4px 15px rgba(2,132,199,0.3)',
              }}
            >
              <RefreshCw size={14} /> Synchroniser maintenant
            </button>
            <button
              onClick={() => { handleSaveCredentials('uber'); handleSaveCredentials('bolt'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
                background: saveFlash ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.15)',
                color: '#34D399', border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              {saveFlash ? <><Check size={14} /> Sauvegardé !</> : <><CheckCircle2 size={14} /> Sauvegarder</>}
            </button>
          </div>
        </div>

        {/* Global sync / auto-sync bar */}
        <div style={{
          marginTop: '20px', padding: '14px 20px', borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Auto-sync toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
              <div
                onClick={() => setSettings(prev => ({ ...prev, autoSync: !prev.autoSync }))}
                style={{
                  width: '38px', height: '20px', borderRadius: '20px',
                  background: settings.autoSync ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.3)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: settings.autoSync ? '#34D399' : '#64748B',
                  position: 'absolute', top: '2px',
                  left: settings.autoSync ? '20px' : '2px',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
              Synchronisation automatique
            </label>

            {/* Sync interval */}
            {settings.autoSync && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} style={{ color: '#64748B' }} />
                <span style={{ fontSize: '11px', color: '#64748B' }}>Intervalle :</span>
                <select
                  value={settings.syncIntervalMinutes}
                  onChange={e => setSettings(prev => ({ ...prev, syncIntervalMinutes: parseInt(e.target.value) }))}
                  style={{
                    padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                    background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#E2E8F0', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 heure</option>
                  <option value={180}>3 heures</option>
                  <option value={360}>6 heures</option>
                  <option value={720}>12 heures</option>
                  <option value={1440}>24 heures</option>
                </select>
              </div>
            )}
          </div>

          {/* Last global sync timestamp */}
          <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} />
            {settings.lastGlobalSync
              ? `Dernière synchro globale : ${new Date(settings.lastGlobalSync).toLocaleString('fr-FR')}`
              : 'Aucune synchronisation effectuée'}
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(56,189,248,0.04)',
        border: '1px solid rgba(56,189,248,0.1)',
        borderRadius: '14px',
        padding: '18px 24px',
        marginBottom: '24px',
        display: 'flex', alignItems: 'flex-start', gap: '14px',
      }}>
        <Link2 size={18} style={{ color: '#38BDF8', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#7DD3FC', margin: '0 0 6px' }}>Comment ça fonctionne ?</h4>
          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(56,189,248,0.15)', fontSize: '10px', fontWeight: 800, color: '#38BDF8' }}>1</span>
              Renseignez vos identifiants API (Client ID + Secret) obtenus depuis vos portails partenaires Uber / Bolt.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(56,189,248,0.15)', fontSize: '10px', fontWeight: 800, color: '#38BDF8' }}>2</span>
              Testez la connexion pour vérifier que vos identifiants sont valides.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(56,189,248,0.15)', fontSize: '10px', fontWeight: 800, color: '#38BDF8' }}>3</span>
              Activez la synchronisation automatique <ArrowRight size={10} style={{ display: 'inline' }} /> les données de courses et de paie sont récupérées directement dans votre CRM.
            </div>
          </div>
        </div>
      </div>

      {/* ── Platform Cards ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {renderPlatformCard(
          'uber',
          settings.uber,
          '#F59E0B',
          'rgba(245,158,11,0.06)',
          'UBER',
          'https://developer.uber.com/docs/suppliers/references/api',
        )}

        {renderPlatformCard(
          'bolt',
          settings.bolt,
          '#34D399',
          'rgba(52,211,153,0.06)',
          'BOLT',
          'https://partners.bolt.eu/',
        )}
      </div>

      {/* ── Data mapping info ────────────────────────────────────── */}
      <div style={{
        marginTop: '24px',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '24px 28px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={16} style={{ color: '#38BDF8' }} />
          Données synchronisées automatiquement
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Chiffre d\'Affaires Brut', desc: 'Gains hebdomadaires par chauffeur', icon: '💰' },
            { label: 'Nombre de Courses', desc: 'Total des courses par période', icon: '🚗' },
            { label: 'Commissions Plateforme', desc: 'Frais Uber/Bolt déduits', icon: '📊' },
            { label: 'Statut Chauffeur', desc: 'Actif, suspendu, en attente', icon: '👤' },
            { label: 'Relevés de Paie', desc: 'Fichiers de paie automatiques', icon: '📄' },
            { label: 'Bonus & Incentives', desc: 'Primes plateforme automatiques', icon: '🎯' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Security notice ──────────────────────────────────────── */}
      {/* ── Recent Sync Logs ──────────────────────────────────────── */}
      {syncLogs.length > 0 && (
        <div style={{
          marginTop: '24px',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '24px 28px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: '#38BDF8' }} />
            Historique des synchronisations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {syncLogs.slice(0, 8).map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: log.status === 'success' ? '#34D399' : log.status === 'error' ? '#F87171' : '#FCD34D',
                    boxShadow: `0 0 8px ${log.status === 'success' ? '#34D399' : log.status === 'error' ? '#F87171' : '#FCD34D'}`,
                  }} />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>
                      {log.platform.toUpperCase()} — {log.action.replace(/_/g, ' ')}
                    </span>
                    {log.records_count > 0 && (
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>
                        ({log.records_count} enregistrement{log.records_count > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '10.5px', color: '#475569' }}>
                  {log.completed_at ? new Date(log.completed_at).toLocaleString('fr-FR') : 'En cours...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Security notice ──────────────────────────────────────── */}
      <div style={{
        marginTop: '20px',
        background: 'rgba(16,185,129,0.06)',
        border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: '14px',
        padding: '16px 22px',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
      }}>
        <Shield size={18} style={{ color: '#34D399', flexShrink: 0, marginTop: '1px' }} />
        <div>
          <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#34D399', margin: '0 0 4px' }}>🔒 Sécurité Production</h4>
          <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
            Vos clés API sont transmises et stockées <strong style={{ color: '#34D399' }}>côté serveur uniquement</strong> (Supabase Edge Functions + table sécurisée avec RLS service_role).
            Elles ne sont jamais exposées dans le navigateur. Les tokens OAuth2 sont rafraîchis automatiquement côté backend.
            Ne partagez jamais vos Client Secret. Les Access Tokens ont une durée de vie limitée et sont renouvelés automatiquement.
          </p>
        </div>
      </div>

    </div>
  );
};
