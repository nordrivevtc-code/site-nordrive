import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Download, 
  Upload, 
  CheckCircle2, 
  CreditCard, 
  TrendingUp, 
  FileText, 
  Printer, 
  Search, 
  ShieldCheck, 
  X, 
  FileSpreadsheet, 
  Trash2, 
  Coins, 
  ChevronLeft, 
  ChevronRight, 
  History, 
  Eye, 
  BarChart3, 
  AlertTriangle, 
  Check, 
  Edit3, 
  Copy 
} from 'lucide-react';
import type { Driver, DriverPayrollWeek, FleetSettings } from '../types/fleet';
import { 
  parseStatementFile, 
  convertToPayrollRecords, 
  generateQontoBulkTransferCsv,
  getDriverFee, 
  getWeekDateRange,
  extractWeekFromTextOrFilename,
  cleanIban,
  formatIbanDisplay,
  round2, 
  DRIVER_FEE_GRID 
} from '../lib/statementParsers';

export { getDriverFee, DRIVER_FEE_GRID };

interface AccountingPayrollProps {
  drivers: Driver[];
  payrollWeeks: DriverPayrollWeek[];
  settings: FleetSettings;
  onUpdatePayrollStatus: (payrollId: string, status: DriverPayrollWeek['paymentStatus']) => void;
  onUpdateFleetSettings: (newSettings: Partial<FleetSettings>) => void;
  onImportWeeklyStatement: (importedRecords: DriverPayrollWeek[]) => void;
  onClearAllPayroll?: () => void;
  onClearWeek?: (weekNumber: number) => void;
  onUpdateDriverIban?: (driverId: string, iban: string, bic?: string) => void;
  onUpdatePayrollRecord?: (payrollId: string, updates: Partial<DriverPayrollWeek>) => void;
  onUpdateDriverContract?: (driverId: string, contractUpdates: Partial<Driver>, driverName?: string) => void;
}

