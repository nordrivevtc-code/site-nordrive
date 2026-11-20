import React, { useState } from 'react';
import { Check, Copy, ExternalLink, MessageSquare, Pencil, Undo2 } from 'lucide-react';
import type { Activity, Driver } from '../types/fleet';

/**
 * Rattachement aux plateformes, en 2 clics par plateforme.
 *  - Uber Fleet : on saisit prénom, nom, e-mail, téléphone ; Uber invite le chauffeur automatiquement.
 *  - Bolt Fleet : on saisit e-mail et téléphone ; Bolt génère un lien qu'on colle ici puis qu'on envoie au chauffeur.
 * Rien n'est envoyé automatiquement : chaque action est un clic de Nordrive (contrôle humain).
 */

interface Props {
  driver: Driver;
  onUpdate: (updates: Partial<Driver>) => void;
  onAddActivity: (act: { type: Activity['type']; content: string }) => void;
}

const PORTALS_KEY = 'nordrive:portal-urls';

const box: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, marginBottom: 12 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 };
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13 };
const btn = (color: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${color}55`, background: `${color}22`, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' });

/** Numéro au format international pour wa.me (06 12 34 56 78 -> 33612345678) */
export function toWhatsAppNumber(phone: string): string {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `33${d.slice(1)}`;
  return d;
}

const waLink = (phone: string, text: string) => `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function readPortals(): { uber: string; bolt: string } {
  try {
    return { uber: '', bolt: '', ...(JSON.parse(localStorage.getItem(PORTALS_KEY) || '{}') as object) };
  } catch {
    return { uber: '', bolt: '' };
  }
}

/** Ligne « valeur + bouton Copier » */
const CopyRow: React.FC<{ name: string; value: string }> = ({ name, value }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const t = document.createElement('textarea');
      t.value = value;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <span style={{ ...label, width: 70, flex: 'none' }}>{name}</span>
      <span style={{ flex: 1, color: value ? '#fff' : '#F87171', fontSize: 14, fontWeight: 600, wordBreak: 'break-all' }}>{value || 'À renseigner'}</span>
      <button type="button" disabled={!value} onClick={copy} style={{ ...btn(done ? '#34D399' : '#38BDF8'), opacity: value ? 1 : 0.4 }} aria-label={`Copier ${name}`}>
        {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
};

export const FleetEnrollment: React.FC<Props> = ({ driver, onUpdate, onAddActivity }) => {
  const enr = driver.platformEnrollment ?? {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: driver.firstName, lastName: driver.lastName, email: driver.email || '', phone: driver.phone || '' });
  const [boltLink, setBoltLink] = useState(enr.bolt?.link ?? '');
  const [portals, setPortals] = useState(readPortals);
  const [showPortals, setShowPortals] = useState(false);

  const missing = [!driver.email && 'e-mail', !driver.phone && 'téléphone'].filter(Boolean) as string[];
  const linkOk = /^https?:\/\/\S+$/i.test(boltLink.trim());

  const savePortals = (next: { uber: string; bolt: string }) => {
    setPortals(next);
    try { localStorage.setItem(PORTALS_KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
  };

  const saveEdit = () => {
    onUpdate({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim() });
    setEditing(false);
  };

  const markUber = () => {
    onUpdate({ platformEnrollment: { ...enr, uber: { sentAt: new Date().toISOString() } } });
    onAddActivity({ type: 'note', content: 'Invitation Uber Fleet envoyée (Uber invite le chauffeur automatiquement).' });
  };
  const markBolt = () => {
    onUpdate({ platformEnrollment: { ...enr, bolt: { sentAt: new Date().toISOString(), link: boltLink.trim() } } });
    onAddActivity({ type: 'whatsapp', content: "Lien d'inscription Bolt envoyé au chauffeur sur WhatsApp." });
  };
  const undo = (p: 'uber' | 'bolt') => {
    const next = { ...enr };
    delete next[p];
    onUpdate({ platformEnrollment: next });
  };

  const uberMsg = `Bonjour ${driver.firstName}, tu vas recevoir une invitation Uber de la flotte Nordrive (par e-mail ou SMS). Accepte-la pour finaliser ton rattachement. Si tu ne la vois pas, réponds-moi ici.`;
  const boltMsg = `Bonjour ${driver.firstName}, voici ton lien d'inscription Bolt pour rejoindre la flotte Nordrive : ${boltLink.trim()}\nOuvre-le depuis ton téléphone et suis les étapes. Réponds-moi ici si tu as une question.`;
  const emailMsg = `Bonjour ${driver.firstName}, pour finaliser ton rattachement, peux-tu m'envoyer ton adresse e-mail ? Merci !`;

  const done = (p: 'uber' | 'bolt') => Boolean(enr[p]);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ ...label, margin: 0 }}>Rattachement Uber & Bolt</p>
        <span style={{ fontSize: 12, fontWeight: 700, color: done('uber') && done('bolt') ? '#34D399' : '#FBBF24' }}>
          Uber {done('uber') ? '✓' : '·'} &nbsp; Bolt {done('bolt') ? '✓' : '·'}
        </span>
      </div>

      {missing.length > 0 && (
        <div role="alert" style={{ ...box, borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', color: '#FCA5A5', fontSize: 13 }}>
          Il manque : <strong>{missing.join(' et ')}</strong> (obligatoire sur Uber et Bolt).
          {!driver.email && driver.phone && (
            <div style={{ marginTop: 8 }}>
              <a href={waLink(driver.phone, emailMsg)} target="_blank" rel="noopener noreferrer" style={btn('#25D366')}>
                <MessageSquare size={13} /> Demander l'e-mail sur WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* Informations du chauffeur (corrigeables) */}
      <div style={box}>
        {!editing ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>Informations à saisir sur les plateformes</span>
            <button type="button" onClick={() => setEditing(true)} style={btn('#A78BFA')}><Pencil size={12} /> Corriger</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input aria-label="Prénom" style={input} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Prénom" />
              <input aria-label="Nom" style={input} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Nom" />
            </div>
            <input aria-label="E-mail" style={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" />
            <input aria-label="Téléphone" style={input} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={saveEdit} style={btn('#34D399')}><Check size={13} /> Enregistrer</button>
              <button type="button" onClick={() => setEditing(false)} style={btn('#94A3B8')}>Annuler</button>
            </div>
          </div>
        )}
      </div>

      {/* ───────── UBER ───────── */}
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ color: '#fff', fontSize: 15 }}>Uber Fleet</strong>
          {portals.uber && <a href={portals.uber} target="_blank" rel="noopener noreferrer" style={btn('#38BDF8')}><ExternalLink size={12} /> Ouvrir Uber Fleet</a>}
        </div>
        <CopyRow name="Prénom" value={driver.firstName} />
        <CopyRow name="Nom" value={driver.lastName} />
        <CopyRow name="E-mail" value={driver.email} />
        <CopyRow name="Tél." value={driver.phone} />
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '8px 0 10px' }}>Dans Uber Fleet, ajoute le chauffeur : Uber lui envoie l'invitation tout seul.</p>
        {done('uber') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#34D399', fontWeight: 700, fontSize: 13 }}>✓ Invitation envoyée le {fmt(enr.uber!.sentAt)}</span>
            <button type="button" onClick={() => undo('uber')} style={btn('#94A3B8')}><Undo2 size={12} /> Annuler</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={markUber} style={btn('#34D399')}><Check size={13} /> J'ai invité le chauffeur sur Uber</button>
          </div>
        )}
        {driver.phone && (
          <p style={{ margin: '10px 0 0' }}>
            <a href={waLink(driver.phone, uberMsg)} target="_blank" rel="noopener noreferrer" style={btn('#25D366')}><MessageSquare size={13} /> Prévenir le chauffeur (WhatsApp)</a>
          </p>
        )}
      </div>

      {/* ───────── BOLT ───────── */}
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ color: '#fff', fontSize: 15 }}>Bolt Fleet</strong>
          {portals.bolt && <a href={portals.bolt} target="_blank" rel="noopener noreferrer" style={btn('#38BDF8')}><ExternalLink size={12} /> Ouvrir Bolt Fleet</a>}
        </div>
        <CopyRow name="E-mail" value={driver.email} />
        <CopyRow name="Tél." value={driver.phone} />
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '8px 0 6px' }}>Dans Bolt Fleet, ajoute le chauffeur : Bolt génère un lien. Colle-le ci-dessous.</p>
        <label style={{ ...label, display: 'block', marginBottom: 4 }} htmlFor={`bolt-link-${driver.id}`}>Lien généré par Bolt</label>
        <input
          id={`bolt-link-${driver.id}`}
          style={{ ...input, borderColor: boltLink && !linkOk ? '#F87171' : 'rgba(255,255,255,0.15)' }}
          value={boltLink}
          onChange={(e) => setBoltLink(e.target.value)}
          placeholder="https://…"
          disabled={done('bolt')}
        />
        {boltLink && !linkOk && <p style={{ color: '#F87171', fontSize: 12, margin: '6px 0 0' }}>Ce n'est pas un lien valide (il doit commencer par https://).</p>}
        <div style={{ marginTop: 10 }}>
          {done('bolt') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#34D399', fontWeight: 700, fontSize: 13 }}>✓ Lien envoyé le {fmt(enr.bolt!.sentAt)}</span>
              <button type="button" onClick={() => undo('bolt')} style={btn('#94A3B8')}><Undo2 size={12} /> Annuler</button>
            </div>
          ) : (
            <a
              href={linkOk && driver.phone ? waLink(driver.phone, boltMsg) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (!linkOk || !driver.phone) { e.preventDefault(); return; } markBolt(); }}
              aria-disabled={!linkOk || !driver.phone}
              style={{ ...btn('#25D366'), opacity: linkOk && driver.phone ? 1 : 0.4, cursor: linkOk && driver.phone ? 'pointer' : 'not-allowed' }}
            >
              <MessageSquare size={13} /> Envoyer le lien au chauffeur (WhatsApp)
            </a>
          )}
        </div>
      </div>

      {/* Liens des portails (une seule fois) */}
      <button type="button" onClick={() => setShowPortals(!showPortals)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer', padding: 0 }}>
        {showPortals ? '▲' : '▼'} Liens de mes portails (à renseigner une seule fois)
      </button>
      {showPortals && (
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <input aria-label="Adresse du portail Uber Fleet" style={input} value={portals.uber} onChange={(e) => savePortals({ ...portals, uber: e.target.value })} placeholder="Adresse de ton portail Uber Fleet (https://…)" />
          <input aria-label="Adresse du portail Bolt Fleet" style={input} value={portals.bolt} onChange={(e) => savePortals({ ...portals, bolt: e.target.value })} placeholder="Adresse de ton portail Bolt Fleet (https://…)" />
        </div>
      )}
    </div>
  );
};
