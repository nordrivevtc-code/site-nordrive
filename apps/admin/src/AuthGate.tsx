import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { isConfigured, supabase } from './supabase.ts';

/**
 * Porte d'entrée de l'administration : connexion individuelle + double authentification (TOTP) OBLIGATOIRE.
 * Cette porte est une aide d'interface : la vraie protection est dans la base (RLS), qui refuse toute donnée
 * à une session sans double authentification (jwt.aal = 'aal2'), même si ce code était contourné.
 */
type Phase = 'loading' | 'signed_out' | 'enroll' | 'verify' | 'ready';

const INACTIVITY_MS = 15 * 60 * 1000;

export function AuthGate({ children }: { children: (signOut: () => void) => ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setPhase('signed_out');
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') return setPhase('ready');
    setPhase(aal?.nextLevel === 'aal2' ? 'verify' : 'enroll'); // facteur déjà enregistré -> saisie du code ; sinon -> enregistrement
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPhase('signed_out');
  }, []);

  useEffect(() => {
    if (isConfigured) void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') setPhase('signed_out'); });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  // Déconnexion automatique après 15 minutes d'inactivité
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (phase !== 'ready') return;
    const reset = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void signOut(), INACTIVITY_MS); };
    const events = ['click', 'keydown', 'mousemove', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { events.forEach((e) => window.removeEventListener(e, reset)); window.clearTimeout(timer.current); };
  }, [phase, signOut]);

  if (!isConfigured) {
    return <Card title="Configuration manquante">Définir <code>VITE_API_URL</code> (ou <code>VITE_SUPABASE_URL</code>) et <code>VITE_SUPABASE_ANON_KEY</code> dans <code>.env.local</code>.</Card>;
  }
  if (phase === 'loading') return <Card title="Chargement…" />;
  if (phase === 'signed_out') return <Login onDone={refresh} />;
  if (phase === 'enroll') return <Enroll onDone={refresh} onCancel={signOut} />;
  if (phase === 'verify') return <Verify onDone={refresh} onCancel={signOut} />;
  return <>{children(() => void signOut())}</>;
}

function Card({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="center">
      <div className="card narrow">
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError('Identifiants incorrects.'); // message volontairement identique quel que soit le motif
    else onDone();
  };

  return (
    <Card title="Administration Nordrive">
      <form onSubmit={submit} className="stack">
        <label>E-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </Card>
  );
}

/** Première connexion : enregistrement de l'application d'authentification (Google Authenticator, Authy, 1Password…) */
function Enroll({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // évite le double appel en développement
    started.current = true;
    (async () => {
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Nordrive ${Date.now()}` });
      if (err || !data) return setError("Impossible de démarrer l'enregistrement.");
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!factor) return;
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (err) setError('Code incorrect. Réessayez avec le code affiché dans votre application.');
    else onDone();
  };

  return (
    <Card title="Activer la double authentification">
      <p>Elle est obligatoire. Scannez ce code avec une application d'authentification, puis saisissez le code à 6 chiffres.</p>
      {factor ? (
        <form onSubmit={verify} className="stack">
          <img src={factor.qr} alt="Code QR à scanner" width={180} height={180} />
          <p className="muted">Ou saisissez cette clé : <code>{factor.secret}</code></p>
          <label>Code à 6 chiffres<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></label>
          {error && <p role="alert" className="error">{error}</p>}
          <button>Activer et continuer</button>
        </form>
      ) : (
        <p>{error || 'Préparation…'}</p>
      )}
      <button className="link" type="button" onClick={onCancel}>Se déconnecter</button>
    </Card>
  );
}

/** Connexions suivantes : code à 6 chiffres */
function Verify({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const { data: list } = await supabase.auth.mfa.listFactors();
    const factor = list?.totp?.find((f) => f.status === 'verified');
    if (!factor) return setError('Aucun facteur enregistré.');
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (err) { setError('Code incorrect.'); setCode(''); } else onDone();
  };

  return (
    <Card title="Double authentification">
      <form onSubmit={verify} className="stack">
        <label>Code à 6 chiffres<input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></label>
        {error && <p role="alert" className="error">{error}</p>}
        <button>Valider</button>
      </form>
      <button className="link" type="button" onClick={onCancel}>Se déconnecter</button>
    </Card>
  );
}