export const AccountingPayroll: React.FC<AccountingPayrollProps> = ({
  drivers,
  payrollWeeks,
  settings,
  onUpdatePayrollStatus,
  onUpdateFleetSettings: _onUpdateFleetSettings,
  onImportWeeklyStatement,
  onClearAllPayroll,
  onClearWeek,
  onUpdateDriverIban,
  onUpdatePayrollRecord,
  onUpdateDriverContract
}) => {
  const [activePlatformTab, setActivePlatformTab] = useState<'synthese' | 'uber' | 'bolt' | 'heetch'>('synthese');

  // Liste des semaines disponibles
  const recordedWeekNumbers = useMemo(() => {
    const set = new Set(payrollWeeks.map(p => p.weekNumber));
    return Array.from(set).sort((a, b) => b - a);
  }, [payrollWeeks]);

  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return recordedWeekNumbers.length > 0 ? recordedWeekNumbers[0] : 39;
  });
  const [importTargetWeek, setImportTargetWeek] = useState<number>(() => {
    return recordedWeekNumbers.length > 0 ? recordedWeekNumbers[0] : 39;
  });

  useEffect(() => {
    if (recordedWeekNumbers.length > 0 && !recordedWeekNumbers.includes(selectedWeek)) {
      setSelectedWeek(recordedWeekNumbers[0]);
      setImportTargetWeek(recordedWeekNumbers[0]);
    }
  }, [recordedWeekNumbers, selectedWeek]);

  const [viewMode, setViewMode] = useState<'current_week' | 'history'>('current_week');
  const [selectedPayrollForReceipt, setSelectedPayrollForReceipt] = useState<DriverPayrollWeek | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isQontoModalOpen, setIsQontoModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'debt' | 'missing_iban'>('all');
  const [csvText, setCsvText] = useState<string>('');
  const [copiedIbanId, setCopiedIbanId] = useState<string | null>(null);

  // Modal d'édition directe de contrat/IBAN/chiffres pour une ligne de paie
  const [editingPayroll, setEditingPayroll] = useState<DriverPayrollWeek | null>(null);
  const [editIbanInput, setEditIbanInput] = useState<string>('');
  const [editBicInput, setEditBicInput] = useState<string>('');
  const [editFeeType, setEditFeeType] = useState<'fixe' | 'pourcentage'>('fixe');
  const [editFeeAmount, setEditFeeAmount] = useState<number>(50);
  const [editRentalAmount, setEditRentalAmount] = useState<number>(0);
  const [editUberEarnings, setEditUberEarnings] = useState<number>(0);
  const [editBoltEarnings, setEditBoltEarnings] = useState<number>(0);
  const [editHeetchEarnings, setEditHeetchEarnings] = useState<number>(0);
  const [editCashInput, setEditCashInput] = useState<number>(0);

  // Édition inline de commission directe avec enregistrement immédiat en BDD
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [tempCommissionVal, setTempCommissionVal] = useState<number>(50);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const handleInlineCommissionSave = (p: DriverPayrollWeek, newFee: number) => {
    setEditingCommissionId(null);
    const validFee = Math.max(0, round2(Number(newFee) || 0));
    if (validFee === p.fleetCommissionAmount) return;

    if (onUpdatePayrollRecord) {
      onUpdatePayrollRecord(p.id, {
        fleetCommissionAmount: validFee,
        feeRateApplied: validFee,
        feeType: 'fixe'
      });
    }

    if (onUpdateDriverContract && (p.driverId || p.driverName)) {
      onUpdateDriverContract(p.driverId, {
        fixedWeeklyFee: validFee,
        feeType: 'fixe'
      }, p.driverName);
    }

    setSavedNotification(`✓ Commission de ${p.driverName} mise à jour (${validFee} €) et enregistrée en BDD`);
    setTimeout(() => setSavedNotification(null), 3500);
  };

  const allWeeksList = useMemo(() => Array.from({ length: 52 }, (_, i) => 52 - i), []);

  // Données de la semaine sélectionnée
  const currentWeekPayrolls = useMemo(() => {
    return payrollWeeks.filter(p => p.weekNumber === selectedWeek);
  }, [payrollWeeks, selectedWeek]);

  // Agrégats financiers de la semaine
  const totalUber = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.earnings.uber || 0), 0));
  const totalBolt = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.earnings.bolt || 0), 0));
  const totalHeetch = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.earnings.heetch || 0), 0));
  const totalNetPlateformes = round2(totalUber + totalBolt + totalHeetch);

  const totalFleetCommission = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.fleetCommissionAmount || 0), 0));
  const totalCashCollected = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.otherDeductions || 0), 0));
  const totalRentalDeduction = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.rentalDeduction || 0), 0));

  // Virement positif réel vs Chauffeurs avec dette (espèces excessives)
  const positivePayrolls = currentWeekPayrolls.filter(p => p.netPayout > 0);
  const debtPayrolls = currentWeekPayrolls.filter(p => p.netPayout < 0);
  const totalNetToWire = round2(positivePayrolls.reduce((sum, p) => sum + p.netPayout, 0));
  const totalDebtAmount = round2(debtPayrolls.reduce((sum, p) => sum + Math.abs(p.netPayout), 0));
  const totalNetComptable = round2(totalNetPlateformes - totalCashCollected - totalFleetCommission - totalRentalDeduction);

  const paidCount = currentWeekPayrolls.filter(p => p.paymentStatus === 'paye').length;
  const pendingCount = currentWeekPayrolls.filter(p => p.paymentStatus !== 'paye').length;

  // Chauffeurs sans IBAN ayant un virement positif à recevoir
  const missingIbanPayrolls = useMemo(() => {
    return currentWeekPayrolls.filter(p => {
      if (p.netPayout <= 0) return false;
      const d = drivers.find(drv => drv.id === p.driverId);
      const iban = cleanIban(p.iban || d?.iban);
      return iban.length < 14;
    });
  }, [currentWeekPayrolls, drivers]);

  // Filtrage du tableau
  const filteredPayrolls = useMemo(() => {
    return currentWeekPayrolls.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || p.driverName.toLowerCase().includes(q) || (p.iban || '').toLowerCase().includes(q);
      
      let matchStatus = true;
      if (statusFilter === 'pending') matchStatus = p.paymentStatus !== 'paye' && p.netPayout > 0;
      else if (statusFilter === 'paid') matchStatus = p.paymentStatus === 'paye';
      else if (statusFilter === 'debt') matchStatus = p.netPayout < 0;
      else if (statusFilter === 'missing_iban') {
        const d = drivers.find(drv => drv.id === p.driverId);
        const iban = cleanIban(p.iban || d?.iban);
        matchStatus = p.netPayout > 0 && iban.length < 14;
      }
      return matchSearch && matchStatus;
    });
  }, [currentWeekPayrolls, searchQuery, statusFilter, drivers]);

  // Totaux espèces par plateforme
  const totalUberCash = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.cashDetails?.uber || 0), 0));
  const totalBoltCash = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.cashDetails?.bolt || 0), 0));
  const totalHeetchCash = round2(currentWeekPayrolls.reduce((sum, p) => sum + (p.cashDetails?.heetch || 0), 0));

  // Listes filtrées par plateforme
  const uberPayrolls = useMemo(() => {
    return filteredPayrolls.filter(p => (p.earnings?.uber || 0) > 0 || (p.cashDetails?.uber || 0) > 0);
  }, [filteredPayrolls]);

  const boltPayrolls = useMemo(() => {
    return filteredPayrolls.filter(p => (p.earnings?.bolt || 0) > 0 || (p.cashDetails?.bolt || 0) > 0);
  }, [filteredPayrolls]);

  const heetchPayrolls = useMemo(() => {
    return filteredPayrolls.filter(p => (p.earnings?.heetch || 0) > 0 || (p.cashDetails?.heetch || 0) > 0);
  }, [filteredPayrolls]);

  // Prévisualisation instantanée lors de l'import CSV
  const auditData = useMemo(() => {
    if (!csvText || !csvText.trim()) return null;
    try {
      const parsedResult = parseStatementFile(csvText);
      if (parsedResult.records.length === 0) return null;

      const records = convertToPayrollRecords(
        parsedResult,
        importTargetWeek,
        drivers,
        settings.defaultWeeklyFee ?? 50
      );

      if (records.length === 0) return null;

      const totalGross = round2(records.reduce((s, r) => s + r.earnings.totalBrut, 0));
      const totalFleet = round2(records.reduce((s, r) => s + r.fleetCommissionAmount, 0));
      const totalCash = round2(records.reduce((s, r) => s + r.otherDeductions, 0));
      const totalNet = round2(records.reduce((s, r) => s + (r.netPayout > 0 ? r.netPayout : 0), 0));

      return {
        format: parsedResult.platformTitle,
        driverCount: records.length,
        totalGross,
        totalFleet,
        totalCash,
        totalNet,
        records
      };
    } catch (e) {
      return null;
    }
  }, [csvText, importTargetWeek, drivers, settings]);

  // Traitement et validation de l'import CSV
  const handleProcessCsvImport = (contentToProcess?: string, forcedWeek?: number) => {
    let recordsToImport: DriverPayrollWeek[] = [];
    const targetWeek = forcedWeek || importTargetWeek;

    if (!contentToProcess && auditData && auditData.records.length > 0) {
      recordsToImport = auditData.records.map(r => ({ ...r, weekNumber: targetWeek }));
    } else {
      const text = contentToProcess || csvText;
      if (!text || !text.trim()) {
        alert('Veuillez sélectionner un fichier ou coller des données CSV.');
        return;
      }
      const parsedResult = parseStatementFile(text);
      if (parsedResult.records.length === 0) {
        alert(parsedResult.errors[0] || 'Veuillez fournir un fichier CSV valide (Uber, Bolt ou Heetch).');
        return;
      }
      recordsToImport = convertToPayrollRecords(
        parsedResult,
        targetWeek,
        drivers,
        settings.defaultWeeklyFee ?? 50
      );
    }

    if (recordsToImport.length === 0) {
      alert('Aucune ligne de chauffeur valide trouvée dans le relevé.');
      return;
    }

    onImportWeeklyStatement(recordsToImport);
    setSelectedWeek(targetWeek);
    setIsCsvModalOpen(false);
    setCsvText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      const file = files[0];
      const text = await file.text();
      if (text) {
        const detected = extractWeekFromTextOrFilename(text, file.name);
        if (detected) setImportTargetWeek(detected);
        setCsvText(text);
      }
    } else {
      // Import multi-fichiers simultanés (ex: Uber + Bolt + Heetch)
      const allNewRecords: DriverPayrollWeek[] = [];
      let detectedWeek = importTargetWeek;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        if (text && text.trim()) {
          const w = extractWeekFromTextOrFilename(text, file.name) || detectedWeek;
          detectedWeek = w;
          const parsed = parseStatementFile(text);
          if (parsed.records.length > 0) {
            const records = convertToPayrollRecords(parsed, w, drivers, settings.defaultWeeklyFee ?? 50);
            allNewRecords.push(...records);
          }
        }
      }

      if (allNewRecords.length > 0) {
        onImportWeeklyStatement(allNewRecords);
        setSelectedWeek(detectedWeek);
        setIsCsvModalOpen(false);
        setCsvText('');
      } else {
        alert('Aucune donnée valide trouvée dans les fichiers sélectionnés.');
      }
    }
  };

  // Export officiel Qonto
  const qontoExportData = useMemo(() => {
    return generateQontoBulkTransferCsv(currentWeekPayrolls, drivers);
  }, [currentWeekPayrolls, drivers]);

  const handleDownloadQontoCsv = () => {
    if (qontoExportData.validRows.length === 0) {
      alert('Aucun virement prêt à être exporté pour cette semaine.');
      return;
    }

    const blob = new Blob([qontoExportData.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Virements_Qonto_Nordrive_Semaine_${selectedWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Marquer tous les virements Qonto valides comme réglés
  const handleMarkAllQontoAsPaid = () => {
    if (confirm(`Confirmez-vous le marquage de ${qontoExportData.validRows.length} virements comme Réglés / Payés ?`)) {
      qontoExportData.validRows.forEach(r => {
        const p = currentWeekPayrolls.find(item => item.driverId === r.driverId);
        if (p) {
          onUpdatePayrollStatus(p.id, 'paye');
        }
      });
      setIsQontoModalOpen(false);
    }
  };

  // Export vers Google Sheets / Excel complet
  const handleExportFullCsv = () => {
    const headers = [
      'Chauffeur',
      'IBAN',
      'CA Uber Net (€)',
      'CA Bolt Net (€)',
      'CA Heetch Net (€)',
      'Total Net Plateformes (€)',
      'Espèces Encaissées (€)',
      'Commission Flotte (€)',
      'Déduction Location (€)',
      'Net Réel à Virer (€)',
      'Statut Règlement'
    ];

    const rows = currentWeekPayrolls.map(p => {
      const d = drivers.find(drv => drv.id === p.driverId);
      const iban = cleanIban(p.iban || d?.iban);
      return [
        `"${p.driverName.replace(/"/g, '""')}"`,
        `"${iban}"`,
        p.earnings.uber.toFixed(2),
        p.earnings.bolt.toFixed(2),
        p.earnings.heetch.toFixed(2),
        p.earnings.totalBrut.toFixed(2),
        p.otherDeductions.toFixed(2),
        p.fleetCommissionAmount.toFixed(2),
        p.rentalDeduction.toFixed(2),
        p.netPayout.toFixed(2),
        `"${p.paymentStatus === 'paye' ? 'Payé' : p.netPayout < 0 ? 'Dette chauffeur' : 'En attente'}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nordrive_Synthese_Paie_Semaine_${selectedWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Ouvrir modal d'édition rapide d'une ligne
  const handleOpenEditPayroll = (p: DriverPayrollWeek) => {
    const d = drivers.find(drv => drv.id === p.driverId);
    setEditingPayroll(p);
    setEditIbanInput(p.iban || d?.iban || '');
    setEditBicInput(p.bic || d?.bic || '');
    setEditFeeType(p.feeType || d?.feeType || 'fixe');
    setEditFeeAmount(p.fleetCommissionAmount || d?.fixedWeeklyFee || 50);
    setEditRentalAmount(p.rentalDeduction || d?.rentalFee || 0);
    setEditUberEarnings(p.earnings.uber || 0);
    setEditBoltEarnings(p.earnings.bolt || 0);
    setEditHeetchEarnings(p.earnings.heetch || 0);
    setEditCashInput(p.otherDeductions || 0);
  };

  const handleSaveEditPayroll = () => {
    if (!editingPayroll) return;
    const cleanedIban = cleanIban(editIbanInput);
    const cleanedBic = editBicInput.trim().toUpperCase();

    // Mettre à jour l'IBAN du chauffeur au niveau global CRM
    if (onUpdateDriverIban) {
      onUpdateDriverIban(editingPayroll.driverId, cleanedIban, cleanedBic);
    }
    if (onUpdateDriverContract) {
      onUpdateDriverContract(editingPayroll.driverId, {
        iban: cleanedIban,
        bic: cleanedBic,
        feeType: editFeeType,
        fixedWeeklyFee: editFeeType === 'fixe' ? editFeeAmount : 50,
        commissionRate: editFeeType === 'pourcentage' ? editFeeAmount : 10,
        rentalFee: editRentalAmount
      }, editingPayroll.driverName);
    }

    const newUber = round2(Number(editUberEarnings) || 0);
    const newBolt = round2(Number(editBoltEarnings) || 0);
    const newHeetch = round2(Number(editHeetchEarnings) || 0);
    const newTotalBrut = round2(newUber + newBolt + newHeetch);
    const newCash = round2(Number(editCashInput) || 0);

    // Mettre à jour la ligne de paie de la semaine avec recalcul automatique
    if (onUpdatePayrollRecord) {
      onUpdatePayrollRecord(editingPayroll.id, {
        iban: cleanedIban,
        bic: cleanedBic,
        feeType: editFeeType,
        feeRateApplied: editFeeAmount,
        fleetCommissionAmount: editFeeAmount,
        rentalDeduction: editRentalAmount,
        otherDeductions: newCash,
        earnings: {
          ...editingPayroll.earnings,
          uber: newUber,
          bolt: newBolt,
          heetch: newHeetch,
          totalBrut: newTotalBrut
        }
      });
    }

    setSavedNotification(`✓ Données et paie de ${editingPayroll.driverName} enregistrées en BDD`);
    setTimeout(() => setSavedNotification(null), 3500);

    setEditingPayroll(null);
  };

  // Copie rapide IBAN
  const handleCopyIban = (iban: string, id: string) => {
    navigator.clipboard.writeText(cleanIban(iban));
    setCopiedIbanId(id);
    setTimeout(() => setCopiedIbanId(null), 2000);
  };

  // Historique global multi-semaines
  const historySummary = useMemo(() => {
    return recordedWeekNumbers.map(w => {
      const records = payrollWeeks.filter(p => p.weekNumber === w);
      const uber = round2(records.reduce((s, r) => s + (r.earnings.uber || 0), 0));
      const bolt = round2(records.reduce((s, r) => s + (r.earnings.bolt || 0), 0));
      const heetch = round2(records.reduce((s, r) => s + (r.earnings.heetch || 0), 0));
      const totalGross = round2(uber + bolt + heetch);
      const fleetCommission = round2(records.reduce((s, r) => s + (r.fleetCommissionAmount || 0), 0));
      const totalCash = round2(records.reduce((s, r) => s + (r.otherDeductions || 0), 0));
      const netPayout = round2(records.filter(r => r.netPayout > 0).reduce((s, r) => s + r.netPayout, 0));
      const paidCount = records.filter(r => r.paymentStatus === 'paye').length;
      return {
        weekNumber: w,
        dateRange: getWeekDateRange(w, 2026),
        driverCount: records.length,
        uber,
        bolt,
        heetch,
        totalGross,
        fleetCommission,
        totalCash,
        netPayout,
        paidCount
      };
    });
  }, [payrollWeeks, recordedWeekNumbers]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px', fontFamily: "'Inter', system-ui, sans-serif", color: '#E2E8F0' }}>

      {/* ─── BANNIÈRE D'EN-TÊTE : APPROCHE CRM INTELLIGENTE ──────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '22px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0, letterSpacing: '-0.3px' }}>
                Module Comptabilité & Virements Qonto Nordrive
              </h2>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                Calcul rigoureux du net réel par chauffeur • Déduction des espèces • Export direct pour virement automatique Qonto
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', color: '#34D399', fontWeight: 700 }}>
              <ShieldCheck size={14} /> Calcul Certifié Sans Double Déduction
            </span>
          </div>
        </div>

        {/* Formule Comptable Transparente */}
        <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#CBD5E1' }}>
            <strong style={{ color: '#38BDF8' }}>Formule Comptable :</strong>
            <span>Net Réel à Virer =</span>
            <span style={{ color: '#F1F5F9', fontWeight: 600 }}>CA Net Plateformes (Uber + Bolt + Heetch)</span>
            <span>—</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>Commission Flotte</span>
            <span>—</span>
            <span style={{ color: '#FBBF24', fontWeight: 700 }}>Location Véhicule</span>
            <span>—</span>
            <span style={{ color: '#F97316', fontWeight: 700 }}>Espèces Déjà Encaissées</span>
          </div>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontStyle: 'italic' }}>
            *Si négatif, le chauffeur a perçu trop de liquide et a une dette à régulariser.
          </span>
        </div>
      </div>

      {/* ─── EN-TÊTE DE NAVIGATION SEMAINE vs HISTORIQUE ────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Switcher de vue */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px' }}>
          <button
            onClick={() => setViewMode('current_week')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
              background: viewMode === 'current_week' ? 'linear-gradient(135deg, #0284C7, #0D9488)' : 'transparent',
              color: viewMode === 'current_week' ? '#FFF' : '#94A3B8',
              boxShadow: viewMode === 'current_week' ? '0 4px 12px rgba(2,132,199,0.3)' : 'none'
            }}
          >
            <Calendar size={15} /> Semaine {selectedWeek} ({getWeekDateRange(selectedWeek).label})
          </button>
          
          <button
            onClick={() => setViewMode('history')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
              background: viewMode === 'history' ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'transparent',
              color: viewMode === 'history' ? '#FFF' : '#94A3B8',
              boxShadow: viewMode === 'history' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none'
            }}
          >
            <History size={15} /> Historique ({recordedWeekNumbers.length} semaines)
          </button>
        </div>

        {/* Sélecteur et flèches de semaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
            disabled={selectedWeek <= 1}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: selectedWeek <= 1 ? '#475569' : '#E2E8F0', fontSize: '12px', fontWeight: 700, cursor: selectedWeek <= 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={16} /> S{Math.max(1, selectedWeek - 1)}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', padding: '6px 12px' }}>
            <Calendar size={14} style={{ color: '#38BDF8' }} />
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '12px', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
            >
              {allWeeksList.map(w => {
                const count = payrollWeeks.filter(p => p.weekNumber === w).length;
                return (
                  <option key={w} value={w} style={{ background: '#0F172A', color: count > 0 ? '#38BDF8' : '#FFF' }}>
                    {count > 0 ? `★ Semaine ${w} (${count} chauffeurs)` : `Semaine ${w}`}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={() => setSelectedWeek(w => Math.min(52, w + 1))}
            disabled={selectedWeek >= 52}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: selectedWeek >= 52 ? '#475569' : '#E2E8F0', fontSize: '12px', fontWeight: 700, cursor: selectedWeek >= 52 ? 'not-allowed' : 'pointer' }}
          >
            S{Math.min(52, selectedWeek + 1)} <ChevronRight size={16} />
          </button>
        </div>

      </div>

      {viewMode === 'current_week' && (
        <>
          {/* ─── CARTES KPI SEMAINE SÉLECTIONNÉE ────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            
            {/* Chiffre d'Affaires Net des Plateformes */}
            <div style={{ background: 'rgba(15,23,42,0.85)', borderLeft: '4px solid #38BDF8', borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>CA Net Plateformes</span>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                  <TrendingUp size={15} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFF' }}>
                {totalNetPlateformes.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', color: '#FFF' }}>Uber: {totalUber.toFixed(0)}€</span>
                <span style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', color: '#34D399' }}>Bolt: {totalBolt.toFixed(0)}€</span>
                <span style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', color: '#A78BFA' }}>Heetch: {totalHeetch.toFixed(0)}€</span>
              </div>
            </div>

            {/* Espèces Collectées par les Chauffeurs */}
            <div style={{ background: 'rgba(15,23,42,0.85)', borderLeft: '4px solid #F59E0B', borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Espèces Déjà Encaissées</span>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                  <Coins size={15} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#FBBF24' }}>
                - {totalCashCollected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <p style={{ fontSize: '10.5px', color: '#64748B', margin: '6px 0 0 0' }}>
                Déjà en main propre des chauffeurs
              </p>
            </div>

            {/* Gain Flotte (Commissions prélevées) */}
            <div style={{ background: 'rgba(15,23,42,0.85)', borderLeft: '4px solid #10B981', borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Commissions Nordrive</span>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <DollarSign size={15} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#34D399' }}>
                + {totalFleetCommission.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <p style={{ fontSize: '10.5px', color: '#64748B', margin: '6px 0 0 0' }}>
                Forfaits flotte {totalRentalDeduction > 0 ? `(+ ${totalRentalDeduction.toFixed(2)} € loc.)` : 'retenus'}
              </p>
            </div>

            {/* Net Total Comptable & Virements Qonto */}
            <div style={{ background: 'rgba(15,23,42,0.85)', borderLeft: '4px solid #6366F1', borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Net Total Comptable</span>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
                  <CreditCard size={15} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#818CF8' }}>
                {totalNetComptable.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34D399', fontWeight: 700 }}>
                  <span>Virements Qonto ({positivePayrolls.length} ch.) :</span>
                  <span>{totalNetToWire.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                </div>
                {totalDebtAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F87171', fontWeight: 700 }}>
                    <span>Dettes espèces ({debtPayrolls.length} ch.) :</span>
                    <span>- {totalDebtAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
                  <span style={{ color: '#34D399' }}>✓ {paidCount} Réglés</span>
                  <span>• {pendingCount} En attente</span>
                </div>
              </div>
            </div>

          </div>

          {/* ─── BARRE D'ACTIONS ET FILTRES ────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
            
            {/* Recherche et filtres */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px', minWidth: '220px' }}>
                <Search size={14} style={{ color: '#64748B' }} />
                <input
                  type="text"
                  placeholder="Rechercher chauffeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '12px', outline: 'none', width: '100%' }}
                />
              </div>

              {/* Filtres de statut */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '3px' }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: statusFilter === 'all' ? '#0284C7' : 'transparent', color: statusFilter === 'all' ? '#FFF' : '#94A3B8' }}
                >
                  Tous ({currentWeekPayrolls.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: statusFilter === 'pending' ? '#6366F1' : 'transparent', color: statusFilter === 'pending' ? '#FFF' : '#94A3B8' }}
                >
                  À virer ({positivePayrolls.length})
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: statusFilter === 'paid' ? '#10B981' : 'transparent', color: statusFilter === 'paid' ? '#FFF' : '#94A3B8' }}
                >
                  Réglés ({paidCount})
                </button>
                {debtPayrolls.length > 0 && (
                  <button
                    onClick={() => setStatusFilter('debt')}
                    style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: statusFilter === 'debt' ? '#EF4444' : 'transparent', color: statusFilter === 'debt' ? '#FFF' : '#F87171' }}
                  >
                    Dettes ({debtPayrolls.length})
                  </button>
                )}
                {missingIbanPayrolls.length > 0 && (
                  <button
                    onClick={() => setStatusFilter('missing_iban')}
                    style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: statusFilter === 'missing_iban' ? '#F59E0B' : 'transparent', color: statusFilter === 'missing_iban' ? '#000' : '#FBBF24' }}
                  >
                    ⚠️ Sans IBAN ({missingIbanPayrolls.length})
                  </button>
                )}
              </div>
            </div>

            {/* Boutons d'Action Principaux */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* BOUTON QONTO 1-CLIC */}
              <button
                onClick={() => setIsQontoModalOpen(true)}
                disabled={positivePayrolls.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  border: 'none', borderRadius: '10px', color: '#FFF', fontSize: '12px', fontWeight: 800,
                  cursor: positivePayrolls.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  opacity: positivePayrolls.length === 0 ? 0.5 : 1
                }}
              >
                <Download size={15} /> ⚡ Exporter pour Virement Qonto ({positivePayrolls.length})
              </button>

              <button
                onClick={() => {
                  setImportTargetWeek(selectedWeek);
                  setIsCsvModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 15px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '10px', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.25)' }}
              >
                <Upload size={14} /> Importer CSV
              </button>

              <button
                onClick={handleExportFullCsv}
                disabled={currentWeekPayrolls.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Download size={14} /> Exporter Synthèse CSV
              </button>

              {currentWeekPayrolls.length > 0 && onClearWeek && (
                <button
                  onClick={() => {
                    if (confirm(`Êtes-vous sûr de vouloir vider et réinitialiser les relevés de la Semaine ${selectedWeek} ?`)) {
                      onClearWeek(selectedWeek);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#F87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  title="Vider les relevés de cette semaine"
                >
                  <Trash2 size={13} /> Vider S{selectedWeek}
                </button>
              )}

              {currentWeekPayrolls.length > 0 && onClearAllPayroll && (
                <button
                  onClick={() => {
                    if (confirm(`Êtes-vous sûr de vouloir vider TOUTES les semaines enregistrées ?`)) {
                      onClearAllPayroll();
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', color: '#EF4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  title="Tout vider (toutes semaines)"
                >
                  Tout purger
                </button>
              )}

            </div>

          </div>

          {/* ─── 4 PAGES / ONGLETS PAR PLATEFORME + SYNTHÈSE GLOBALE ─────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', background: 'rgba(15,23,42,0.85)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActivePlatformTab('uber')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                background: activePlatformTab === 'uber' ? '#1E293B' : 'transparent',
                color: activePlatformTab === 'uber' ? '#FFF' : '#94A3B8',
                border: activePlatformTab === 'uber' ? '1px solid rgba(255,255,255,0.25)' : 'none',
                boxShadow: activePlatformTab === 'uber' ? '0 4px 14px rgba(0,0,0,0.5)' : 'none'
              }}
            >
              🖤 1. DÉTAIL UBER ({uberPayrolls.length})
            </button>

            <button
              onClick={() => setActivePlatformTab('bolt')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                background: activePlatformTab === 'bolt' ? 'rgba(52,211,153,0.15)' : 'transparent',
                color: activePlatformTab === 'bolt' ? '#34D399' : '#94A3B8',
                border: activePlatformTab === 'bolt' ? '1px solid rgba(52,211,153,0.4)' : 'none',
                boxShadow: activePlatformTab === 'bolt' ? '0 4px 14px rgba(52,211,153,0.2)' : 'none'
              }}
            >
              🟢 2. DÉTAIL BOLT ({boltPayrolls.length})
            </button>

            <button
              onClick={() => setActivePlatformTab('heetch')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                background: activePlatformTab === 'heetch' ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: activePlatformTab === 'heetch' ? '#A78BFA' : '#94A3B8',
                border: activePlatformTab === 'heetch' ? '1px solid rgba(167,139,250,0.4)' : 'none',
                boxShadow: activePlatformTab === 'heetch' ? '0 4px 14px rgba(167,139,250,0.2)' : 'none'
              }}
            >
              🟣 3. DÉTAIL HEETCH ({heetchPayrolls.length})
            </button>

            <button
              onClick={() => setActivePlatformTab('synthese')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                background: activePlatformTab === 'synthese' ? 'linear-gradient(135deg, #0284C7, #0D9488)' : 'transparent',
                color: activePlatformTab === 'synthese' ? '#FFF' : '#94A3B8',
                boxShadow: activePlatformTab === 'synthese' ? '0 4px 14px rgba(2,132,199,0.35)' : 'none'
              }}
            >
              ⭐ 4. SYNTHÈSE GLOBALE & NET À VIRER ({currentWeekPayrolls.length})
            </button>
          </div>

          {/* Si aucun relevé chargé pour cette semaine */}
          {currentWeekPayrolls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15,23,42,0.6)', border: '2px dashed rgba(56,189,248,0.2)', borderRadius: '18px', margin: '10px 0 25px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#38BDF8' }}>
                <Upload size={30} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 900, color: '#FFF', marginBottom: '8px' }}>
                Semaine {selectedWeek} vierge (aucun relevé importé)
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '13.5px', maxWidth: '540px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Aucun relevé n'est actuellement chargé pour la <strong>Semaine {selectedWeek}</strong>. Glissez vos fichiers CSV (Uber, Bolt et Heetch) de la semaine dernière pour que le CRM détaille chaque plateforme et calcule automatiquement le montant net exact que vous devez à chaque chauffeur.
              </p>
              <button
                onClick={() => {
                  setImportTargetWeek(selectedWeek);
                  setIsCsvModalOpen(true);
                }}
                style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '12px', color: '#FFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(2,132,199,0.35)' }}
              >
                + Importer les Relevés CSV de la Semaine {selectedWeek}
              </button>
            </div>
          ) : (
            <>
              {/* ─── ONGLET 1 : DÉTAIL UBER ─────────────────────────────────── */}
              {activePlatformTab === 'uber' && (
                <div style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '15px', color: '#FFF' }}>
                        <span>🖤 Page 1 : Relevé Détaillé UBER FLEET</span>
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px', color: '#CBD5E1' }}>Semaine {selectedWeek}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                        Chiffres officiels générés sur Uber : Chiffre d'affaires net, espèces déjà encaissées en main et solde Uber.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#FFF', fontWeight: 700 }}>Total Net Uber : {totalUber.toFixed(2)} €</span>
                      <span style={{ background: 'rgba(245,158,11,0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#FBBF24', fontWeight: 700 }}>Espèces Déjà Prises : -{totalUberCash.toFixed(2)} €</span>
                      <span style={{ background: 'rgba(56,189,248,0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#38BDF8', fontWeight: 800 }}>Net Reversé par Uber : {(totalUber - totalUberCash).toFixed(2)} €</span>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Chauffeur</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#FFF' }}>CA Net Uber (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#F59E0B' }}>Espèces Encaissées en Main (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#38BDF8' }}>Net Reversé par Uber (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Courses</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uberPayrolls.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                            Aucun chauffeur actif sur Uber pour cette semaine.
                          </td>
                        </tr>
                      ) : (
                        uberPayrolls.map((p, idx) => {
                          const cashUber = p.cashDetails?.uber || 0;
                          const netUberRestant = round2(p.earnings.uber - cashUber);
                          return (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFF' }}>{p.driverName}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#FFF' }}>{p.earnings.uber.toFixed(2)} €</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {cashUber > 0 ? (
                                  <span style={{ color: '#F97316', fontWeight: 800, background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                    - {cashUber.toFixed(2)} €
                                  </span>
                                ) : <span style={{ color: '#475569' }}>0,00 €</span>}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#38BDF8' }}>
                                {netUberRestant.toFixed(2)} €
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94A3B8' }}>{p.ridesCount || '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button onClick={() => setSelectedPayrollForReceipt(p)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#38BDF8', cursor: 'pointer' }}>
                                  <FileText size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ─── ONGLET 2 : DÉTAIL BOLT ─────────────────────────────────── */}
              {activePlatformTab === 'bolt' && (
                <div style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '15px', color: '#34D399' }}>
                        <span>🟢 Page 2 : Relevé Détaillé BOLT PARTNER</span>
                        <span style={{ fontSize: '11px', background: 'rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: '6px', color: '#34D399' }}>Semaine {selectedWeek}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                        Chiffres officiels générés sur Bolt : Revenus nets, espèces perçues et net restant Bolt.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#FFF', fontWeight: 700 }}>Total Net Bolt : {totalBolt.toFixed(2)} €</span>
                      <span style={{ background: 'rgba(245,158,11,0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#FBBF24', fontWeight: 700 }}>Espèces Déjà Perçues : -{totalBoltCash.toFixed(2)} €</span>
                      <span style={{ background: 'rgba(52,211,153,0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#34D399', fontWeight: 800 }}>Net Reversé par Bolt : {(totalBolt - totalBoltCash).toFixed(2)} €</span>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Chauffeur</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#FFF' }}>CA Net Bolt (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#F59E0B' }}>Espèces Perçues en Main (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#34D399' }}>Net Reversé par Bolt (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Courses</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boltPayrolls.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                            Aucun chauffeur actif sur Bolt pour cette semaine.
                          </td>
                        </tr>
                      ) : (
                        boltPayrolls.map((p, idx) => {
                          const cashBolt = p.cashDetails?.bolt || 0;
                          const netBoltRestant = round2(p.earnings.bolt - cashBolt);
                          return (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFF' }}>{p.driverName}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#FFF' }}>{p.earnings.bolt.toFixed(2)} €</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {cashBolt > 0 ? (
                                  <span style={{ color: '#F97316', fontWeight: 800, background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                    - {cashBolt.toFixed(2)} €
                                  </span>
                                ) : <span style={{ color: '#475569' }}>0,00 €</span>}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#34D399' }}>
                                {netBoltRestant.toFixed(2)} €
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94A3B8' }}>{p.ridesCount || '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button onClick={() => setSelectedPayrollForReceipt(p)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#38BDF8', cursor: 'pointer' }}>
                                  <FileText size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ─── ONGLET 3 : DÉTAIL HEETCH ────────────────────────────────── */}
              {activePlatformTab === 'heetch' && (
                <div style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '15px', color: '#A78BFA' }}>
                        <span>🟣 Page 3 : Relevé Détaillé HEETCH FLOTTE</span>
                        <span style={{ fontSize: '11px', background: 'rgba(167,139,250,0.15)', padding: '2px 8px', borderRadius: '6px', color: '#A78BFA' }}>Semaine {selectedWeek}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                        Chiffres officiels générés sur Heetch : Revenus nets, espèces collectées et solde Heetch.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#FFF', fontWeight: 700 }}>Total Net Heetch : {totalHeetch.toFixed(2)} €</span>
                      <span style={{ background: 'rgba(245,158,11,0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#FBBF24', fontWeight: 700 }}>Espèces Déjà Prises : -{totalHeetchCash.toFixed(2)} €</span>
                      <span style={{ background: 'rgba(167,139,250,0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#A78BFA', fontWeight: 800 }}>Net Reversé par Heetch : {(totalHeetch - totalHeetchCash).toFixed(2)} €</span>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Chauffeur</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#FFF' }}>CA Net Heetch (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#F59E0B' }}>Espèces Collectées en Main (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#A78BFA' }}>Net Reversé par Heetch (€)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Courses</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heetchPayrolls.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                            Aucun chauffeur actif sur Heetch pour cette semaine.
                          </td>
                        </tr>
                      ) : (
                        heetchPayrolls.map((p, idx) => {
                          const cashHeetch = p.cashDetails?.heetch || 0;
                          const netHeetchRestant = round2(p.earnings.heetch - cashHeetch);
                          return (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFF' }}>{p.driverName}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#FFF' }}>{p.earnings.heetch.toFixed(2)} €</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {cashHeetch > 0 ? (
                                  <span style={{ color: '#F97316', fontWeight: 800, background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                    - {cashHeetch.toFixed(2)} €
                                  </span>
                                ) : <span style={{ color: '#475569' }}>0,00 €</span>}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#A78BFA' }}>
                                {netHeetchRestant.toFixed(2)} €
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94A3B8' }}>{p.ridesCount || '—'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button onClick={() => setSelectedPayrollForReceipt(p)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#38BDF8', cursor: 'pointer' }}>
                                  <FileText size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ─── ONGLET 4 : SYNTHÈSE GLOBALE & NET À VIRER ─────────────── */}
              {activePlatformTab === 'synthese' && (
                <div style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  
                  {/* Bandeau d'explication de la formule */}
                  <div style={{ background: 'rgba(2,132,199,0.08)', borderBottom: '1px solid rgba(56,189,248,0.2)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#38BDF8' }}>⭐ Page 4 : Synthèse Globale & Net Réel que vous devez virer à chaque chauffeur</span>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                        <strong>Formule mathématique :</strong> (Net Uber + Net Bolt + Net Heetch) − <strong>Total Espèces Déjà en Main</strong> − <strong>Votre Commission</strong> − <strong>Location</strong> = <span style={{ color: '#34D399', fontWeight: 900 }}>NET RÉEL QUE JE LUI DOIS</span>
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(56,189,248,0.15)', color: '#38BDF8', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>
                      Prêt pour virement Qonto
                    </span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Chauffeur & Contrat</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center' }}>Uber Net</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center' }}>Bolt Net</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#A78BFA' }}>Heetch Net</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#FFF' }}>Total Net Plateformes</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#F59E0B' }}>Espèces Déjà Prises</th>
                        <th style={{ padding: '12px 12px', textAlign: 'center', color: '#38BDF8', background: 'rgba(56,189,248,0.08)' }}>
                          <div style={{ fontWeight: 800 }}>Net Sans Com. (€)</div>
                          <div style={{ fontSize: '9.5px', color: '#94A3B8', textTransform: 'none', fontWeight: 600 }}>Gains − Espèces</div>
                        </th>
                        <th style={{ padding: '12px 12px', textAlign: 'center', color: '#0EA5E9', background: 'rgba(14,165,233,0.12)' }}>
                          <div style={{ fontWeight: 800 }}>Votre Commission ✎</div>
                          <div style={{ fontSize: '9.5px', color: '#7DD3FC', textTransform: 'none', fontWeight: 600 }}>En direct BDD</div>
                        </th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#FBBF24' }}>Location</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', color: '#34D399', background: 'rgba(16,185,129,0.1)' }}>
                          <div style={{ fontWeight: 900 }}>NET FINAL À VIRER (€)</div>
                          <div style={{ fontSize: '9.5px', color: '#A7F3D0', textTransform: 'none', fontWeight: 600 }}>Après commission</div>
                        </th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>IBAN (Virement Qonto)</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayrolls.map((p, idx) => {
                        const isPaid = p.paymentStatus === 'paye';
                        const cash = p.otherDeductions || 0;
                        const netBeforeCommission = round2(p.earnings.totalBrut - cash);
                        const isPositive = p.netPayout > 0;
                        const isDebt = p.netPayout < 0;
                        const d = drivers.find(drv => drv.id === p.driverId);
                        const iban = cleanIban(p.iban || d?.iban);
                        const hasValidIban = iban.length >= 14;

                        return (
                          <tr 
                            key={p.id || idx}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                          >
                            {/* Chauffeur & Contrat */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#FFF', fontSize: '13.5px' }}>{p.driverName}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '10px', color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      {p.feeType === 'pourcentage' ? `${p.feeRateApplied || 10}% CA` : `${p.fleetCommissionAmount}€ / sem`}
                                    </span>
                                    {p.rentalDeduction > 0 && (
                                      <span style={{ fontSize: '10px', color: '#FBBF24', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                        🚗 {p.rentalDeduction}€ loc.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Gains Uber Net */}
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: p.earnings.uber > 0 ? '#E2E8F0' : '#475569' }}>
                              {p.earnings.uber > 0 ? `${p.earnings.uber.toFixed(2)} €` : '—'}
                            </td>

                            {/* Gains Bolt Net */}
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: p.earnings.bolt > 0 ? '#34D399' : '#475569' }}>
                              {p.earnings.bolt > 0 ? `${p.earnings.bolt.toFixed(2)} €` : '—'}
                            </td>

                            {/* Gains Heetch Net */}
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: p.earnings.heetch > 0 ? '#A78BFA' : '#475569' }}>
                              {p.earnings.heetch > 0 ? `${p.earnings.heetch.toFixed(2)} €` : '—'}
                            </td>

                            {/* Total Net Plateformes */}
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, color: '#FFF' }}>
                              {p.earnings.totalBrut.toFixed(2)} €
                            </td>

                            {/* Espèces Encaissées */}
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              {cash > 0 ? (
                                <span 
                                  title={`Espèces en main propre : ${cash.toFixed(2)} € (déjà conservées par le chauffeur)`}
                                  style={{ color: '#F97316', fontWeight: 800, background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}
                                >
                                  - {cash.toFixed(2)} €
                                </span>
                              ) : (
                                <span style={{ color: '#475569' }}>0,00 €</span>
                              )}
                            </td>

                            {/* Net Sans Commission (Calcul exact après espèces, avant commission) */}
                            <td style={{ padding: '12px 12px', textAlign: 'center', background: 'rgba(56,189,248,0.03)' }}>
                              <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: '13.5px' }}>
                                {netBeforeCommission.toFixed(2)} €
                              </span>
                              <span style={{ display: 'block', fontSize: '9.5px', color: '#94A3B8', fontWeight: 600 }}>
                                (net avant com.)
                              </span>
                            </td>

                            {/* Commission Flotte (Modifiable directement en ligne + Enregistré en BDD) */}
                            <td style={{ padding: '12px 12px', textAlign: 'center', background: 'rgba(14,165,233,0.04)' }}>
                              <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '3px', 
                                background: editingCommissionId === p.id ? 'rgba(14,165,233,0.15)' : 'rgba(15,23,42,0.9)', 
                                border: editingCommissionId === p.id ? '1px solid #38BDF8' : '1px solid rgba(56,189,248,0.35)', 
                                borderRadius: '8px', 
                                padding: '3px 6px',
                                transition: 'all 0.2s ease',
                                boxShadow: editingCommissionId === p.id ? '0 0 10px rgba(56,189,248,0.3)' : 'none'
                              }}>
                                <span style={{ color: '#38BDF8', fontSize: '11px', fontWeight: 800 }}>-</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={editingCommissionId === p.id ? tempCommissionVal : p.fleetCommissionAmount}
                                  onFocus={() => {
                                    setEditingCommissionId(p.id);
                                    setTempCommissionVal(p.fleetCommissionAmount);
                                  }}
                                  onChange={(e) => setTempCommissionVal(Number(e.target.value))}
                                  onBlur={() => handleInlineCommissionSave(p, tempCommissionVal)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineCommissionSave(p, tempCommissionVal);
                                  }}
                                  style={{
                                    width: '48px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#38BDF8',
                                    fontWeight: 900,
                                    fontSize: '12.5px',
                                    textAlign: 'center',
                                    outline: 'none'
                                  }}
                                  title="Cliquez pour changer la commission (Entrée pour valider et enregistrer immédiatement en BDD)"
                                />
                                <span style={{ color: '#38BDF8', fontSize: '11px', fontWeight: 700 }}>€</span>
                                {editingCommissionId === p.id ? (
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleInlineCommissionSave(p, tempCommissionVal);
                                    }}
                                    title="Valider et sauvegarder en BDD"
                                    style={{
                                      background: '#10B981',
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: '#FFF',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      marginLeft: '2px'
                                    }}
                                  >
                                    <Check size={12} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenEditPayroll(p)}
                                    title="Modifier IBAN ou contrat complet"
                                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Location */}
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              {p.rentalDeduction > 0 ? (
                                <span style={{ color: '#FBBF24', fontWeight: 700 }}>- {p.rentalDeduction.toFixed(2)} €</span>
                              ) : (
                                <span style={{ color: '#475569' }}>—</span>
                              )}
                            </td>

                            {/* Net Réel à Virer */}
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              {isPositive ? (
                                <div>
                                  <div style={{ fontWeight: 900, color: '#34D399', fontSize: '15px' }}>
                                    + {p.netPayout.toFixed(2)} €
                                  </div>
                                  <span style={{ fontSize: '10px', color: '#34D399', background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    {isPaid ? '✓ Réglé' : 'Prêt Qonto'}
                                  </span>
                                </div>
                              ) : isDebt ? (
                                <div>
                                  <div style={{ fontWeight: 900, color: '#F87171', fontSize: '14px' }}>
                                    {p.netPayout.toFixed(2)} €
                                  </div>
                                  <span 
                                    title="Le chauffeur a perçu plus d'espèces que ce qu'il a gagné sur la semaine"
                                    style={{ fontSize: '10px', color: '#F87171', background: 'rgba(239,68,68,0.12)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}
                                  >
                                    Dette chauffeur
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8', fontWeight: 600 }}>0,00 € (Soldé)</span>
                              )}
                            </td>

                            {/* IBAN Chauffeur */}
                            <td style={{ padding: '12px 14px' }}>
                              {hasValidIban ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontFamily: 'monospace', color: '#CBD5E1', fontSize: '11px', letterSpacing: '0.5px' }}>
                                    {formatIbanDisplay(iban).slice(0, 14)}...
                                  </span>
                                  <button
                                    onClick={() => handleCopyIban(iban, p.id)}
                                    title="Copier l'IBAN"
                                    style={{ background: 'none', border: 'none', color: copiedIbanId === p.id ? '#34D399' : '#64748B', cursor: 'pointer', padding: '2px' }}
                                  >
                                    {copiedIbanId === p.id ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditPayroll(p)}
                                    title="Modifier l'IBAN"
                                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenEditPayroll(p)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: '#FBBF24', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  <AlertTriangle size={11} /> + Ajouter IBAN
                                </button>
                              )}
                            </td>

                            {/* Statut & Actions */}
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  onClick={() => onUpdatePayrollStatus(p.id, isPaid ? 'en_attente' : 'paye')}
                                  title={isPaid ? 'Marquer comme en attente' : 'Marquer comme payé'}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                                    color: isPaid ? '#34D399' : '#94A3B8'
                                  }}
                                >
                                  {isPaid ? 'Payé ✓' : 'À payer'}
                                </button>

                                <button
                                  onClick={() => setSelectedPayrollForReceipt(p)}
                                  title="Afficher la fiche de paie / Reçu"
                                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#38BDF8', cursor: 'pointer' }}
                                >
                                  <FileText size={13} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── VUE 2 : HISTORIQUE MULTI-SEMAINES ───────────────────────────── */}
      {viewMode === 'history' && (
        <div style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px', color: '#FFF' }}>
              <BarChart3 size={18} style={{ color: '#8B5CF6' }} /> Historique & Suivi des Semaines
            </div>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>{historySummary.length} semaine(s) archivée(s)</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Semaine</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Chauffeurs</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Uber</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Bolt</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', color: '#A78BFA' }}>Heetch</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', color: '#FFF' }}>Total Net Plateformes</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', color: '#38BDF8' }}>Commissions Flotte</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', color: '#34D399' }}>Net à Virer Chauffeurs</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Règlements</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Accéder</th>
              </tr>
            </thead>
            <tbody>
              {historySummary.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                    Aucune semaine enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                historySummary.map((h, idx) => (
                  <tr key={h.weekNumber} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: '#FFF', fontSize: '14px' }}>Semaine {h.weekNumber}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{h.dateRange.label}</div>
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: '#38BDF8' }}>
                      {h.driverCount} actifs
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', color: '#94A3B8' }}>
                      {h.uber > 0 ? `${h.uber.toFixed(2)} €` : '—'}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', color: '#94A3B8' }}>
                      {h.bolt > 0 ? `${h.bolt.toFixed(2)} €` : '—'}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', color: '#A78BFA' }}>
                      {h.heetch > 0 ? `${h.heetch.toFixed(2)} €` : '—'}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 800, color: '#FFF' }}>
                      {h.totalGross.toFixed(2)} €
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: '#38BDF8' }}>
                      + {h.fleetCommission.toFixed(2)} €
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 900, color: '#34D399', fontSize: '14px' }}>
                      {h.netPayout.toFixed(2)} €
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: h.paidCount === h.driverCount ? '#34D399' : '#F59E0B', fontWeight: 700 }}>
                        {h.paidCount}/{h.driverCount} réglés
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedWeek(h.weekNumber);
                          setViewMode('current_week');
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Eye size={13} /> Ouvrir S{h.weekNumber}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── MODALE OFFICIELLE QONTO ────────────────────────────────────────── */}
      {isQontoModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0B132B', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '24px', maxWidth: '700px', width: '100%', padding: '28px', boxShadow: '0 30px 60px rgba(0,0,0,0.7)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0 }}>
                    Export Virement Groupé Qonto
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                    Semaine {selectedWeek} ({getWeekDateRange(selectedWeek).label})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsQontoModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Cartes récapitulatives Qonto */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#818CF8', textTransform: 'uppercase' }}>Virements Prêts</span>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', marginTop: '4px' }}>
                  {qontoExportData.validRows.length} chauffeur(s)
                </div>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase' }}>Montant Total à Virer</span>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#34D399', marginTop: '4px' }}>
                  {qontoExportData.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </div>
              </div>

              <div style={{ background: qontoExportData.missingIbanRows.length > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${qontoExportData.missingIbanRows.length > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: qontoExportData.missingIbanRows.length > 0 ? '#FBBF24' : '#94A3B8', textTransform: 'uppercase' }}>IBAN Manquants</span>
                <div style={{ fontSize: '20px', fontWeight: 900, color: qontoExportData.missingIbanRows.length > 0 ? '#FBBF24' : '#94A3B8', marginTop: '4px' }}>
                  {qontoExportData.missingIbanRows.length} chauffeur(s)
                </div>
              </div>
            </div>

            {/* Alerte Chauffeurs sans IBAN avec saisie directe sur place ! */}
            {qontoExportData.missingIbanRows.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FBBF24', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                  <AlertTriangle size={16} /> Attention : {qontoExportData.missingIbanRows.length} chauffeur(s) à payer n'ont pas d'IBAN
                </div>
                <p style={{ fontSize: '11.5px', color: '#CBD5E1', margin: '0 0 10px 0' }}>
                  Renseignez leur IBAN ci-dessous pour les inclure immédiatement dans le fichier Qonto :
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {qontoExportData.missingIbanRows.map(r => (
                    <div key={r.driverId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#070D1E', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>{r.originalName} ({r.amount.toFixed(2)} €)</span>
                      <button
                        onClick={() => {
                          const p = currentWeekPayrolls.find(item => item.driverId === r.driverId);
                          if (p) handleOpenEditPayroll(p);
                        }}
                        style={{ padding: '4px 10px', background: '#0284C7', border: 'none', borderRadius: '6px', color: '#FFF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Renseigner IBAN
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '12px', color: '#94A3B8' }}>
              <p style={{ margin: '0 0 4px 0', color: '#E2E8F0', fontWeight: 700 }}>
                💡 Comment utiliser ce fichier sur Qonto :
              </p>
              <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                <li>Téléchargez le fichier CSV ci-dessous.</li>
                <li>Connectez-vous sur votre espace <strong>Qonto</strong> &gt; <strong>Virements</strong> &gt; <strong>Virements groupés</strong>.</li>
                <li>Glissez le fichier CSV : tous les virements sont pré-remplis avec montants, IBAN et motifs exacts.</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsQontoModalOpen(false)}
                style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#94A3B8', fontSize: '12px', cursor: 'pointer' }}
              >
                Fermer
              </button>

              <button
                onClick={handleDownloadQontoCsv}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px',
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  border: 'none', borderRadius: '10px', color: '#FFF', fontSize: '13px', fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)'
                }}
              >
                <Download size={16} /> Télécharger le CSV Qonto ({qontoExportData.validRows.length} virements)
              </button>

              {qontoExportData.validRows.length > 0 && (
                <button
                  onClick={handleMarkAllQontoAsPaid}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', color: '#34D399', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  <CheckCircle2 size={15} /> Tout marquer comme Payé
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── MODALE ÉDITION CONTRAT / IBAN CHAUFFEUR ───────────────────────── */}
      {editingPayroll && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0B132B', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                  Paramètres Contrat & IBAN — {editingPayroll.driverName}
                </h3>
                <span style={{ fontSize: '11px', color: '#38BDF8' }}>Semaine {editingPayroll.weekNumber}</span>
              </div>
              <button onClick={() => setEditingPayroll(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  IBAN (Compte bancaire du chauffeur pour virement Qonto)
                </label>
                <input
                  type="text"
                  placeholder="FR76 3000 6000 0112 3456 7890 189"
                  value={editIbanInput}
                  onChange={(e) => setEditIbanInput(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '10px 12px', background: '#070D1E', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#34D399', fontFamily: 'monospace', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  Code BIC / SWIFT (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="BNPAFRPP"
                  value={editBicInput}
                  onChange={(e) => setEditBicInput(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 12px', background: '#070D1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Ajustement direct des chiffres plateformes & espèces */}
              <div style={{ background: '#070D1E', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8' }}>
                    📊 Chiffres d'affaires Plateformes & Espèces (Ajustement Profil)
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748B' }}>Modifiable à tout moment</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '3px' }}>Uber Net (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editUberEarnings}
                      onChange={(e) => setEditUberEarnings(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', background: '#0B132B', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#FFF', fontWeight: 700, fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#34D399', display: 'block', marginBottom: '3px' }}>Bolt Net (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editBoltEarnings}
                      onChange={(e) => setEditBoltEarnings(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', background: '#0B132B', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', color: '#34D399', fontWeight: 700, fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#A78BFA', display: 'block', marginBottom: '3px' }}>Heetch Net (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editHeetchEarnings}
                      onChange={(e) => setEditHeetchEarnings(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', background: '#0B132B', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', color: '#A78BFA', fontWeight: 700, fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#F97316', display: 'block', marginBottom: '3px' }}>Espèces Déjà Prises (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCashInput}
                      onChange={(e) => setEditCashInput(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', background: '#0B132B', border: '1px solid rgba(249,115,22,0.35)', borderRadius: '6px', color: '#F97316', fontWeight: 700, fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                    Type de Tarification Flotte
                  </label>
                  <select
                    value={editFeeType}
                    onChange={(e) => setEditFeeType(e.target.value as 'fixe' | 'pourcentage')}
                    style={{ width: '100%', padding: '9px', background: '#070D1E', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                  >
                    <option value="fixe">Forfait Fixe (€/sem)</option>
                    <option value="pourcentage">Pourcentage (%)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                    {editFeeType === 'fixe' ? 'Montant Forfait Hebdo (€)' : 'Taux Commission Flotte (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editFeeAmount}
                    onChange={(e) => setEditFeeAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', background: '#070D1E', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#38BDF8', fontWeight: 700, fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  Déduction Location Véhicule (€/semaine)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={editRentalAmount}
                  onChange={(e) => setEditRentalAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', background: '#070D1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FBBF24', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPayroll(null)}
                  style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', fontSize: '12px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditPayroll}
                  style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Enregistrer & Recalculer
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL D'IMPORTATION (UBER / BOLT / HEETCH) ───────────── */}
      {isCsvModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0B132B', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '24px', maxWidth: '680px', width: '100%', padding: '28px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                  <Upload size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#FFF', margin: 0 }}>Importation Relevés VTC</h3>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>Uber Fleet, Bolt Partner & Heetch Flotte (1 ou plusieurs fichiers simultanés)</p>
                </div>
              </div>
              <button onClick={() => { setIsCsvModalOpen(false); setCsvText(''); }} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            {/* Sélecteur de Semaine Cible */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>📅 Semaine ciblée :</span>
              <select
                value={importTargetWeek}
                onChange={(e) => setImportTargetWeek(Number(e.target.value))}
                style={{ background: '#0F172A', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 800, padding: '4px 10px', outline: 'none', cursor: 'pointer' }}
              >
                {allWeeksList.map(w => (
                  <option key={w} value={w}>
                    Semaine {w} ({getWeekDateRange(w).label})
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Glisser-Déposer fichier */}
            <div style={{ border: '2px dashed rgba(56,189,248,0.35)', borderRadius: '16px', padding: '22px', textAlign: 'center', background: 'rgba(56,189,248,0.03)', marginBottom: '14px' }}>
              <FileSpreadsheet size={32} style={{ color: '#38BDF8', marginBottom: '6px' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', margin: '0 0 4px 0' }}>
                Glissez votre ou vos fichiers CSV ici
              </h4>
              <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 12px 0' }}>
                Vous pouvez déposer les CSV Uber, Bolt et Heetch en même temps. La fusion est automatique.
              </p>
              
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 20px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', borderRadius: '10px', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.3)' }}>
                <Upload size={14} /> Parcourir un ou plusieurs fichiers CSV
                <input type="file" multiple accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <textarea
              rows={auditData ? 2 : 3}
              placeholder="Ou collez ici le texte brut d'un fichier CSV..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{ width: '100%', background: '#070D1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: '#38BDF8', fontFamily: 'monospace', fontSize: '11px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }}
            />

            {/* Audit panel */}
            {auditData && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontWeight: 800, fontSize: '12px' }}>
                    <ShieldCheck size={16} /> {auditData.format} (Semaine {importTargetWeek})
                  </div>
                  <span style={{ fontSize: '11px', color: '#34D399', fontWeight: 700 }}>{auditData.driverCount} chauffeurs détectés</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: '#070D1E', padding: '8px', borderRadius: '8px', fontSize: '11px' }}>
                  <div><span style={{ color: '#94A3B8', display: 'block', fontSize: '9px' }}>CA NET PLATEFORME</span><strong>{auditData.totalGross.toFixed(2)} €</strong></div>
                  <div><span style={{ color: '#38BDF8', display: 'block', fontSize: '9px' }}>COMMISSION FLOTTE</span><strong style={{ color: '#38BDF8' }}>+ {auditData.totalFleet.toFixed(2)} €</strong></div>
                  <div><span style={{ color: '#F59E0B', display: 'block', fontSize: '9px' }}>ESPÈCES ENCAISSÉES</span><strong style={{ color: '#FBBF24' }}>- {auditData.totalCash.toFixed(2)} €</strong></div>
                  <div><span style={{ color: '#34D399', display: 'block', fontSize: '9px' }}>NET À VIRER QONTO</span><strong style={{ color: '#34D399' }}>{auditData.totalNet.toFixed(2)} €</strong></div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setIsCsvModalOpen(false); setCsvText(''); }} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '12px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={() => handleProcessCsvImport()}
                style={{ padding: '10px 22px', background: auditData ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', borderRadius: '10px', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {auditData ? <><CheckCircle2 size={15} /> Valider & Enregistrer pour Semaine {importTargetWeek}</> : 'Calculer la paie'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL REÇU / FICHE DE PAIE ──────────────── */}
      {selectedPayrollForReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFF', color: '#0F172A', borderRadius: '20px', maxWidth: '650px', width: '100%', padding: '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0284C7', margin: 0 }}>NORDRIVE SERVICES</h2>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>SIREN : {settings.siren}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', background: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800 }}>FICHE DE RÈGLEMENT</span>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>Semaine {selectedPayrollForReceipt.weekNumber} (2026)</div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{selectedPayrollForReceipt.driverName}</h3>
              {selectedPayrollForReceipt.iban && (
                <p style={{ fontSize: '12px', color: '#059669', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                  IBAN : {formatIbanDisplay(selectedPayrollForReceipt.iban)}
                </p>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Désignation / Plateforme</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px' }}>Gains Uber Fleet Net</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{(selectedPayrollForReceipt.earnings.uber || 0).toFixed(2)} €</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px' }}>Gains Bolt Partner Net</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{(selectedPayrollForReceipt.earnings.bolt || 0).toFixed(2)} €</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px' }}>Gains Heetch Flotte Net</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{(selectedPayrollForReceipt.earnings.heetch || 0).toFixed(2)} €</td>
                </tr>
                <tr style={{ background: '#F8FAFC', fontWeight: 800, borderBottom: '1px solid #CBD5E1' }}>
                  <td style={{ padding: '10px 12px' }}>TOTAL REVENUS NETS DES PLATEFORMES</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{selectedPayrollForReceipt.earnings.totalBrut.toFixed(2)} €</td>
                </tr>
                {selectedPayrollForReceipt.otherDeductions > 0 && (
                  <tr style={{ color: '#EA580C', borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px' }}>Espèces encaissées en main (déjà conservées)</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>- {selectedPayrollForReceipt.otherDeductions.toFixed(2)} €</td>
                  </tr>
                )}
                <tr style={{ background: '#EFF6FF', color: '#0369A1', fontWeight: 800, borderBottom: '2px solid #BAE6FD' }}>
                  <td style={{ padding: '10px 12px' }}>SOUS-TOTAL NET CHAUFFEUR (SANS COMMISSION)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{(selectedPayrollForReceipt.earnings.totalBrut - (selectedPayrollForReceipt.otherDeductions || 0)).toFixed(2)} €</td>
                </tr>
                <tr style={{ color: '#DC2626', borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px' }}>Commission de gestion Nordrive</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>- {selectedPayrollForReceipt.fleetCommissionAmount.toFixed(2)} €</td>
                </tr>
                {selectedPayrollForReceipt.rentalDeduction > 0 && (
                  <tr style={{ color: '#D97706', borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px' }}>Location de véhicule flotte</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>- {selectedPayrollForReceipt.rentalDeduction.toFixed(2)} €</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total Net */}
            <div style={{ background: selectedPayrollForReceipt.netPayout >= 0 ? '#ECFDF5' : '#FEF2F2', border: `2px solid ${selectedPayrollForReceipt.netPayout >= 0 ? '#10B981' : '#EF4444'}`, borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: selectedPayrollForReceipt.netPayout >= 0 ? '#047857' : '#B91C1C', fontWeight: 800, textTransform: 'uppercase' }}>
                    {selectedPayrollForReceipt.netPayout >= 0 ? 'MONTANT DU VIREMENT BANCAIRE SEPA' : 'SOLDE DÛ PAR LE CHAUFFEUR (DETTE)'}
                  </span>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                    {selectedPayrollForReceipt.netPayout >= 0 ? 'Virement automatique Qonto' : 'Espèces collectées supérieures aux gains'}
                  </p>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: selectedPayrollForReceipt.netPayout >= 0 ? '#047857' : '#EF4444' }}>
                  {selectedPayrollForReceipt.netPayout.toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={15} /> Imprimer / PDF
              </button>
              <button
                onClick={() => setSelectedPayrollForReceipt(null)}
                style={{ padding: '10px 20px', background: '#0284C7', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast de confirmation de sauvegarde BDD */}
      {savedNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
          color: '#FFF',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 800,
          zIndex: 99999,
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <CheckCircle2 size={18} color="#FFF" />
          <span>{savedNotification}</span>
        </div>
      )}

    </div>
  );
};
