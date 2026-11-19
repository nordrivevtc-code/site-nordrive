import { useState, useCallback, lazy, Suspense } from 'react';
import { PublicPortal } from './components/PublicPortal';
import { AdminLogin, isAdminAuthenticated } from './components/AdminLogin';

// Back-office chargé à la demande : les visiteurs du site public ne téléchargent pas ces écrans.
const Navbar = lazy(() => import('./components/Navbar').then(m => ({ default: m.Navbar })));
const DriverCRM = lazy(() => import('./components/DriverCRM').then(m => ({ default: m.DriverCRM })));
const AccountingPayroll = lazy(() => import('./components/AccountingPayroll').then(m => ({ default: m.AccountingPayroll })));
const ApiIntegrationGuide = lazy(() => import('./components/ApiIntegrationGuide').then(m => ({ default: m.ApiIntegrationGuide })));
const ApiSettings = lazy(() => import('./components/ApiSettings').then(m => ({ default: m.ApiSettings })));
import { useDrivers, usePayrollWeeks, useFleetSettings } from './hooks/useSupabaseData';
import { isSupabaseConfigured } from './lib/supabase';
import { round2, mergeWeeklyPayrolls, cleanIban, normalizeDriverName } from './lib/statementParsers';

import type { Driver, DriverPayrollWeek, FleetSettings, DriverStatus, Activity } from './types/fleet';
import { initialDrivers, initialPayrollWeeks, initialFleetSettings } from './data/mockData';

