import Papa from 'papaparse';
import type { DriverPayrollWeek, Driver, CashDeductions } from '../types/fleet';

export interface ParsedDriverRecord {
  driverName: string;
  driverId: string;
  email?: string;
  phone?: string;
  grossRevenue: number;         // Chiffre d'affaires brut total de la plateforme
  netPlatformRevenue: number;   // Revenu net après commission plateforme (ce qui revient au chauffeur/flotte)
  cashCollected: number;        // Espèces déjà encaissées en main par le chauffeur
  ridesCount: number;           // Nombre de courses
  platform: 'UBER' | 'BOLT' | 'HEETCH';
  // Rétrocompatibilité
  uberEarnings: number;
  boltEarnings: number;
  heetchEarnings: number;
  netPlatformPayout: number;
}

export interface StatementParseResult {
  platform: 'UBER' | 'BOLT' | 'HEETCH' | 'GENERIC' | 'UNKNOWN';
  platformTitle: string;
  weekNumber?: number;
  records: ParsedDriverRecord[];
  totalGross: number;
  totalCash: number;
  totalNet: number;
  errors: string[];
}

export interface DriverContractTerms {
  feeType?: 'fixe' | 'pourcentage';
  fixedWeeklyFee?: number;
  commissionRate?: number;
  rentalFee?: number;
  iban?: string;
  bic?: string;
}

export interface QontoTransferRow {
  beneficiaryName: string;
  iban: string;
  bic: string;
  amount: number;
  currency: string;
  reference: string;
  hasIban: boolean;
  driverId: string;
  originalName: string;
}

export interface QontoExportResult {
  csvContent: string;
  validRows: QontoTransferRow[];
  missingIbanRows: QontoTransferRow[];
  totalAmount: number;
  totalTransfersCount: number;
}

export const DRIVER_FEE_GRID: Record<string, number> = {};

export const CANONICAL_ALIASES: Record<string, string> = {};

