import React, { useState, useMemo } from 'react';
import {
  Phone, MessageSquare, Plus, X, ChevronRight, Clock,
  FileText, CheckCircle, AlertCircle, Users, Search,
  ArrowRight, Calendar, Car, MapPin,
  Edit3, Trash2, ChevronDown, ChevronUp, Activity,
  Mail, StickyNote, Bell, LogOut, Download, Upload, RotateCcw,
  CreditCard, Check
} from 'lucide-react';
import type { Driver, DriverStatus, Activity as ActivityType, ActivityType as AType } from '../types/fleet';
import { FleetEnrollment, toWhatsAppNumber } from './FleetEnrollment';
import { clearNordriveStorage } from '../hooks/useLocalStorage';
import { cleanIban, formatIbanDisplay } from '../lib/statementParsers';

// ─── PIPELINE CONFIG ─────────────────────────────────────────────────────────
const PIPELINE_STAGES: { status: DriverStatus; label: string; color: string; bg: string; icon: React.ReactNode; description: string }[] = [
  { status: 'nouveau_prospect', label: 'Nouveau prospect', color: '#38BDF8', bg: 'rgba(56,189,248,0.08)', icon: <Users size={14} />, description: 'Inscrit via le formulaire' },
  { status: 'contact_initial', label: '1er contact', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <Phone size={14} />, description: 'Premier appel effectué' },
  { status: 'docs_en_attente', label: 'Docs en attente', color: '#F97316', bg: 'rgba(249,115,22,0.08)', icon: <AlertCircle size={14} />, description: 'Documents à envoyer' },
  { status: 'docs_recus', label: 'Docs reçus', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', icon: <FileText size={14} />, description: 'En vérification' },
  { status: 'rattache', label: 'Rattaché ✅', color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: <CheckCircle size={14} />, description: 'Rattachement validé' },
  { status: 'actif', label: 'Actif 🚀', color: '#34D399', bg: 'rgba(52,211,153,0.08)', icon: <Car size={14} />, description: 'Roule avec la flotte' },
];

const ACTIVITY_CONFIG: Record<AType, { label: string; color: string; icon: React.ReactNode }> = {
  inscription: { label: 'Inscription', color: '#38BDF8', icon: <Users size={13} /> },
  appel: { label: 'Appel', color: '#10B981', icon: <Phone size={13} /> },
  email: { label: 'Email', color: '#A78BFA', icon: <Mail size={13} /> },
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: <MessageSquare size={13} /> },
  note: { label: 'Note', color: '#F59E0B', icon: <StickyNote size={13} /> },
  statut_change: { label: 'Changement statut', color: '#F97316', icon: <ArrowRight size={13} /> },
  document_recu: { label: 'Document reçu', color: '#6EE7B7', icon: <FileText size={13} /> },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DriverCRMProps {
  drivers: Driver[];
  onUpdateDriverStatus: (driverId: string, newStatus: DriverStatus) => void;
  onUpdateDriverCommission: (driverId: string, rate: number) => void;
  onAddDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onAddActivity: (driverId: string, activity: Omit<ActivityType, 'id' | 'date'>) => void;
  onUpdateDriver: (driverId: string, updates: Partial<Driver>) => void;
  onUpdateDriverIban?: (driverId: string, iban: string, bic?: string) => void;
  onUpdateDriverContract?: (driverId: string, updates: Partial<Driver>) => void;
}

// ─── ADD ACTIVITY FORM ────────────────────────────────────────────────────────
const AddActivityForm: React.FC<{
  onAdd: (act: Omit<ActivityType, 'id' | 'date'>) => void;
  onClose: () => void;
}> = ({ onAdd, onClose }) => {
  const [type, setType] = useState<AType>('appel');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [relanceDate, setRelanceDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd({ type, content: content.trim(), authorName: authorName || undefined, relanceDate: relanceDate || undefined });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#E0F2FE' }}>Nouvel échange</span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as AType)} style={{ width: '100%', padding: '8px 10px', background: 'rgba(10,16,36,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', cursor: 'pointer' }}>
            {(Object.keys(ACTIVITY_CONFIG) as AType[]).filter(t => t !== 'inscription' && t !== 'statut_change').map(t => (
              <option key={t} value={t}>{ACTIVITY_CONFIG[t].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Auteur</label>
          <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Nom de l'administrateur" style={{ width: '100%', padding: '8px 10px', background: 'rgba(10,16,36,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Note *</label>
        <textarea required value={content} onChange={e => setContent(e.target.value)} placeholder="Décrivez l'échange, le résultat, les prochaines étapes..." rows={3} style={{ width: '100%', padding: '8px 10px', background: 'rgba(10,16,36,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>
          <Bell size={11} style={{ display: 'inline', marginRight: '4px' }} />Date de relance (optionnel)
        </label>
        <input type="date" value={relanceDate} onChange={e => setRelanceDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ padding: '8px 10px', background: 'rgba(10,16,36,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px' }} />
      </div>
      <button type="submit" style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
        Enregistrer
      </button>
    </form>
  );
};

// ─── DRIVER DETAIL PANEL ──────────────────────────────────────────────────────
const DriverPanel: React.FC<{
  driver: Driver;
  onClose: () => void;
  onStatusChange: (s: DriverStatus) => void;
  onAddActivity: (act: Omit<ActivityType, 'id' | 'date'>) => void;
  onUpdate: (updates: Partial<Driver>) => void;
  onDelete: () => void;
  onUpdateIban?: (driverId: string, iban: string, bic?: string) => void;
  onUpdateContract?: (driverId: string, updates: Partial<Driver>) => void;
}> = ({ driver, onClose, onStatusChange, onAddActivity, onUpdate, onDelete, onUpdateIban, onUpdateContract }) => {
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editNotes, setEditNotes] = useState(driver.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Gestion IBAN & Tarification Flotte
  const [editingFinance, setEditingFinance] = useState(false);
  const [finIban, setFinIban] = useState(driver.iban || '');
  const [finBic, setFinBic] = useState(driver.bic || '');
  const [finFeeType, setFinFeeType] = useState<'fixe' | 'pourcentage'>(driver.feeType || 'fixe');
  const [finFixedWeeklyFee, setFinFixedWeeklyFee] = useState<number>(driver.fixedWeeklyFee !== undefined ? driver.fixedWeeklyFee : 50);
  const [finCommissionRate, setFinCommissionRate] = useState<number>(driver.commissionRate || 10);
  const [finRentalFee, setFinRentalFee] = useState<number>(driver.rentalFee || 0);

  const handleSaveFinance = () => {
    const cleanedIban = cleanIban(finIban);
    const cleanedBic = finBic.trim().toUpperCase();
    onUpdate({
      iban: cleanedIban,
      bic: cleanedBic,
      feeType: finFeeType,
      fixedWeeklyFee: finFixedWeeklyFee,
      commissionRate: finCommissionRate,
      rentalFee: finRentalFee
    });
    if (onUpdateIban) {
      onUpdateIban(driver.id, cleanedIban, cleanedBic);
    }
    if (onUpdateContract) {
      onUpdateContract(driver.id, {
        iban: cleanedIban,
        bic: cleanedBic,
        feeType: finFeeType,
        fixedWeeklyFee: finFixedWeeklyFee,
        commissionRate: finCommissionRate,
        rentalFee: finRentalFee
      });
    }
    setEditingFinance(false);
  };

  const stage = PIPELINE_STAGES.find(s => s.status === driver.status);
  const hasOverdueFollowUp = isOverdue(driver.nextFollowUpDate);
  const sortedActivities = [...(driver.activities || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', zIndex: 1000,
      background: 'rgba(5,10,22,0.98)', borderLeft: '1px solid rgba(56,189,248,0.2)',
      boxShadow: '-20px 0 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(56,189,248,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${stage?.color || '#38BDF8'}, #0D9488)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#FFF', fontSize: '15px' }}>
                {driver.firstName[0]}{driver.lastName[0]}
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFF', margin: 0 }}>{driver.firstName} {driver.lastName}</h2>
                <span style={{ fontSize: '11px', color: stage?.color || '#38BDF8', fontWeight: 600 }}>{stage?.label}</span>
              </div>
            </div>
            {hasOverdueFollowUp && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#F87171', marginTop: '4px' }}>
                <Bell size={11} /> Relance en retard — {formatDate(driver.nextFollowUpDate!)}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#64748B', padding: '8px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          {driver.status !== 'rattache' && driver.status !== 'actif' && driver.status !== 'inactif' && (
            <button
              onClick={() => onStatusChange('rattache')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                borderRadius: '8px',
                color: '#34D399',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; }}
            >
              <CheckCircle size={13} /> Rattacher
            </button>
          )}
          <a href={`tel:${driver.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10B981', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
            <Phone size={13} /> Appeler
          </a>
          <a href={`https://wa.me/${toWhatsAppNumber(driver.phone)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '8px', color: '#25D366', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
            <MessageSquare size={13} /> WhatsApp
          </a>
          <a href={`mailto:${driver.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', color: '#A78BFA', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
            <Mail size={13} /> Email
          </a>
          <button onClick={() => { setShowAddActivity(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#38BDF8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Ajouter note
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Rattachement Uber & Bolt : tout ce qu'il faut copier/envoyer, au même endroit */}
        <FleetEnrollment
          key={driver.id}
          driver={driver}
          onUpdate={onUpdate}
          onAddActivity={(act) => onAddActivity(act as never)}
        />

        {/* Change statut */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Pipeline</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {PIPELINE_STAGES.map((s) => (
              <button
                key={s.status}
                onClick={() => s.status !== driver.status && onStatusChange(s.status)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  background: driver.status === s.status ? s.bg : 'transparent',
                  border: `1px solid ${driver.status === s.status ? s.color : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px', cursor: driver.status === s.status ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (driver.status !== s.status) {
                    e.currentTarget.style.borderColor = s.color;
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }
                }}
                onMouseLeave={e => {
                  if (driver.status !== s.status) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ color: driver.status === s.status ? s.color : '#475569' }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: driver.status === s.status ? 700 : 500, color: driver.status === s.status ? s.color : '#94A3B8' }}>{s.label}</span>
                  <span style={{ fontSize: '11px', color: '#475569', display: 'block' }}>{s.description}</span>
                </div>
                {driver.status === s.status && <CheckCircle size={14} style={{ color: s.color }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Infos chauffeur */}
        <div style={{ marginBottom: '20px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Informations</p>
          {[
            { icon: <Phone size={13} />, label: 'Téléphone', value: driver.phone },
            { icon: <Mail size={13} />, label: 'Email', value: driver.email },
            { icon: <MapPin size={13} />, label: 'Ville', value: driver.city },
            { icon: <Car size={13} />, label: 'Véhicule', value: driver.vehicleModel || '—' },
            { icon: <Calendar size={13} />, label: 'Inscription', value: formatDate(driver.createdAt) },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#38BDF8', flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: '12px', color: '#64748B', width: '80px', flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
          {/* Plateformes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', marginTop: '2px' }}>
            <Car size={13} style={{ color: '#38BDF8', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#64748B', width: '80px', flexShrink: 0 }}>Plateformes</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {driver.platforms.map(p => (
                <span key={p} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '5px', padding: '2px 7px', fontSize: '11px', color: '#7DD3FC', fontWeight: 600, textTransform: 'capitalize' }}>{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Coordonnées Bancaires (IBAN) & Contrat Flotte */}
        <div style={{ marginBottom: '20px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={15} style={{ color: '#38BDF8' }} />
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                Coordonnées Bancaires & Contrat
              </p>
            </div>
            <button
              onClick={() => {
                if (editingFinance) {
                  handleSaveFinance();
                } else {
                  setFinIban(driver.iban || '');
                  setFinBic(driver.bic || '');
                  setFinFeeType(driver.feeType || 'fixe');
                  setFinFixedWeeklyFee(driver.fixedWeeklyFee !== undefined ? driver.fixedWeeklyFee : 50);
                  setFinCommissionRate(driver.commissionRate || 10);
                  setFinRentalFee(driver.rentalFee || 0);
                  setEditingFinance(true);
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: editingFinance ? '#10B981' : 'rgba(56,189,248,0.15)',
                border: `1px solid ${editingFinance ? '#10B981' : 'rgba(56,189,248,0.3)'}`,
                color: editingFinance ? '#FFF' : '#38BDF8',
                borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              {editingFinance ? <><Check size={12} /> Valider</> : <><Edit3 size={12} /> Modifier Contrat / IBAN</>}
            </button>
          </div>

          {!editingFinance ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>IBAN Virement :</span>
                {driver.iban ? (
                  <span style={{ fontFamily: 'monospace', color: '#34D399', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {formatIbanDisplay(driver.iban)}
                  </span>
                ) : (
                  <span style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 600 }}>⚠️ Non renseigné</span>
                )}
              </div>
              {driver.bic && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>BIC :</span>
                  <span style={{ fontFamily: 'monospace', color: '#CBD5E1', fontWeight: 600 }}>{driver.bic}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Tarification Flotte :</span>
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>
                  {driver.feeType === 'pourcentage'
                    ? `${driver.commissionRate || 10}% sur CA Net Plateformes`
                    : `${driver.fixedWeeklyFee !== undefined ? driver.fixedWeeklyFee : 50} € / semaine`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Déduction Véhicule :</span>
                <span style={{ color: driver.rentalFee && driver.rentalFee > 0 ? '#FBBF24' : '#64748B', fontWeight: 600 }}>
                  {driver.rentalFee && driver.rentalFee > 0 ? `${driver.rentalFee} € / semaine (Location)` : 'Aucune (Véhicule chauffeur)'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>IBAN (ex: FR76...)</label>
                <input
                  type="text"
                  placeholder="FR76 3000 6000 0112 3456 7890 189"
                  value={finIban}
                  onChange={e => setFinIban(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', background: '#070D1E', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#34D399', fontFamily: 'monospace', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Code BIC / SWIFT (Optionnel)</label>
                <input
                  type="text"
                  placeholder="BNPAFRPP"
                  value={finBic}
                  onChange={e => setFinBic(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', background: '#070D1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Type Tarification</label>
                  <select
                    value={finFeeType}
                    onChange={e => setFinFeeType(e.target.value as 'fixe' | 'pourcentage')}
                    style={{ width: '100%', padding: '8px', background: '#070D1E', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                  >
                    <option value="fixe">Forfait Fixe (€/sem)</option>
                    <option value="pourcentage">Pourcentage (%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                    {finFeeType === 'fixe' ? 'Montant Forfait Hebdo (€)' : 'Taux Commission (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={finFeeType === 'fixe' ? finFixedWeeklyFee : finCommissionRate}
                    onChange={e => {
                      const v = Number(e.target.value);
                      if (finFeeType === 'fixe') setFinFixedWeeklyFee(v);
                      else setFinCommissionRate(v);
                    }}
                    style={{ width: '100%', padding: '8px 10px', background: '#070D1E', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#38BDF8', fontWeight: 700, fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Déduction Location Véhicule (€/semaine)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0 si pas de véhicule loué"
                  value={finRentalFee}
                  onChange={e => setFinRentalFee(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', background: '#070D1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FBBF24', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingFinance(false)}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94A3B8', fontSize: '11px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveFinance}
                  style={{ padding: '6px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '6px', color: '#FFF', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Documents du dossier */}
        <div style={{ marginBottom: '20px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            📁 Documents du dossier
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {driver.documents.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Aucun document n'a été créé pour ce profil.</span>
            ) : (
              driver.documents.map(doc => {
                const isUploaded = !!doc.fileUrl;
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(10,16,36,0.4)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isUploaded ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isUploaded ? (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#38BDF8', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Cliquez pour visualiser le document">
                          {doc.name.replace(/Carte Professionnelle VTC/g, 'Carte VTC').replace(/Mémo \/ Attestation Assurance VTC/g, 'Attestation Assur.')} 📥
                        </a>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: isUploaded ? '#34D399' : '#F87171',
                      background: isUploaded ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: `1px solid ${isUploaded ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      flexShrink: 0
                    }}>
                      {isUploaded ? 'Reçu' : 'Manquant'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notes libres */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Notes internes</p>
            <button onClick={() => setEditingNotes(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38BDF8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Edit3 size={12} /> {editingNotes ? 'Fermer' : 'Modifier'}
            </button>
          </div>
          {editingNotes ? (
            <div>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} placeholder="Notes internes, informations spéciales..." style={{ width: '100%', padding: '10px', background: 'rgba(10,16,36,0.9)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#E2E8F0', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <button onClick={() => { onUpdate({ notes: editNotes }); setEditingNotes(false); }} style={{ marginTop: '8px', padding: '7px 16px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Sauvegarder</button>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: driver.notes ? '#CBD5E1' : '#475569', fontStyle: driver.notes ? 'normal' : 'italic', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
              {driver.notes || 'Aucune note. Cliquez sur Modifier pour en ajouter.'}
            </p>
          )}
        </div>

        {/* Formulaire ajout activité */}
        {showAddActivity && (
          <AddActivityForm onAdd={onAddActivity} onClose={() => setShowAddActivity(false)} />
        )}

        {/* Timeline des activités */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              <Activity size={12} style={{ display: 'inline', marginRight: '5px' }} />
              Historique ({sortedActivities.length})
            </p>
            {!showAddActivity && (
              <button onClick={() => setShowAddActivity(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', cursor: 'pointer', color: '#38BDF8', fontSize: '11px', padding: '4px 10px', fontWeight: 600 }}>
                <Plus size={11} /> Ajouter
              </button>
            )}
          </div>

          {sortedActivities.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              Aucun échange enregistré.
            </p>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '19px', top: 0, bottom: 0, width: '2px', background: 'rgba(56,189,248,0.1)' }} />
              {sortedActivities.map((act) => {
                const cfg = ACTIVITY_CONFIG[act.type];
                return (
                  <div key={act.id} style={{ display: 'flex', gap: '12px', marginBottom: '14px', position: 'relative' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `rgba(${cfg.color === '#10B981' ? '16,185,129' : '56,189,248'},0.12)`, border: `2px solid ${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                        <span style={{ fontSize: '11px', color: '#475569' }}>{formatDateTime(act.date)}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>{act.content}</p>
                      {act.authorName && <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>— {act.authorName}</span>}
                      {act.relanceDate && (
                        <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: isOverdue(act.relanceDate) ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${isOverdue(act.relanceDate) ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '5px', padding: '2px 8px', fontSize: '11px', color: isOverdue(act.relanceDate) ? '#F87171' : '#F59E0B' }}>
                          <Bell size={10} /> Relance : {formatDate(act.relanceDate)} {isOverdue(act.relanceDate) && '⚠️ En retard'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', color: '#F87171', fontSize: '12px', padding: '8px 14px', fontWeight: 600 }}>
              <Trash2 size={13} /> Supprimer ce chauffeur
            </button>
          ) : (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontSize: '13px', color: '#F87171', fontWeight: 600, marginBottom: '10px' }}>Confirmer la suppression ?</p>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>Cette action est irréversible. Toutes les données et l'historique de {driver.firstName} seront perdus.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={onDelete} style={{ padding: '7px 16px', background: '#EF4444', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', fontSize: '12px', cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN CRM COMPONENT ───────────────────────────────────────────────────────
export const DriverCRM: React.FC<DriverCRMProps> = ({
  drivers, onUpdateDriverStatus, onAddDriver, onDeleteDriver, onAddActivity, onUpdateDriver,
  onUpdateDriverIban, onUpdateDriverContract
}) => {
  const [crmView, setCrmView] = useState<'dashboard' | 'pipeline'>('dashboard');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<DriverStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'alphabetique' | 'recent' | 'relance'>('alphabetique');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', phone: '', email: '', city: '' });
  const [expandedStage, setExpandedStage] = useState<DriverStatus | null>(null);

  // Update selectedDriver when drivers array changes (to keep panel in sync)
  const selectedDriverLive = selectedDriver ? drivers.find(d => d.id === selectedDriver.id) || null : null;

  const filteredDrivers = useMemo(() => {
    const list = drivers.filter(d => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || `${d.firstName} ${d.lastName} ${d.phone} ${d.city} ${d.email}`.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchSearch && matchStatus;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'alphabetique') {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'relance') {
        const dateA = a.nextFollowUpDate ? new Date(a.nextFollowUpDate).getTime() : Infinity;
        const dateB = b.nextFollowUpDate ? new Date(b.nextFollowUpDate).getTime() : Infinity;
        return dateA - dateB;
      }
      return 0;
    });
  }, [drivers, searchQuery, filterStatus, sortBy]);

  const countByStatus = useMemo(() => {
    const counts: Partial<Record<DriverStatus, number>> = {};
    drivers.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [drivers]);

  // Chauffeurs à relancer
  const overdueDrivers = drivers.filter(d => isOverdue(d.nextFollowUpDate) && d.status !== 'actif' && d.status !== 'inactif');

  const handleStatusChange = (driverId: string, newStatus: DriverStatus) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    onUpdateDriverStatus(driverId, newStatus);
    // Auto-activity log
    onAddActivity(driverId, {
      type: 'statut_change',
      content: `Statut changé : "${PIPELINE_STAGES.find(s => s.status === driver.status)?.label}" → "${PIPELINE_STAGES.find(s => s.status === newStatus)?.label}"`,
      oldStatus: driver.status,
      newStatus,
    });
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const newDriver: Driver = {
      id: `drv-${Date.now().toString().slice(-6)}`,
      firstName: addForm.firstName.trim(),
      lastName: addForm.lastName.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim(),
      city: addForm.city.trim(),
      hasVtcCard: false,
      hasVehicle: false,
      platforms: [],
      status: 'nouveau_prospect',
      createdAt: now,
      commissionRate: 0,
      fixedWeeklyFee: 50,
      documents: [],
      activities: [{
        id: `act-${Date.now()}`,
        date: now,
        type: 'inscription',
        content: 'Chauffeur ajouté manuellement depuis le CRM.',
      }],
    };
    onAddDriver(newDriver);
    setAddForm({ firstName: '', lastName: '', phone: '', email: '', city: '' });
    setShowAddForm(false);
  };

  const exportToCSV = () => {
    const headers = [
      'Prénom', 'Nom', 'Téléphone', 'Email', 'Ville',
      'Statut', 'Carte VTC', 'Véhicule', 'Plaque', 'Plateformes',
      'Entreprise', 'Frais Hebdo (€)',
      'Docs reçus', 'Docs manquants', 'Inscription', 'Dernier contact', 'Relance prévue', 'Notes'
    ];

    const statusLabels: Record<string, string> = {
      nouveau_prospect: 'Nouveau prospect',
      contact_initial: '1er contact',
      docs_en_attente: 'Docs en attente',
      docs_recus: 'Docs reçus',
      rattache: 'Rattaché',
      actif: 'Actif',
      inactif: 'Inactif',
    };

    const rows = drivers.map(d => {
      const docsRecus = d.documents.filter(doc => !!doc.fileUrl).length;
      const docsManquants = d.documents.filter(doc => !doc.fileUrl).length;
      const lastActivity = (d.activities || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '';
      const escape = (val?: string | number) => {
        if (val === undefined || val === null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      };
      return [
        escape(d.firstName),
        escape(d.lastName),
        escape(d.phone),
        escape(d.email),
        escape(d.city),
        escape(statusLabels[d.status] || d.status),
        d.hasVtcCard ? 'Oui' : 'Non',
        escape(d.vehicleModel),
        escape(d.vehiclePlate),
        escape(d.platforms.join(' | ')),
        escape(d.companyName),
        d.fixedWeeklyFee ?? 50,
        docsRecus,
        docsManquants,
        formatDate(d.createdAt),
        formatDate(lastActivity?.date),
        formatDate(d.nextFollowUpDate),
        escape(d.notes),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const bom = '\uFEFF'; // BOM for Excel/Sheets UTF-8 compatibility
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    link.download = `Nordrive_CRM_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        alert('Le fichier semble vide ou ne contient que des en-têtes.');
        return;
      }

      // Auto-détecter le séparateur (, ou ;)
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';

      let count = 0;
      const now = new Date().toISOString();

      // Ignorer la ligne d'en-tête (ligne 0)
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(sep).map(cell => cell.replace(/^"|"$/g, '').trim());
        if (row.length < 2 || !row[0]) continue; // ignorer lignes vides

        const firstName = row[0] || 'Chauffeur';
        const lastName = row[1] || `Doc-${i}`;
        const phone = row[2] || '+33 6 00 00 00 00';
        const email = row[3] || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
        const city = row[4] || 'Paris';
        const statusRaw = row[5] || 'rattache';

        const statusMap: Record<string, DriverStatus> = {
          'nouveau prospect': 'nouveau_prospect',
          '1er contact': 'contact_initial',
          'docs en attente': 'docs_en_attente',
          'docs reçus': 'docs_recus',
          'rattache': 'rattache',
          'rattaché': 'rattache',
          'actif': 'actif',
          'inactif': 'inactif',
        };

        const status: DriverStatus = statusMap[statusRaw.toLowerCase()] || 'rattache';

        const importedDriver: Driver = {
          id: `drv-imp-${Date.now()}-${i}`,
          firstName,
          lastName,
          phone,
          email,
          city,
          hasVtcCard: true,
          hasVehicle: true,
          platforms: ['uber', 'bolt'],
          status,
          createdAt: now,
          commissionRate: 0,
          fixedWeeklyFee: 50,
          siren: row[10] || '',
          companyName: row[11] || '',
          documents: [],
          activities: [
            {
              id: `act-${Date.now()}-${i}`,
              date: now,
              type: 'note',
              content: 'Importé en masse depuis un fichier CSV/Excel.',
            }
          ]
        };

        onAddDriver(importedDriver);
        count++;
      }

      alert(`✅ ${count} chauffeur(s) importé(s) avec succès dans le CRM !`);
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  if (crmView === 'dashboard') {
    return (
      <div>
        <div style={{ background: '#0A1020', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', padding: '10px 24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setCrmView('dashboard')}
            style={{ padding: '6px 16px', borderRadius: '100px', border: 'none', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}
          >
            📊 Tableau de Bord ERP Nordrive
          </button>
          <button
            onClick={() => setCrmView('pipeline')}
            style={{ padding: '6px 16px', borderRadius: '100px', border: '1px solid rgba(56, 189, 248, 0.2)', background: 'rgba(255, 255, 255, 0.03)', color: '#94A3B8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            👥 Pipeline & Dossiers Chauffeurs ({drivers.length})
          </button>
        </div>
        <p style={{ color: '#94A3B8', fontSize: '14px', padding: '24px' }}>
          Le tableau de bord ERP (véhicules, amendes, contrats) est en cours de reconstruction avec la nouvelle administration sécurisée.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050A16', fontFamily: "'Inter', system-ui, sans-serif", color: '#E2E8F0' }}>

      {/* TOP BAR */}
      <div style={{ background: 'rgba(10,16,36,0.95)', borderBottom: '1px solid rgba(56,189,248,0.15)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setCrmView('dashboard')}
            style={{ padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Tableau de Bord ERP Nordrive
          </button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px', margin: 0 }}>
              CRM <span style={{ color: '#38BDF8' }}>Nordrive</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{drivers.length} chauffeur{drivers.length !== 1 ? 's' : ''} au total</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {overdueDrivers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#F87171' }}>
              <Bell size={13} /> {overdueDrivers.length} relance{overdueDrivers.length > 1 ? 's' : ''} en retard
            </div>
          )}
          <button
            onClick={exportToCSV}
            title="Exporter la liste des chauffeurs (Google Sheets / Excel)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', color: '#34D399', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.1)'}
          >
            <Download size={14} /> Exporter CSV
          </button>
          <label
            title="Importer une liste de chauffeurs existants (fichier CSV / Excel)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', color: '#38BDF8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(56,189,248,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(56,189,248,0.1)'}
          >
            <Upload size={14} /> Importer CSV
            <input type="file" accept=".csv,.txt" onChange={handleImportCSVFile} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setShowAddForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '10px', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Ajouter chauffeur
          </button>
          <button
            onClick={() => {
              if (window.confirm('Voulez-vous réinitialiser et nettoyer TOUTES les données de test ?\n(Cela videra le CRM pour repartir sur une base 100% propre et réelle).')) {
                clearNordriveStorage();
                window.location.reload();
              }
            }}
            title="Effacer toutes les données de test et démarrer sur un CRM 100% propre"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', color: '#F87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <RotateCcw size={13} /> Nettoyer données test
          </button>
          <button onClick={() => { window.location.href = '/'; }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}>
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* FORM AJOUT MANUEL */}
        {showAddForm && (
          <div style={{ background: 'rgba(10,16,36,0.95)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>Nouveau chauffeur</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddDriver}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Prénom *', key: 'firstName', placeholder: 'Claire' },
                  { label: 'Nom *', key: 'lastName', placeholder: 'Dupont' },
                  { label: 'Téléphone *', key: 'phone', placeholder: '+33 6 12 34 56 78' },
                  { label: 'Email', key: 'email', placeholder: 'email@exemple.com' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '5px' }}>{label}</label>
                    <input
                      required={key !== 'email'}
                      value={(addForm as Record<string, string>)[key]}
                      onChange={e => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '9px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '5px' }}>Ville *</label>
                  <input
                    required
                    value={addForm.city}
                    onChange={e => setAddForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Paris"
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '10px', color: '#FFF', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Créer le prospect
              </button>
            </form>
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, téléphone, ville..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(10,16,36,0.8)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px', color: '#E2E8F0', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as DriverStatus | 'all')}
            style={{ padding: '10px 14px', background: 'rgba(10,16,36,0.8)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px', color: '#E2E8F0', fontSize: '13px', cursor: 'pointer' }}>
            <option value="all">Tous les statuts ({drivers.length})</option>
            {PIPELINE_STAGES.map(s => (
              <option key={s.status} value={s.status}>{s.label} ({countByStatus[s.status] || 0})</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'alphabetique' | 'recent' | 'relance')}
            style={{ padding: '10px 14px', background: 'rgba(10,16,36,0.8)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px', color: '#E2E8F0', fontSize: '13px', cursor: 'pointer' }}>
            <option value="alphabetique">Trier par : Nom (A-Z)</option>
            <option value="recent">Trier par : Inscription (Récents)</option>
            <option value="relance">Trier par : Relance due</option>
          </select>
        </div>

        {/* PIPELINE KANBAN */}
        {filterStatus === 'all' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {PIPELINE_STAGES.map(stage => {
              const stageDrivers = filteredDrivers.filter(d => d.status === stage.status);
              const isExpanded = expandedStage === stage.status || stageDrivers.length > 0;
              return (
                <div key={stage.status} style={{ background: 'rgba(10,16,36,0.6)', border: `1px solid ${stageDrivers.length > 0 ? stage.color + '33' : 'rgba(255,255,255,0.05)'}`, borderRadius: '14px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedStage(expandedStage === stage.status ? null : stage.status)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', background: stageDrivers.length > 0 ? stage.bg : 'transparent' }}
                  >
                    <span style={{ color: stage.color }}>{stage.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: stageDrivers.length > 0 ? stage.color : '#475569' }}>{stage.label}</span>
                    <span style={{ background: stageDrivers.length > 0 ? stage.color : 'rgba(255,255,255,0.1)', color: stageDrivers.length > 0 ? '#000' : '#475569', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', marginLeft: '4px' }}>
                      {stageDrivers.length}
                    </span>
                    <span style={{ fontSize: '12px', color: '#475569', marginLeft: '4px' }}>{stage.description}</span>
                    <div style={{ marginLeft: 'auto', color: '#475569' }}>
                      {isExpanded && stageDrivers.length > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {(isExpanded || stageDrivers.length > 0) && stageDrivers.length > 0 && (
                    <div style={{ padding: '0 18px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                      {stageDrivers.map(driver => (
                        <DriverCard
                          key={driver.id}
                          driver={driver}
                          stageColor={stage.color}
                          onClick={() => setSelectedDriver(driver)}
                          onStatusChange={(status) => handleStatusChange(driver.id, status)}
                          onDelete={() => onDeleteDriver(driver.id)}
                        />
                      ))}
                    </div>
                  )}
                  {stageDrivers.length === 0 && (
                    <div style={{ padding: '16px 18px', fontSize: '12px', color: '#334155', fontStyle: 'italic' }}>Aucun chauffeur dans cette étape.</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* FILTERED LIST VIEW */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {filteredDrivers.length === 0 ? (
              <p style={{ color: '#475569', fontStyle: 'italic', fontSize: '14px', gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>Aucun chauffeur trouvé.</p>
            ) : (
              filteredDrivers.map(driver => {
                const s = PIPELINE_STAGES.find(st => st.status === driver.status);
                return (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    stageColor={s?.color || '#38BDF8'}
                    onClick={() => setSelectedDriver(driver)}
                    onStatusChange={(status) => handleStatusChange(driver.id, status)}
                    onDelete={() => onDeleteDriver(driver.id)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* DRIVER DETAIL PANEL */}
      {selectedDriverLive && (
        <>
          <div onClick={() => setSelectedDriver(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
          <DriverPanel
            driver={selectedDriverLive}
            onClose={() => setSelectedDriver(null)}
            onStatusChange={(s) => { handleStatusChange(selectedDriverLive.id, s); }}
            onAddActivity={(act) => onAddActivity(selectedDriverLive.id, act)}
            onUpdate={(updates) => onUpdateDriver(selectedDriverLive.id, updates)}
            onDelete={() => { onDeleteDriver(selectedDriverLive.id); setSelectedDriver(null); }}
            onUpdateIban={onUpdateDriverIban}
            onUpdateContract={onUpdateDriverContract}
          />
        </>
      )}
    </div>
  );
};

// ─── DRIVER CARD ──────────────────────────────────────────────────────────────
interface DriverCardProps {
  driver: Driver;
  stageColor: string;
  onClick: () => void;
  onStatusChange: (status: DriverStatus) => void;
  onDelete: () => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, stageColor, onClick, onStatusChange, onDelete }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const pendingDocs = driver.documents.filter(d => d.status === 'missing').length;
  const hasOverdue = isOverdue(driver.nextFollowUpDate);
  const lastActivity = (driver.activities || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(15,23,42,0.7)', border: `1px solid ${hasOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = stageColor + '44'; (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.9)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = hasOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.7)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `linear-gradient(135deg, ${stageColor}33, ${stageColor}11)`, border: `2px solid ${stageColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: stageColor, fontSize: '12px', flexShrink: 0 }}>
            {driver.firstName[0]}{driver.lastName[0]}
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', margin: 0 }}>{driver.firstName} {driver.lastName}</p>
            <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{driver.city}</p>
          </div>
        </div>
        <ChevronRight size={15} style={{ color: '#334155', flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#64748B' }}><Phone size={10} style={{ display: 'inline' }} /> {driver.phone}</span>
        {pendingDocs > 0 && (
          <span style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '4px', padding: '1px 7px', fontSize: '10px', color: '#F97316', fontWeight: 700 }}>
            {pendingDocs} doc{pendingDocs > 1 ? 's' : ''} manquant{pendingDocs > 1 ? 's' : ''}
          </span>
        )}
        {hasOverdue && (
          <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '1px 7px', fontSize: '10px', color: '#F87171', fontWeight: 700 }}>
            ⚠️ Relance due
          </span>
        )}
      </div>

      {lastActivity && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={10} />
          <span>Dernier contact : {formatDateTime(lastActivity.date)}</span>
        </div>
      )}
      <div style={{ marginTop: '6px', fontSize: '11px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          <Calendar size={10} style={{ display: 'inline', marginRight: '4px' }} />
          Inscrit le {formatDate(driver.createdAt)}
        </span>
      </div>

      {/* Button to Validate Rattachement (only for docs_recus) */}
      {driver.status === 'docs_recus' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange('rattache');
          }}
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '8px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFF',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
          }}
        >
          <span>Valider le Rattachement ✅</span>
        </button>
      )}

      {/* Direct Status Selector and Quick Delete on Card */}
      {isConfirmingDelete ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#F87171', fontWeight: 700 }}>Supprimer ?</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                padding: '4px 10px',
                background: '#EF4444',
                border: 'none',
                borderRadius: '5px',
                color: '#FFF',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Oui
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirmingDelete(false);
              }}
              style={{
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '5px',
                color: '#94A3B8',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Non
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#475569' }}>Statut :</span>
            <select
              value={driver.status}
              onChange={(e) => {
                onStatusChange(e.target.value as DriverStatus);
              }}
              style={{
                padding: '3px 6px',
                background: 'rgba(10,16,36,0.8)',
                border: '1px solid rgba(56,189,248,0.15)',
                borderRadius: '6px',
                color: stageColor,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {PIPELINE_STAGES.map(s => (
                <option key={s.status} value={s.status} style={{ color: '#E2E8F0', background: '#0A0D16' }}>{s.label}</option>
              ))}
              <option value="inactif" style={{ color: '#E2E8F0', background: '#0A0D16' }}>Archivé (Inactif)</option>
            </select>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirmingDelete(true);
            }}
            title="Supprimer définitivement ce chauffeur"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#EF4444',
              opacity: 0.5,
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