export function App() {
  // ─── Total Stealth Admin Gate ───────────────────────────────────────────────
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  
  const hasSecretKey = searchParams.get('key') === 'RETIRE' || searchParams.get('sec') === 'RETIRE' || searchParams.get('key') === 'RETIRE';
  const isTargetingAdminPath = pathname === '/admin' || pathname === '/admin-login' || searchParams.get('admin') === 'true' || searchParams.get('mode') === 'crm';
  const wantsAdmin = isTargetingAdminPath && hasSecretKey;

  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(isAdminAuthenticated());

  // ─── Active tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'site_public' | 'crm_chauffeurs' | 'comptabilite_paie' | 'guide_api' | 'parametres_api'>(
    wantsAdmin ? 'crm_chauffeurs' : 'site_public'
  );

  // ─── Persistent state (Supabase Cloud Sync) ─────────────────────────────────
  const [drivers, setDrivers, driversStatus] = useDrivers(initialDrivers);
  const [payrollWeeks, setPayrollWeeks, , directDeletePayrollWeeks] = usePayrollWeeks(initialPayrollWeeks);
  const [fleetSettings, setFleetSettings] = useFleetSettings(initialFleetSettings);

  const supabaseOk = isSupabaseConfigured();

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /** Inscription depuis le formulaire public */
  const handleRegisterDriver = useCallback((
    newDriverInput: Omit<Driver, 'id' | 'createdAt' | 'status' | 'documents' | 'commissionRate' | 'fixedWeeklyFee' | 'activities'>,
    uploadedDocs?: Array<{ name: string; type: Driver['documents'][number]['type']; fileUrl?: string }>
  ) => {
    const now = new Date().toISOString();

    const baseDocs: Driver['documents'] = [
      { id: `doc-${Date.now()}-1`, name: 'Carte Professionnelle VTC (Recto)', type: 'carte_vtc', status: newDriverInput.hasVtcCard ? 'pending' : 'missing', updatedAt: now },
      { id: `doc-${Date.now()}-2`, name: 'Carte Professionnelle VTC (Verso)', type: 'carte_vtc_verso', status: newDriverInput.hasVtcCard ? 'pending' : 'missing', updatedAt: now },
      { id: `doc-${Date.now()}-3`, name: 'RC Circulation', type: 'rc_circulation', status: 'pending', updatedAt: now },
      { id: `doc-${Date.now()}-4`, name: 'Carte Grise', type: 'carte_grise', status: 'pending', updatedAt: now },
      { id: `doc-${Date.now()}-5`, name: 'Mémo / Attestation Assurance VTC', type: 'memo_assurance', status: 'pending', updatedAt: now },
      { id: `doc-${Date.now()}-6`, name: 'Photo de Signature', type: 'signature', status: 'pending', updatedAt: now },
    ];

    const finalDocs = baseDocs.map(doc => {
      const match = uploadedDocs?.find(u => u.type === doc.type);
      if (match?.fileUrl) return { ...doc, name: `${doc.name} — ${match.name}`, status: 'pending' as const, fileUrl: match.fileUrl, updatedAt: now };
      return { ...doc, status: 'missing' as const };
    });

    const uploadedCount = uploadedDocs ? uploadedDocs.filter(u => u.fileUrl).length : 0;

    const inscriptionActivity: Activity = {
      id: `act-${Date.now()}`,
      date: now,
      type: 'inscription',
      content: `Inscription via le formulaire public. Ville : ${newDriverInput.city}. Plateformes : ${newDriverInput.platforms.join(', ') || 'non précisées'}. Documents uploadés : ${uploadedCount} / 6.`,
    };

    setDrivers(prev => {
      // Nettoyer les numéros pour comparaison (supprimer les espaces, tirets, etc.)
      const cleanPhone = (p: string) => p.replace(/\s+/g, '').replace(/[-()]/g, '');
      const newPhoneClean = cleanPhone(newDriverInput.phone);

      const newEmailClean = (newDriverInput.email || '').toLowerCase().trim();

      // L'e-mail est facultatif : on ne compare les e-mails que s'ils sont renseignés,
      // sinon deux chauffeurs sans e-mail seraient fusionnés à tort.
      const existingIndex = prev.findIndex(d =>
        cleanPhone(d.phone) === newPhoneClean ||
        (newEmailClean !== '' && (d.email || '').toLowerCase().trim() === newEmailClean)
      );

      if (existingIndex !== -1) {
        // Le chauffeur existe déjà ! On met à jour son dossier avec les nouvelles infos et docs
        const existing = prev[existingIndex];

        // Fusionner les documents (conserver les anciens valides/en attente, écraser si nouveau fichier fourni)
        const mergedDocs = existing.documents.map(doc => {
          const newDoc = uploadedDocs?.find(u => u.type === doc.type);
          if (newDoc?.fileUrl) {
            return {
              ...doc,
              name: `${doc.name.split(' — ')[0]} — ${newDoc.name}`,
              status: 'pending' as const,
              fileUrl: newDoc.fileUrl,
              updatedAt: now,
            };
          }
          return doc;
        });

        // Recalculer le statut en fonction de la totalité des documents disponibles maintenant
        const totalUploadedDocs = mergedDocs.filter(d => d.fileUrl).length;
        let nextStatus = existing.status;
        
        // On met à jour le statut uniquement s'il n'est pas déjà validé/rattaché/actif
        if (existing.status === 'nouveau_prospect' || existing.status === 'docs_en_attente' || existing.status === 'docs_recus') {
          if (totalUploadedDocs === 6) {
            nextStatus = 'docs_recus';
          } else if (totalUploadedDocs > 0) {
            nextStatus = 'docs_en_attente';
          } else {
            nextStatus = 'nouveau_prospect';
          }
        }

        const updateActivity: Activity = {
          id: `act-${Date.now()}`,
          date: now,
          type: 'inscription',
          content: `Nouvelle soumission du formulaire public. Données et documents mis à jour (total docs : ${totalUploadedDocs}/6).`,
        };

        const updatedDriver: Driver = {
          ...existing,
          ...newDriverInput,
          documents: mergedDocs,
          status: nextStatus,
          activities: [...(existing.activities || []), updateActivity],
        };

        const updatedList = [...prev];
        updatedList.splice(existingIndex, 1);
        return [updatedDriver, ...updatedList]; // Placer le chauffeur mis à jour au début de la liste (nouveau lead)
      }

      // Si c'est un nouveau chauffeur, on l'ajoute normalement
      let initialStatus: DriverStatus = 'nouveau_prospect';
      if (uploadedCount === 6) {
        initialStatus = 'docs_recus';
      } else if (uploadedCount > 0) {
        initialStatus = 'docs_en_attente';
      }

      const createdDriver: Driver = {
        ...newDriverInput,
        id: `drv-${Date.now().toString().slice(-6)}`,
        status: initialStatus,
        createdAt: now,
        commissionRate: 0,
        fixedWeeklyFee: fleetSettings.defaultWeeklyFee ?? 50,
        documents: finalDocs,
        activities: [inscriptionActivity],
      };

      return [createdDriver, ...prev];
    });
  }, [fleetSettings.defaultWeeklyFee, setDrivers]);

  /** Changement de statut */
  const handleUpdateDriverStatus = useCallback((driverId: string, newStatus: DriverStatus) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: newStatus } : d));
  }, [setDrivers]);

  /** Mise à jour tarif hebdomadaire */
  const handleUpdateDriverCommission = useCallback((driverId: string, rate: number) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, fixedWeeklyFee: rate } : d));
  }, [setDrivers]);

  /** Ajout manuel d'un chauffeur depuis le CRM */
  const handleAddDriver = useCallback((newDriver: Driver) => {
    setDrivers(prev => [newDriver, ...prev]);
  }, [setDrivers]);

  /** Suppression d'un chauffeur */
  const handleDeleteDriver = useCallback((driverId: string) => {
    setDrivers(prev => prev.filter(d => d.id !== driverId));
  }, [setDrivers]);

  /** Ajout d'une activité dans la timeline d'un chauffeur */
  const handleAddActivity = useCallback((driverId: string, activityInput: Omit<Activity, 'id' | 'date'>) => {
    const now = new Date().toISOString();
    const newActivity: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: now,
      ...activityInput,
    };
    setDrivers(prev => prev.map(d => {
      if (d.id !== driverId) return d;
      return {
        ...d,
        activities: [...(d.activities || []), newActivity],
        lastContactDate: activityInput.type !== 'statut_change' ? now : d.lastContactDate,
        nextFollowUpDate: activityInput.relanceDate || d.nextFollowUpDate,
      };
    }));
  }, [setDrivers]);

  /** Mise à jour générale d'un chauffeur (notes, etc.) */
  const handleUpdateDriver = useCallback((driverId: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, ...updates } : d));
  }, [setDrivers]);

  /** Payroll */
  const handleUpdatePayrollStatus = useCallback((payrollId: string, status: DriverPayrollWeek['paymentStatus']) => {
    setPayrollWeeks(prev => prev.map(p => p.id === payrollId ? { ...p, paymentStatus: status } : p));
  }, [setPayrollWeeks]);

  const handleUpdateFleetSettings = useCallback((newSettings: Partial<FleetSettings>) => {
    setFleetSettings(prev => ({ ...prev, ...newSettings }));
  }, [setFleetSettings]);

  const handleImportWeeklyStatement = useCallback((importedRecords: DriverPayrollWeek[]) => {
    // 1. Détecter et créer automatiquement les nouveaux chauffeurs inconnus dans l'annuaire CRM
    setDrivers(prevDrivers => {
      const newDriversToAdd: Driver[] = [];
      const now = new Date().toISOString();

      for (const rec of importedRecords) {
        const normRecName = normalizeDriverName(rec.driverName);
        const recWords = normRecName.split(' ').filter(w => w.length >= 3);
        const matchesDriver = (d: Driver) => {
          if (d.id === rec.driverId) return true;
          const normD = normalizeDriverName(`${d.firstName} ${d.lastName}`);
          if (normD === normRecName) return true;
          if (normRecName.length > 5 && normD.includes(normRecName)) return true;
          if (normD.length > 5 && normRecName.includes(normD)) return true;
          const dWords = normD.split(' ').filter(w => w.length >= 3);
          const common = recWords.filter(w => dWords.includes(w));
          return common.length >= 2;
        };

        const exists = prevDrivers.some(matchesDriver) || newDriversToAdd.some(matchesDriver);

        if (!exists) {
          const parts = rec.driverName.trim().split(/\s+/);
          const firstName = parts[0] || 'Chauffeur';
          const lastName = parts.slice(1).join(' ') || '';
          
          const detectedPlatforms: ('uber' | 'bolt' | 'heetch')[] = [];
          if (rec.earnings.uber > 0) detectedPlatforms.push('uber');
          if (rec.earnings.bolt > 0) detectedPlatforms.push('bolt');
          if (rec.earnings.heetch > 0) detectedPlatforms.push('heetch');
          if (detectedPlatforms.length === 0) detectedPlatforms.push('uber');

          const newDriver: Driver = {
            id: rec.driverId || `drv-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            firstName,
            lastName,
            email: `${normalizeDriverName(firstName)}.${normalizeDriverName(lastName || 'vtc')}@nordrive-flotte.fr`,
            phone: '',
            city: 'Paris (Île-de-France)',
            hasVtcCard: true,
            hasVehicle: true,
            vehicleModel: 'Berline VTC Conforme',
            platforms: detectedPlatforms,
            status: 'actif',
            createdAt: now,
            notes: `Nouveau chauffeur détecté et intégré automatiquement via l'import CSV (Semaine ${rec.weekNumber}).`,
            documents: [],
            fixedWeeklyFee: (rec.feeType === 'fixe' && rec.feeRateApplied !== undefined) ? rec.feeRateApplied : (fleetSettings.defaultWeeklyFee ?? 50),
            feeType: rec.feeType || 'fixe',
            commissionRate: (rec.feeType === 'pourcentage' && rec.feeRateApplied !== undefined) ? rec.feeRateApplied : 10,
            rentalFee: rec.rentalDeduction || 0,
            iban: rec.iban || '',
            bic: rec.bic || '',
            activities: [
              {
                id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                date: now,
                type: 'statut_change',
                content: `Chauffeur créé automatiquement lors de l'import du relevé de paie Semaine ${rec.weekNumber}.`,
                authorName: 'Système CRM Nordrive',
                newStatus: 'actif'
              }
            ]
          };

          newDriversToAdd.push(newDriver);
        }
      }

      if (newDriversToAdd.length > 0) {
        return [...prevDrivers, ...newDriversToAdd];
      }
      return prevDrivers;
    });

    // 2. Fusionner et enregistrer les paies
    setPayrollWeeks(prev => {
      return mergeWeeklyPayrolls(prev, importedRecords, drivers);
    });
  }, [drivers, fleetSettings.defaultWeeklyFee, setDrivers, setPayrollWeeks]);

  const handleUpdateDriverIban = useCallback((driverId: string, iban: string, bic?: string) => {
    const clean = cleanIban(iban);
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, iban: clean, bic: bic !== undefined ? bic : d.bic } : d));
    setPayrollWeeks(prev => prev.map(p => p.driverId === driverId ? { ...p, iban: clean, bic: bic !== undefined ? bic : p.bic } : p));
  }, [setDrivers, setPayrollWeeks]);

  const handleUpdatePayrollRecord = useCallback((payrollId: string, updates: Partial<DriverPayrollWeek>) => {
    setPayrollWeeks(prev => prev.map(p => {
      if (p.id !== payrollId) return p;
      const merged = { ...p, ...updates };
      const totalBrut = merged.earnings.totalBrut || 0;
      const fee = merged.fleetCommissionAmount || 0;
      const rental = merged.rentalDeduction || 0;
      const cash = merged.otherDeductions || 0;
      const netPayout = round2(totalBrut - fee - rental - cash);
      return { ...merged, netPayout };
    }));
  }, [setPayrollWeeks]);

  const handleUpdateDriverContract = useCallback((driverId: string, contractUpdates: Partial<Driver>, driverName?: string) => {
    setDrivers(prev => prev.map(d => {
      const matchId = d.id === driverId;
      const normD = normalizeDriverName(`${d.firstName} ${d.lastName}`);
      const normTarget = driverName ? normalizeDriverName(driverName) : '';
      const matchName = Boolean(normTarget && (normD === normTarget || normD.includes(normTarget) || normTarget.includes(normD)));
      if (matchId || matchName) {
        return { ...d, ...contractUpdates };
      }
      return d;
    }));
  }, [setDrivers]);

  const handleClearWeek = useCallback(async (weekNumber: number) => {
    // Supprimer via directDelete (pause Realtime + suppression Supabase directe)
    const idsToDelete = payrollWeeks
      .filter(p => p.weekNumber === weekNumber)
      .map(p => p.id);
    await directDeletePayrollWeeks(idsToDelete);
  }, [payrollWeeks, directDeletePayrollWeeks]);

  const handleClearAllPayroll = useCallback(async () => {
    localStorage.removeItem('nordrive_real_payroll');
    localStorage.removeItem('nordrive_payroll');
    localStorage.removeItem('nordrive_payroll_weeks');
    // Supprimer tous les IDs via directDelete (pause Realtime + suppression directe Supabase)
    const allIds = payrollWeeks.map(p => p.id);
    await directDeletePayrollWeeks(allIds);
  }, [payrollWeeks, directDeletePayrollWeeks]);

  // ─── Render Total Stealth 404 Gate ──────────────────────────────────────────
  if (isTargetingAdminPath && !hasSecretKey && !adminAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#050A16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF', textAlign: 'center', padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ fontSize: '80px', fontWeight: 900, color: '#38BDF8', lineHeight: 1, marginBottom: '16px', letterSpacing: '-2px' }}>404</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#FFF' }}>Page introuvable</h1>
        <p style={{ color: '#64748B', maxWidth: '420px', fontSize: '13.5px', margin: '0 auto 24px', lineHeight: 1.5 }}>
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <a href="/" style={{ padding: '12px 28px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', fontWeight: 800, fontSize: '13px', textDecoration: 'none', boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)' }}>
          Retourner à l'accueil Nordrive →
        </a>
      </div>
    );
  }

  if (wantsAdmin && !adminAuthenticated) {
    return <AdminLogin onAuthenticated={() => { setAdminAuthenticated(true); setActiveTab('crm_chauffeurs'); }} />;
  }

  if (activeTab !== 'site_public' && !adminAuthenticated) {
    return <AdminLogin onAuthenticated={() => setAdminAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0D16] text-gray-100 flex flex-col font-sans">
      {/* Sync status badge — visible only in admin mode */}
      {activeTab !== 'site_public' && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
          backdropFilter: 'blur(8px)',
          ...(supabaseOk
            ? driversStatus === 'error'
              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }
              : driversStatus === 'syncing'
              ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D' }
              : driversStatus === 'loading'
              ? { background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#7DD3FC' }
              : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34D399' }
            : { background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748B' }
          )
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block',
            animation: driversStatus === 'syncing' || driversStatus === 'loading' ? 'pulse 1s ease-in-out infinite' : 'none' }} />
          {!supabaseOk ? '💾 Stockage local' :
            driversStatus === 'loading' ? '☁ Chargement...' :
            driversStatus === 'syncing' ? '☁ Synchronisation...' :
            driversStatus === 'error' ? '⚠ Erreur Supabase' :
            '☁ Cloud synchronisé'}
        </div>
      )}
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 13 }}>Chargement…</div>}>
      {activeTab !== 'site_public' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          drivers={drivers}
          payrollWeeks={payrollWeeks}
        />
      )}

      <main className="flex-1">
        {activeTab === 'site_public' && (
          <PublicPortal
            onRegisterDriver={handleRegisterDriver}
            onOpenAdminCrm={() => setActiveTab('crm_chauffeurs')}
            drivers={drivers}
          />
        )}

        {activeTab === 'crm_chauffeurs' && (
          <DriverCRM
            drivers={drivers}
            onUpdateDriverStatus={handleUpdateDriverStatus}
            onUpdateDriverCommission={handleUpdateDriverCommission}
            onAddDriver={handleAddDriver}
            onDeleteDriver={handleDeleteDriver}
            onAddActivity={handleAddActivity}
            onUpdateDriver={handleUpdateDriver}
            onUpdateDriverIban={handleUpdateDriverIban}
            onUpdateDriverContract={handleUpdateDriverContract}
          />
        )}

        {activeTab === 'comptabilite_paie' && (
          <AccountingPayroll
            drivers={drivers}
            payrollWeeks={payrollWeeks}
            settings={fleetSettings}
            onUpdatePayrollStatus={handleUpdatePayrollStatus}
            onUpdateFleetSettings={handleUpdateFleetSettings}
            onImportWeeklyStatement={handleImportWeeklyStatement}
            onClearAllPayroll={handleClearAllPayroll}
            onClearWeek={handleClearWeek}
            onUpdateDriverIban={handleUpdateDriverIban}
            onUpdatePayrollRecord={handleUpdatePayrollRecord}
            onUpdateDriverContract={handleUpdateDriverContract}
          />
        )}

        {activeTab === 'guide_api' && <ApiIntegrationGuide />}

        {activeTab === 'parametres_api' && <ApiSettings />}
      </main>
      </Suspense>
    </div>
  );
}

export default App;