export const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export const cleanDriverName = (raw: string): string => {
  return (raw || '')
    .replace(/\r?\n/g, ' ')
    .replace(/[0-9]+[.,]?[0-9]*/g, '')
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeDriverName = (name: string): string => {
  const cleaned = cleanDriverName(name);
  return (cleaned || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getCanonicalDriverName = (rawName: string): string => {
  const cleaned = cleanDriverName(rawName);
  const norm = normalizeDriverName(cleaned);
  if (CANONICAL_ALIASES[norm]) return CANONICAL_ALIASES[norm];
  for (const [alias, canonical] of Object.entries(CANONICAL_ALIASES)) {
    if (norm === alias || norm.includes(alias) || alias.includes(norm)) {
      return canonical;
    }
  }
  return cleaned.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export const getDriverFee = (name: string, defaultFee: number = 50): number => {
  const norm = normalizeDriverName(name);
  if (DRIVER_FEE_GRID[norm] !== undefined) return DRIVER_FEE_GRID[norm];
  for (const [key, fee] of Object.entries(DRIVER_FEE_GRID)) {
    if (norm.includes(key) || key.includes(norm)) return fee;
  }
  return defaultFee;
};

/**
 * Nettoie et convertit en toute sécurité une chaîne en montant monétaire
 */
export const cleanMoneyAmount = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : round2(val);
  if (!val) return 0;
  
  const rawStr = String(val).trim().replace(/\s/g, '').replace('€', '').replace(',', '.');
  
  // Anti-UUID / Anti-Hex / Anti-Téléphone
  if (/[a-df-z]/i.test(rawStr) || (rawStr.includes('-') && !rawStr.startsWith('-')) || rawStr.startsWith('+')) {
    return 0;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawStr)) {
    return 0;
  }
  if (/e[+-]?[0-9]+/i.test(rawStr) && /[a-z]/i.test(rawStr.replace(/e[+-]?[0-9]+/i, ''))) {
    return 0;
  }

  const num = parseFloat(rawStr);
  if (isNaN(num) || num > 25000 || num < -25000) return 0;
  return round2(num);
};

/**
 * Nettoie un IBAN en majuscules sans espaces
 */
export const cleanIban = (rawIban?: string): string => {
  if (!rawIban) return '';
  return rawIban.replace(/\s+/g, '').toUpperCase().trim();
};

/**
 * Formate un IBAN avec espaces (ex: FR76 3000 6000 0112 3456 7890 189)
 */
export const formatIbanDisplay = (rawIban?: string): string => {
  const clean = cleanIban(rawIban);
  if (!clean) return '';
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

/**
 * Parser Certifié pour le rapport détaillé "Opérations de paiement" Uber Fleet (CSV)
 * Permet de comptabiliser chaque course individuelle avec son horodatage précis à la milliseconde.
 * Détecte automatiquement la date de coupure au Dimanche 23h59:59 de la semaine.
 */
export const parseUberTransactionsCsv = (csvText: string, cutoffDate?: Date): StatementParseResult => {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase()
  });

  // ─── Auto-détection du Dimanche 23h59:59 de coupure ─────────────────────
  // Si aucune cutoffDate fournie, on cherche la date min dans les transactions
  // et on calcule le dimanche de fin de la semaine ISO correspondante.
  let effectiveCutoff = cutoffDate;
  if (!effectiveCutoff) {
    let minDate: Date | null = null;
    for (const row of parsed.data) {
      const tsStr = row['par rapport à la création de rapport'] || row['date de la transaction'] || '';
      if (tsStr) {
        try {
          const clean = tsStr.split(' ')[0] + 'T' + (tsStr.split(' ')[1] || '').split('.')[0] + '+02:00';
          const d = new Date(clean);
          if (!isNaN(d.getTime()) && (minDate === null || d < minDate)) {
            minDate = d;
          }
        } catch { /* ignore */ }
      }
    }
    if (minDate) {
      // Trouver le Dimanche de la semaine ISO de la date min
      // En JS : 0=Dimanche, 1=Lundi, ..., 6=Samedi
      // ISO : 1=Lundi, ..., 7=Dimanche
      const dayOfWeek = minDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      // Jours restants jusqu'au dimanche (fin de semaine ISO)
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const sunday = new Date(minDate);
      sunday.setDate(minDate.getDate() + daysUntilSunday);
      // Coupure à Dimanche 23:59:59 heure de Paris (+02:00 en été / +01:00 en hiver)
      // On utilise 21:59:59 UTC en été (CEST = UTC+2) = 23:59:59 Paris
      sunday.setUTCHours(21, 59, 59, 999);
      effectiveCutoff = sunday;
      console.log(`[Uber TX Parser] Auto-cutoff détecté: Dimanche ${sunday.toISOString()} (${sunday.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} heure Paris)`);
    }
  }

  const driverMap = new Map<string, {
    canonicalName: string;
    uuid: string;
    grossRevenue: number;
    cashCollected: number;
    ridesCount: number;
  }>();

  let filteredOut = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const firstName = (row['prénom du chauffeur'] || row['prenom du chauffeur'] || row['first name'] || '').replace(/\r?\n/g, ' ').trim();
    const lastName = (row['nom du chauffeur'] || row['last name'] || '').trim();
    const uuid = (row['uuid du chauffeur'] || row['uuid'] || `uber-tx-${i}`).trim();

    if (!firstName && !lastName) continue;

    // Filtre horaire / Date de coupure (Dimanche 23h59:59)
    const timestampStr = row['par rapport à la création de rapport'] || row['date de la transaction'] || '';
    if (effectiveCutoff && timestampStr) {
      try {
        const cleanTimestamp = timestampStr.split(' ')[0] + 'T' + (timestampStr.split(' ')[1] || '').split('.')[0] + '+02:00';
        const txDate = new Date(cleanTimestamp);
        if (!isNaN(txDate.getTime()) && txDate > effectiveCutoff) {
          // Transaction postérieure au cutoff -> ignorée
          filteredOut++;
          continue;

        }
      } catch {
        // En cas d'erreur de parse date, on inclut par sécurité
      }
    }

    const rawFullName = `${firstName} ${lastName}`.trim();
    const canonicalName = getCanonicalDriverName(rawFullName);
    const key = canonicalName.toLowerCase();

    // Revenus nets de la course (ce qui revient au chauffeur)
    let netRev = cleanMoneyAmount(row['montant vous étant versé : vos revenus'] || row['vos revenus'] || '0');
    if (netRev === 0) {
      const fare = cleanMoneyAmount(row['montant vous étant versé : vos revenus : prix de la course'] || '0');
      const toll = cleanMoneyAmount(row['montant vous étant versé:solde des courses:remboursements:péage'] || '0');
      const tip = cleanMoneyAmount(row['montant vous étant versé:vos revenus:pourboire'] || '0');
      netRev = fare + toll + tip;
    }

    // Espèces collectées
    const cash = Math.abs(cleanMoneyAmount(row['montant vous étant versé : solde des courses : versements : espèces collectées'] || row['espèces collectées'] || '0'));

    const desc = (row['description'] || '').toLowerCase();
    const isCompletedTrip = desc.includes('trip completed') || desc.includes('course terminée');

    if (!driverMap.has(key)) {
      driverMap.set(key, {
        canonicalName,
        uuid,
        grossRevenue: 0,
        cashCollected: 0,
        ridesCount: 0
      });
    }

    const d = driverMap.get(key)!;
    d.grossRevenue = round2(d.grossRevenue + netRev);
    d.cashCollected = round2(d.cashCollected + cash);
    if (isCompletedTrip) {
      d.ridesCount += 1;
    }
  }

  const records: ParsedDriverRecord[] = [];
  for (const [_, data] of driverMap.entries()) {
    if (data.grossRevenue === 0 && data.cashCollected === 0) continue;
    records.push({
      driverName: data.canonicalName,
      driverId: `drv-${data.uuid ? data.uuid.slice(0, 8) : 'uber'}`,
      grossRevenue: data.grossRevenue,
      netPlatformRevenue: data.grossRevenue,
      cashCollected: data.cashCollected,
      ridesCount: data.ridesCount || 1,
      platform: 'UBER',
      uberEarnings: data.grossRevenue,
      boltEarnings: 0,
      heetchEarnings: 0,
      netPlatformPayout: data.grossRevenue
    });
  }

  const totalGross = round2(records.reduce((s, r) => s + r.grossRevenue, 0));
  const totalCash = round2(records.reduce((s, r) => s + r.cashCollected, 0));
  const totalNet = round2(records.reduce((s, r) => s + r.netPlatformRevenue, 0));

  console.log(`[Uber TX Parser] Total: ${records.length} chauffeurs, ${filteredOut} transactions filtrées après dimanche 23:59`);

  return {
    platform: 'UBER',
    platformTitle: `Rapport Détaillé Opérations de Paiement Uber Fleet${filteredOut > 0 ? ` (${filteredOut} tx après dim. 23:59 exclues)` : ''}`,
    records,
    totalGross,
    totalCash,
    totalNet,
    errors: filteredOut > 0 ? [`✅ ${filteredOut} transaction(s) postérieure(s) au dimanche 23:59 automatiquement exclues`] : []
  };
};

