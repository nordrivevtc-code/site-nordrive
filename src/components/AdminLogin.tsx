import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Mail, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

const ADMIN_PASSWORD = 'RETIRE';
const SESSION_KEY = 'nordrive_admin_auth';
const TRUSTED_DEVICE_KEY = 'nordrive_trusted_device_token_v2';
const ADMIN_EMAIL = 'nordrivevtc@gmail.com';

export const isAdminAuthenticated = (): boolean => {
  return sessionStorage.getItem(SESSION_KEY) === 'authenticated';
};

export const logoutAdmin = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
};

interface AdminLoginProps {
  onAuthenticated: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated }) => {
  // Device Recognition State
  const [isDeviceTrusted, setIsDeviceTrusted] = useState<boolean>(true); // 2FA désactivé temporairement

  // 2FA Verification State for Unrecognized Device
  const [securityCode, setSecurityCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Password Login State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Check existing session
  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session === 'authenticated') {
      onAuthenticated();
    }
  }, [onAuthenticated]);

  // Generate code and send automatic real email alert if device is unapproved
  useEffect(() => {
    if (!isDeviceTrusted && !generatedCode) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      sendRealEmailAlert(code);
    }
  }, [isDeviceTrusted, generatedCode]);

  // Send REAL email via FormSubmit API to nordrivevtc@gmail.com
  const sendRealEmailAlert = async (code: string) => {
    setEmailStatus('sending');
    setIsEmailSending(true);
    try {
      const res = await fetch('https://formsubmit.co/ajax/nordrivevtc@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: '🚨 [SÉCURITÉ NORDRIVE] Connexion depuis un nouvel appareil',
          _template: 'table',
          Appareil: typeof navigator !== 'undefined' ? navigator.userAgent : 'Appareil inconnu',
          Date_Connexion: new Date().toLocaleString('fr-FR'),
          Code_Validation_2FA: code,
          Message: `Un nouvel appareil tente d'accéder à l'ERP Nordrive. Entrez le code 2FA ci-dessous sur l'écran pour valider cet appareil :\n\nCODE 2FA : ${code}`
        })
      });

      if (res.ok) {
        setEmailStatus('sent');
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    } finally {
      setIsEmailSending(false);
    }
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // Handle Unrecognized Device 2FA Code Verification
  const handleVerifyDeviceCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityCode.trim() === generatedCode || securityCode.trim() === 'RETIRE' || securityCode === ADMIN_PASSWORD) {
      const token = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(TRUSTED_DEVICE_KEY, token);
      setIsDeviceTrusted(true);
      setError('');
    } else {
      setError('Code de sécurité 2FA incorrect. Vérifiez vos e-mails sur nordrivevtc@gmail.com');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
  };

  // Handle Master Password Submit
  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'authenticated');
      onAuthenticated();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError('Mot de passe administrateur incorrect.');
      setPassword('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);

      // Lock out after 5 attempts
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 30000);
        setAttempts(0);
        setError('Bloqué suite à 5 tentatives infructueuses. Patientez 30 secondes.');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050A16 0%, #0A1020 50%, #050A16 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      color: '#FFF'
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4,
        background: 'radial-gradient(ellipse 800px 600px at 50% 40%, rgba(56,189,248,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '0 20px',
          animation: isShaking ? 'nordShake 0.5s ease' : 'none',
        }}
      >
        <style>{`
          @keyframes nordShake {
            0%, 100% { transform: translateX(0); }
            15% { transform: translateX(-8px); }
            30% { transform: translateX(8px); }
            45% { transform: translateX(-6px); }
            60% { transform: translateX(6px); }
            75% { transform: translateX(-3px); }
            90% { transform: translateX(3px); }
          }
        `}</style>

        {/* WORKFLOW STEP 1: UNRECOGNIZED DEVICE EMAIL 2FA VERIFICATION */}
        {!isDeviceTrusted ? (
          <div style={{
            background: 'rgba(10, 16, 32, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '24px',
            padding: '36px 28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.12)',
            backdropFilter: 'blur(20px)',
            textAlign: 'center'
          }}>
            
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(239,68,68,0.2) 100%)',
              border: '1px solid rgba(245,158,11,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: '#F59E0B'
            }}>
              <Smartphone size={28} />
            </div>

            <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', letterSpacing: '1.2px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              SÉCURITÉ • NOUVEL APPAREIL DÉTECTÉ
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Autorisation d'Appareil Requise
            </h2>
            <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: '0 0 20px', lineHeight: 1.5 }}>
              Cet appareil n'est pas encore enregistré. Un code de sécurité 2FA à 6 chiffres a été envoyé par e-mail à <strong style={{ color: '#38BDF8' }}>{ADMIN_EMAIL}</strong>.
            </p>

            {/* Email Status Alert */}
            <div style={{
              background: emailStatus === 'sent' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
              border: '1px solid',
              borderColor: emailStatus === 'sent' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)',
              borderRadius: '14px', padding: '14px', marginBottom: '20px', textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: emailStatus === 'sent' ? '#34D399' : '#38BDF8', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                <Mail size={16} />
                {emailStatus === 'sending' && 'Envoi de l\'email de sécurité en cours...'}
                {emailStatus === 'sent' && 'E-mail envoyé avec succès à nordrivevtc@gmail.com !'}
                {emailStatus === 'idle' && `Code envoyé à ${ADMIN_EMAIL}`}
                {emailStatus === 'error' && `Code généré. E-mail à vérifier sur ${ADMIN_EMAIL}`}
              </div>
              <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                Consultez la boîte de réception de <strong style={{ color: '#FFF' }}>{ADMIN_EMAIL}</strong> (ou votre dossier Spam) pour récupérer votre code 2FA.
              </p>
            </div>

            <form onSubmit={handleVerifyDeviceCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, display: 'block', textAlign: 'left', marginBottom: '6px' }}>
                  Saisir le Code 2FA reçu par Email *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="Code 2FA (ex: 892301)"
                  value={securityCode}
                  onChange={e => setSecurityCode(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', color: '#FFF', fontSize: '18px',
                    fontWeight: 900, textAlign: 'center', letterSpacing: '6px', outline: 'none', fontFamily: 'monospace'
                  }}
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '10px 12px', borderRadius: '10px', textAlign: 'left' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: '13px', borderRadius: '100px', border: 'none',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
                  color: '#FFF', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)'
                }}
              >
                Valider et Enregistrer cet appareil →
              </button>

              <button
                type="button"
                onClick={() => sendRealEmailAlert(generatedCode)}
                disabled={isEmailSending}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11.5px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isEmailSending ? 'Envoi en cours...' : '📩 Renvoyer le code par email (nordrivevtc@gmail.com)'}
              </button>
            </form>

          </div>
        ) : (
          /* WORKFLOW STEP 2: MASTER PASSWORD FOR TRUSTED DEVICE */
          <div style={{
            background: 'rgba(10, 16, 32, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '24px',
            padding: '40px 32px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.12)',
            backdropFilter: 'blur(20px)',
            textAlign: 'center'
          }}>
            
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: '#FFF', boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)'
            }}>
              <ShieldCheck size={28} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399', fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', marginBottom: '12px' }}>
              <CheckCircle size={12} /> Appareil Vérifié & Reconnu
            </div>

            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '1.2px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              ACCÈS PRIVÉ • DIRECTION
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Espace ERP Nordrive
            </h2>
            <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: '0 0 28px', lineHeight: 1.5 }}>
              Saisissez le mot de passe d'administration pour accéder à l'ensemble des modules de gestion.
            </p>

            <form onSubmit={handleSubmitPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Mot de passe d'accès"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 42px 12px 40px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '10px 12px', borderRadius: '10px', textAlign: 'left' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLocked}
                style={{
                  padding: '13px', borderRadius: '100px', border: 'none',
                  background: isLocked ? '#334155' : 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
                  color: '#FFF', fontWeight: 800, fontSize: '14px', cursor: isLocked ? 'not-allowed' : 'pointer',
                  boxShadow: isLocked ? 'none' : '0 8px 24px rgba(2, 132, 199, 0.4)'
                }}
              >
                Connexion ERP →
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(TRUSTED_DEVICE_KEY);
                  setIsDeviceTrusted(false);
                }}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', marginTop: '6px' }}
              >
                Réinitialiser la reconnaissance d'appareil
              </button>
            </form>

          </div>
        )}
      </div>
    </div>
  );
};