/**
 * Parser Certifié pour les relevés officiels UBER FLEET (CSV)
 * Règle comptable :
 * - Revenu Net Plateforme = Revenus totaux (+ péages s'il y a)
 * - Espèces = Versements : Espèces collectées (en valeur absolue)
 * (NE PAS soustraire les espèces ici pour éviter la double déduction !)
 */
export const parseUberFleetCsv = (csvText: string): StatementParseResult => {
  // Détection si c'est le fichier transactionnel "Opérations de paiement"
  const headerCheck = csvText.slice(0, 500).toLowerCase();
  if (headerCheck.includes('uuid de la transaction') || headerCheck.includes('par rapport à la création de rapport') || headerCheck.includes('montant vous étant versé : vos revenus')) {
    return parseUberTransactionsCsv(csvText);
  }

  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase()
  });

  const records: ParsedDriverRecord[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    
    const firstName = (row['prénom du chauffeur'] || row['prenom du chauffeur'] || row['first name'] || '').replace(/\r?\n/g, ' ').trim();
    const lastName = (row['nom du chauffeur'] || row['last name'] || '').trim();
    const uuid = (row['uuid du chauffeur'] || row['uuid'] || `uber-${i}`).trim();

    if (!firstName && !lastName) continue;

    const rawFullName = `${firstName} ${lastName}`.trim();
    const canonicalName = getCanonicalDriverName(rawFullName);

    // Chiffre généré par le chauffeur sur Uber
    const grossTotal = cleanMoneyAmount(row['revenus totaux'] || row['total gross'] || '0');
    let toll = 0;
    for (const [k, v] of Object.entries(row)) {
      if (k.includes('péage') || k.includes('peage')) {
        toll = cleanMoneyAmount(v);
        break;
      }
    }

    // Total Net Plateforme Uber (Net courses + bonus + pourboires + péages)
    const uberNetRevenue = round2(grossTotal + toll);

    // Espèces collectées directement par le chauffeur auprès des passagers
    let cash = 0;
    for (const [k, v] of Object.entries(row)) {
      if (k.includes('espèces collectées') || k.includes('especes collectees')) {
        cash = Math.abs(cleanMoneyAmount(v));
        break;
      }
    }

    if (uberNetRevenue === 0 && cash === 0) continue;

    records.push({
      driverName: canonicalName,
      driverId: `drv-${uuid ? uuid.slice(0, 8) : `uber-${i}`}`,
      grossRevenue: uberNetRevenue,
      netPlatformRevenue: uberNetRevenue,
      cashCollected: cash,
      ridesCount: Math.max(1, Math.round(uberNetRevenue / 22)) || 1,
      platform: 'UBER',
      uberEarnings: uberNetRevenue,
      boltEarnings: 0,
      heetchEarnings: 0,
      netPlatformPayout: uberNetRevenue
    });
  }

  const totalGross = round2(records.reduce((s, r) => s + r.grossRevenue, 0));
  const totalCash = round2(records.reduce((s, r) => s + r.cashCollected, 0));
  const totalNet = round2(records.reduce((s, r) => s + r.netPlatformRevenue, 0));

  return {
    platform: 'UBER',
    platformTitle: 'Rapport Officiel Uber Fleet (CSV)',
    records,
    totalGross,
    totalCash,
    totalNet,
    errors
  };
};

/**
 * Parser Certifié pour les relevés officiels BOLT PARTNER (CSV)
 * Règle comptable :
 * - Chiffre brut total = Revenus bruts (total)
 * - Revenu Net Plateforme = Revenus nets (après com Bolt)
 * - Espèces = Montant des espèces perçu
 */
export const parseBoltPartnerCsv = (csvText: string): StatementParseResult => {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase()
  });

  const records: ParsedDriverRecord[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    
    let rawName = '';
    let rawEmail = '';
    let rawPhone = '';
    let rawNet = '';
    let rawGross = '';
    let rawCash = '';
    let rawId = '';

    for (const [key, val] of Object.entries(row)) {
      const k = key.toLowerCase();
      if (k === 'chauffeur' || (k.includes('chauffeur') && !k.includes('identifiant'))) rawName = val;
      else if (k.includes('e-mail') || k.includes('email')) rawEmail = val;
      else if (k.includes('téléphone') || k.includes('telephone')) rawPhone = val;
      else if (k.includes('revenus nets') && !k.includes('heure')) rawNet = val;
      else if (k.includes('revenus bruts (total)') || (k.includes('revenus bruts') && !k.includes('heure') && !k.includes('application') && !k.includes('espèces'))) rawGross = val;
      else if (k.includes('espèces perçu') || k.includes('especes percu') || k.includes('montant des espèces perçu')) rawCash = val;
      else if (k.includes('identifiant chauffeur')) rawId = val;
    }

    if (!rawName || !rawName.trim()) continue;

    const canonicalName = getCanonicalDriverName(rawName);
    const grossRev = cleanMoneyAmount(rawGross);
    const netRev = cleanMoneyAmount(rawNet);
    const cash = Math.abs(cleanMoneyAmount(rawCash));

    const finalNet = netRev > 0 ? netRev : grossRev;
    if (finalNet === 0 && grossRev === 0 && cash === 0) continue;

    records.push({
      driverName: canonicalName,
      driverId: `drv-${rawId ? rawId.slice(0, 8) : `bolt-${i}`}`,
      email: rawEmail.trim(),
      phone: rawPhone.trim(),
      grossRevenue: grossRev > 0 ? grossRev : finalNet,
      netPlatformRevenue: finalNet,
      cashCollected: cash,
      ridesCount: Math.max(1, Math.round(finalNet / 20)) || 1,
      platform: 'BOLT',
      uberEarnings: 0,
      boltEarnings: finalNet,
      heetchEarnings: 0,
      netPlatformPayout: finalNet
    });
  }

  const totalGross = round2(records.reduce((s, r) => s + r.grossRevenue, 0));
  const totalCash = round2(records.reduce((s, r) => s + r.cashCollected, 0));
  const totalNet = round2(records.reduce((s, r) => s + r.netPlatformRevenue, 0));

  return {
    platform: 'BOLT',
    platformTitle: 'Rapport Officiel Bolt Partner (CSV)',
    records,
    totalGross,
    totalCash,
    totalNet,
    errors
  };
};

/**
 * Parser Certifié pour les relevés officiels HEETCH FLOTTE (CSV)
 * Règle comptable :
 * - Revenu Net Plateforme = Revenus net
 * - Espèces = Espèces collectées
 */
export const parseHeetchFlotteCsv = (csvText: string): StatementParseResult => {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase()
  });

  const records: ParsedDriverRecord[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    
    let rawName = '';
    let rawId = '';
    let rawNet = '';
    let rawCash = '';

    for (const [key, val] of Object.entries(row)) {
      const k = key.toLowerCase();
      if (k === 'chauffeur' || (k.includes('chauffeur') && !k.includes('id'))) rawName = val;
      else if (k.includes('id chauffeur') || k.includes('identifiant')) rawId = val;
      else if (k.includes('revenus net') || k.includes('revenu net')) rawNet = val;
      else if (k.includes('espèces collectées') || k.includes('especes collectees')) rawCash = val;
    }

    if (!rawName || !rawName.trim() || rawName.trim().toUpperCase() === 'TOTAL') continue;

    const canonicalName = getCanonicalDriverName(rawName);
    const heetchNet = cleanMoneyAmount(rawNet);
    const cash = Math.abs(cleanMoneyAmount(rawCash));

    if (heetchNet === 0 && cash === 0) continue;

    records.push({
      driverName: canonicalName,
      driverId: `drv-${rawId ? rawId.slice(0, 8) : `heetch-${i}`}`,
      grossRevenue: heetchNet,
      netPlatformRevenue: heetchNet,
      cashCollected: cash,
      ridesCount: Math.max(1, Math.round(heetchNet / 18)) || 1,
      platform: 'HEETCH',
      uberEarnings: 0,
      boltEarnings: 0,
      heetchEarnings: heetchNet,
      netPlatformPayout: heetchNet
    });
  }

  const totalGross = round2(records.reduce((s, r) => s + r.grossRevenue, 0));
  const totalCash = round2(records.reduce((s, r) => s + r.cashCollected, 0));
  const totalNet = round2(records.reduce((s, r) => s + r.netPlatformRevenue, 0));

  return {
    platform: 'HEETCH',
    platformTitle: 'Rapport Officiel Heetch Flotte (CSV)',
    records,
    totalGross,
    totalCash,
    totalNet,
    errors
  };
};

/**
 * Détection automatique de n'importe quel fichier de relevé VTC
 */
export const parseStatementFile = (csvText: string): StatementParseResult => {
  if (!csvText || !csvText.trim()) {
    return {
      platform: 'UNKNOWN',
      platformTitle: 'Fichier vide',
      records: [],
      totalGross: 0,
      totalCash: 0,
      totalNet: 0,
      errors: ['Fichier vide ou non renseigné']
    };
  }

  const firstLines = csvText.trim().slice(0, 600).toLowerCase();

  if (firstLines.includes('uuid du chauffeur') || firstLines.includes('prénom du chauffeur') || (firstLines.includes('revenus totaux') && !firstLines.includes('bolt'))) {
    return parseUberFleetCsv(csvText);
  }

  if (firstLines.includes('montant des espèces perçu') || firstLines.includes('identifiant chauffeur') || firstLines.includes('paiement prévu') || (firstLines.includes('chauffeur') && firstLines.includes('adresse e-mail'))) {
    return parseBoltPartnerCsv(csvText);
  }

  if (firstLines.includes('id chauffeur') || firstLines.includes('solde initial') || firstLines.includes('versement flotte') || (firstLines.includes('chauffeur') && firstLines.includes('revenus net'))) {
    return parseHeetchFlotteCsv(csvText);
  }

  if (firstLines.includes('uber') || firstLines.includes('versements')) {
    return parseUberFleetCsv(csvText);
  }

  return {
    platform: 'UNKNOWN',
    platformTitle: 'Format CSV non reconnu',
    records: [],
    totalGross: 0,
    totalCash: 0,
    totalNet: 0,
    errors: ['Format non reconnu. Assurez-vous d\'importer un fichier CSV officiel Uber, Bolt ou Heetch.']
  };
};

export const getWeekDateRange = (weekNumber: number, year: number = 2026): { startStr: string; endStr: string; label: string } => {
  const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dayOfWeek <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setUTCDate(ISOweekStart.getUTCDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  return {
    startStr: toISO(ISOweekStart),
    endStr: toISO(ISOweekEnd),
    label: `${fmt(ISOweekStart)} - ${fmt(ISOweekEnd)} ${year}`
  };
};

export const extractWeekFromTextOrFilename = (text: string, filename?: string): number | null => {
  const target = `${filename || ''} ${text.slice(0, 400)}`.toLowerCase();
  
  const wMatch = target.match(/(?:2026)?w(\d{1,2})/i) || target.match(/semaine\s*(\d{1,2})/i) || target.match(/\bs(\d{1,2})\b/i);
  if (wMatch && wMatch[1]) {
    const w = parseInt(wMatch[1], 10);
    if (w >= 1 && w <= 53) return w;
  }

  const dateMatch = target.match(/(\d{4})(\d{2})(\d{2})/);
  if (dateMatch) {
    const y = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10) - 1;
    const d = parseInt(dateMatch[3], 10);
    const dateObj = new Date(Date.UTC(y, m, d));
    const dayNum = dateObj.getUTCDay() || 7;
    dateObj.setUTCDate(dateObj.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(dateObj.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((dateObj.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    if (weekNo >= 1 && weekNo <= 53) return weekNo;
  }

  return null;
};

export interface CalculatePayrollInput {
  driverId: string;
  driverName: string;
  weekNumber: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  uberNet: number;
  boltNet: number;
  heetchNet: number;
  uberCash: number;
  boltCash: number;
  heetchCash: number;
  ridesCount?: number;
  feeType?: 'fixe' | 'pourcentage';
  fixedWeeklyFee?: number;
  commissionRate?: number;
  rentalFee?: number;
  iban?: string;
  bic?: string;
  payoutMethod?: DriverPayrollWeek['payoutMethod'];
  paymentStatus?: DriverPayrollWeek['paymentStatus'];
}

/**
 * Calcul rigoureux et certifié de la paie hebdomadaire d'un chauffeur
 * FORMULE COMPTABLE :
 * Total Net Plateformes = Net Uber + Net Bolt + Net Heetch
 * Total Espèces Encaissées = Espèces Uber + Espèces Bolt + Espèces Heetch
 * Commission Flotte = Selon contrat (ex: 50€, 70€ fixe OU 10% sur CA net)
 * Net Réel à Virer = Total Net Plateformes - Commission Flotte - Location - Total Espèces
 */
export const calculateDriverPayroll = (input: CalculatePayrollInput): DriverPayrollWeek => {
  const uber = round2(input.uberNet || 0);
  const bolt = round2(input.boltNet || 0);
  const heetch = round2(input.heetchNet || 0);
  const totalNetPlateformes = round2(uber + bolt + heetch);

  const cashUber = round2(input.uberCash || 0);
  const cashBolt = round2(input.boltCash || 0);
  const cashHeetch = round2(input.heetchCash || 0);
  const totalCash = round2(cashUber + cashBolt + cashHeetch);

  const feeType = input.feeType || 'fixe';
  const defaultFee = getDriverFee(input.driverName, 50);
  const fixedWeeklyFee = input.fixedWeeklyFee !== undefined ? input.fixedWeeklyFee : defaultFee;
  const commissionRate = input.commissionRate !== undefined ? input.commissionRate : 10;
  const rentalDeduction = round2(input.rentalFee || 0);

  let fleetCommissionAmount = 0;
  if (totalNetPlateformes > 0) {
    if (feeType === 'pourcentage') {
      fleetCommissionAmount = round2(totalNetPlateformes * (commissionRate / 100));
    } else {
      fleetCommissionAmount = round2(Math.min(fixedWeeklyFee, totalNetPlateformes));
    }
  }

  // Net réel à virer (peut être négatif si cash excessif ou dette)
  const netPayout = round2(totalNetPlateformes - fleetCommissionAmount - rentalDeduction - totalCash);

  const { startStr, endStr } = getWeekDateRange(input.weekNumber, input.year || 2026);

  const cashDetails: CashDeductions = {
    uber: cashUber,
    bolt: cashBolt,
    heetch: cashHeetch,
    total: totalCash
  };

  return {
    id: `pay-${input.weekNumber}-${input.driverId}`,
    driverId: input.driverId,
    driverName: input.driverName,
    weekNumber: input.weekNumber,
    year: input.year || 2026,
    startDate: input.startDate || startStr,
    endDate: input.endDate || endStr,
    earnings: {
      uber,
      bolt,
      heetch,
      caocao: 0,
      totalBrut: totalNetPlateformes
    },
    cashDetails,
    ridesCount: input.ridesCount || Math.max(1, Math.round(totalNetPlateformes / 20)),
    platformFees: 0,
    fleetCommissionAmount,
    feeType,
    feeRateApplied: feeType === 'pourcentage' ? commissionRate : fixedWeeklyFee,
    rentalDeduction,
    otherDeductions: totalCash,
    netPayout,
    iban: cleanIban(input.iban),
    bic: input.bic || '',
    paymentStatus: input.paymentStatus || 'calcule',
    payoutMethod: input.payoutMethod || 'virement_sepa'
  };
};

/**
 * Convertit un StatementParseResult en DriverPayrollWeek[] pour une semaine donnée
 */
export const convertToPayrollRecords = (
  parsed: StatementParseResult,
  selectedWeek: number,
  existingDrivers: Driver[] = [],
  defaultFee: number = 50
): DriverPayrollWeek[] => {
  return parsed.records.map((r) => {
    const canonicalName = getCanonicalDriverName(r.driverName);
    const normName = normalizeDriverName(canonicalName);
    const rWords = normName.split(' ').filter(w => w.length >= 3);

    const existing = existingDrivers.find(d => {
      const dNorm = normalizeDriverName(`${d.firstName} ${d.lastName}`);
      if (dNorm === normName) return true;
      if (dNorm.length > 5 && normName.includes(dNorm)) return true;
      if (normName.length > 5 && dNorm.includes(normName)) return true;
      const dWords = dNorm.split(' ').filter(w => w.length >= 3);
      const common = rWords.filter(w => dWords.includes(w));
      if (common.length >= 2) return true;
      return !!(d.email && r.email && d.email.toLowerCase() === r.email.toLowerCase());
    });

    const driverId = existing ? existing.id : r.driverId;
    const gridFee = getDriverFee(canonicalName, -1);
    const weeklyFee = gridFee !== -1 ? gridFee : (existing?.fixedWeeklyFee !== undefined ? existing.fixedWeeklyFee : defaultFee);

    return calculateDriverPayroll({
      driverId,
      driverName: canonicalName,
      weekNumber: selectedWeek,
      uberNet: r.platform === 'UBER' ? r.netPlatformRevenue : 0,
      boltNet: r.platform === 'BOLT' ? r.netPlatformRevenue : 0,
      heetchNet: r.platform === 'HEETCH' ? r.netPlatformRevenue : 0,
      uberCash: r.platform === 'UBER' ? r.cashCollected : 0,
      boltCash: r.platform === 'BOLT' ? r.cashCollected : 0,
      heetchCash: r.platform === 'HEETCH' ? r.cashCollected : 0,
      ridesCount: r.ridesCount,
      feeType: existing?.feeType || 'fixe',
      fixedWeeklyFee: weeklyFee,
      commissionRate: existing?.commissionRate || 10,
      rentalFee: existing?.rentalFee || 0,
      iban: existing?.iban || '',
      bic: existing?.bic || ''
    });
  });
};

/**
 * Fusionne intelligemment plusieurs imports de plateformes (Uber, Bolt, Heetch) pour une même semaine
 */
export const mergeWeeklyPayrolls = (
  existingPayrolls: DriverPayrollWeek[],
  incomingRecords: DriverPayrollWeek[],
  drivers: Driver[] = []
): DriverPayrollWeek[] => {
  const updated = [...existingPayrolls];

  for (const inc of incomingRecords) {
    const canonicalName = getCanonicalDriverName(inc.driverName);
    const normInc = normalizeDriverName(canonicalName);
    const incWords = normInc.split(' ').filter(w => w.length >= 3);

    const existingIdx = updated.findIndex(p => {
      if (p.weekNumber !== inc.weekNumber) return false;
      if (p.driverId === inc.driverId) return true;
      const normEx = normalizeDriverName(getCanonicalDriverName(p.driverName));
      if (normEx === normInc) return true;
      if (normInc.length > 5 && normEx.includes(normInc)) return true;
      if (normEx.length > 5 && normInc.includes(normEx)) return true;
      const exWords = normEx.split(' ').filter(w => w.length >= 3);
      const commonWords = incWords.filter(w => exWords.includes(w));
      return commonWords.length >= 2;
    });

    const driverInfo = drivers.find(d => {
      if (d.id === inc.driverId) return true;
      const normDriver = normalizeDriverName(`${d.firstName} ${d.lastName}`);
      if (normDriver === normInc) return true;
      if (normInc.length > 5 && normDriver.includes(normInc)) return true;
      if (normDriver.length > 5 && normInc.includes(normDriver)) return true;
      const dWords = normDriver.split(' ').filter(w => w.length >= 3);
      const commonWords = incWords.filter(w => dWords.includes(w));
      return commonWords.length >= 2;
    });

    if (existingIdx !== -1) {
      const ex = updated[existingIdx];

      // Fusion des gains plateforme (remplace si le nouvel import concerne cette plateforme)
      const uber = inc.earnings.uber > 0 ? inc.earnings.uber : ex.earnings.uber;
      const bolt = inc.earnings.bolt > 0 ? inc.earnings.bolt : ex.earnings.bolt;
      const heetch = inc.earnings.heetch > 0 ? inc.earnings.heetch : ex.earnings.heetch;

      // Fusion des espèces par plateforme
      const uberCash = (inc.cashDetails?.uber !== undefined && inc.earnings.uber > 0) ? inc.cashDetails.uber : (ex.cashDetails?.uber || 0);
      const boltCash = (inc.cashDetails?.bolt !== undefined && inc.earnings.bolt > 0) ? inc.cashDetails.bolt : (ex.cashDetails?.bolt || 0);
      const heetchCash = (inc.cashDetails?.heetch !== undefined && inc.earnings.heetch > 0) ? inc.cashDetails.heetch : (ex.cashDetails?.heetch || 0);

      // Préservation ou mise à jour de l'IBAN
      const iban = cleanIban(inc.iban || ex.iban || driverInfo?.iban);
      const bic = inc.bic || ex.bic || driverInfo?.bic || '';

      const feeType = driverInfo?.feeType || ex.feeType || 'fixe';
      const gridFee = getDriverFee(canonicalName, -1);
      const fixedWeeklyFee = gridFee !== -1 ? gridFee : (driverInfo?.fixedWeeklyFee !== undefined ? driverInfo.fixedWeeklyFee : (ex.feeType === 'fixe' ? ex.feeRateApplied : 50));
      const commissionRate = driverInfo?.commissionRate !== undefined ? driverInfo.commissionRate : 10;
      const rentalFee = driverInfo?.rentalFee !== undefined ? driverInfo.rentalFee : (ex.rentalDeduction || 0);

      const recalculated = calculateDriverPayroll({
        driverId: ex.driverId || inc.driverId,
        driverName: canonicalName,
        weekNumber: inc.weekNumber,
        year: inc.year || ex.year,
        startDate: ex.startDate || inc.startDate,
        endDate: ex.endDate || inc.endDate,
        uberNet: uber,
        boltNet: bolt,
        heetchNet: heetch,
        uberCash,
        boltCash,
        heetchCash,
        ridesCount: (ex.ridesCount || 0) + (inc.ridesCount || 0),
        feeType,
        fixedWeeklyFee,
        commissionRate,
        rentalFee,
        iban,
        bic,
        paymentStatus: ex.paymentStatus
      });

      updated[existingIdx] = recalculated;
    } else {
      const iban = cleanIban(inc.iban || driverInfo?.iban);
      const bic = inc.bic || driverInfo?.bic || '';
      updated.push({
        ...inc,
        driverName: canonicalName,
        iban,
        bic
      });
    }
  }

  return updated;
};

/**
 * Génère le fichier CSV officiel Qonto pour les virements bancaires groupés SEPA
 * Format standard officiel Qonto :
 * Nom du bénéficiaire,IBAN,BIC,Montant,Devise,Référence
 */
export const generateQontoBulkTransferCsv = (
  payrolls: DriverPayrollWeek[],
  drivers: Driver[] = []
): QontoExportResult => {
  const validRows: QontoTransferRow[] = [];
  const missingIbanRows: QontoTransferRow[] = [];
  let totalAmount = 0;

  for (const p of payrolls) {
    // Uniquement les chauffeurs avec un montant net positif à reverser
    if (p.netPayout <= 0) continue;

    // Récupérer l'IBAN depuis la paie ou depuis le profil CRM du chauffeur
    const driver = drivers.find(d => d.id === p.driverId || normalizeDriverName(`${d.firstName} ${d.lastName}`) === normalizeDriverName(p.driverName));
    const rawIban = p.iban || driver?.iban || '';
    const cleanBeneficiaryIban = cleanIban(rawIban);
    const bic = (p.bic || driver?.bic || '').trim().toUpperCase();

    // Nettoyer le nom pour virement bancaire SEPA
    const cleanName = p.driverName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()
      .trim();

    const reference = `Paie Nordrive S${p.weekNumber} - ${p.driverName}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 35); // Limite SEPA 35 caractères

    const rowObj: QontoTransferRow = {
      beneficiaryName: cleanName,
      iban: cleanBeneficiaryIban,
      bic,
      amount: p.netPayout,
      currency: 'EUR',
      reference,
      hasIban: cleanBeneficiaryIban.length >= 14,
      driverId: p.driverId,
      originalName: p.driverName
    };

    if (rowObj.hasIban) {
      validRows.push(rowObj);
      totalAmount = round2(totalAmount + p.netPayout);
    } else {
      missingIbanRows.push(rowObj);
    }
  }

  // Lignes du CSV Qonto (conforme à l'import Qonto)
  const header = 'Nom du bénéficiaire,IBAN,BIC,Montant,Devise,Référence';
  const csvLines = [header];

  for (const r of validRows) {
    const escapedName = `"${r.beneficiaryName.replace(/"/g, '""')}"`;
    const escapedRef = `"${r.reference.replace(/"/g, '""')}"`;
    csvLines.push(`${escapedName},${r.iban},${r.bic},${r.amount.toFixed(2)},${r.currency},${escapedRef}`);
  }

  // UTF-8 BOM pour Excel et compatibilité européenne
  const csvContent = '\uFEFF' + csvLines.join('\r\n');

  return {
    csvContent,
    validRows,
    missingIbanRows,
    totalAmount,
    totalTransfersCount: validRows.length
  };
};
