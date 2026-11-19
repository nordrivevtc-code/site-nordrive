// ===========================
// DRIVER PIPELINE STATUS
// ===========================
export type DriverStatus =
  | 'nouveau_prospect'   // Vient de s'inscrire via le formulaire public
  | 'contact_initial'    // Premier appel / message effectué
  | 'docs_en_attente'    // Documents manquants à envoyer
  | 'docs_recus'         // Documents reçus, en cours de vérification
  | 'rattache'           // Rattachement officiel signé et validé
  | 'actif'              // Roule activement avec la flotte
  | 'inactif';           // Archivé / plus actif

export type PlatformType = 'uber' | 'bolt' | 'heetch' | 'caocao' | 'lecab';

// ===========================
// ACTIVITY / EXCHANGE HISTORY
// ===========================
export type ActivityType =
  | 'appel'
  | 'email'
  | 'whatsapp'
  | 'note'
  | 'statut_change'
  | 'document_recu'
  | 'inscription';

export interface Activity {
  id: string;
  date: string;              // ISO timestamp
  type: ActivityType;
  content: string;           // Note libre / description
  authorName?: string;       // "Direction Nordrive"
  relanceDate?: string;      // Date de relance prévue (ISO)
  oldStatus?: DriverStatus;  // Pour les changements de statut
  newStatus?: DriverStatus;
}

// ===========================
// DRIVER DOCUMENT
// ===========================
export interface DriverDocument {
  id: string;
  name: string;
  type: 'carte_vtc' | 'carte_vtc_verso' | 'permis_conduire' | 'kbis_siren' | 'casier_judiciaire' | 'assurance_pro' | 'carte_grise' | 'rc_circulation' | 'memo_assurance' | 'signature';
  status: 'valid' | 'pending' | 'missing' | 'expired';
  fileUrl?: string;
  updatedAt: string;
}

// ===========================
// DRIVER (MAIN ENTITY)
// ===========================
export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  hasVtcCard: boolean;
  vtcCardNumber?: string;
  vtcCardExpiry?: string;
  companyName?: string;
  siren?: string;
  hasVehicle: boolean;
  vehicleModel?: string;
  vehiclePlate?: string;
  platforms: PlatformType[];
  status: DriverStatus;
  createdAt: string;
  notes?: string;
  documents: DriverDocument[];
  commissionRate?: number;   // Optionnel (% commission si feeType = 'pourcentage')
  fixedWeeklyFee: number;    // Frais fixes hebdo (ex: 50€, 70€, etc.)
  feeType?: 'fixe' | 'pourcentage'; // Type de tarification flotte
  rentalFee?: number;        // Déduction location véhicule éventuelle (€/semaine)
  iban?: string;             // IBAN du chauffeur (ex: FR76...)
  bic?: string;              // Code BIC / SWIFT
  // CRM enrichi
  activities: Activity[];            // Historique complet des échanges
  lastContactDate?: string;          // Date du dernier contact
  nextFollowUpDate?: string;         // Date de relance prévue
  rgpdConsent?: boolean;             // Consentement RGPD coché dans le formulaire
  rgpdConsentDate?: string;          // Date du consentement
}

// ===========================
// PAYROLL
// ===========================
export interface PlatformEarnings {
  uber: number;
  bolt: number;
  heetch: number;
  caocao: number;
  totalBrut: number;
}

export interface CashDeductions {
  uber: number;
  bolt: number;
  heetch: number;
  total: number;
}

export interface DriverPayrollWeek {
  id: string;
  driverId: string;
  driverName: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  earnings: PlatformEarnings;
  cashDetails?: CashDeductions;
  ridesCount: number;
  platformFees: number;
  fleetCommissionAmount: number;
  feeType?: 'fixe' | 'pourcentage';
  feeRateApplied?: number;
  rentalDeduction: number;
  otherDeductions: number;     // Total espèces encaissées déduites
  netPayout: number;           // Montant final réel à virer (peut être négatif si dette)
  iban?: string;
  bic?: string;
  paymentStatus: 'en_attente' | 'calcule' | 'paye' | 'erreur';
  paymentDate?: string;
  payoutMethod: 'virement_sepa' | 'instant_transfer' | 'autre';
}

// ===========================
// FLEET SETTINGS
// ===========================
export interface FleetSettings {
  defaultWeeklyFee: number;     // Frais fixe hebdo par défaut (ex: 50€)
  defaultCommissionRate?: number;
  payoutDayOfWeek: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi';
  companyName: string;
  siren: string;
  whatsappContact: string;
  telegramContact: string;
  emailContact: string;
}

// ===========================
// ERP ENTITIES (VEHICLES, FINES, CONTRACTS)
// ===========================
export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  year: number;
  status: 'disponible' | 'en_location' | 'en_atelier';
  driverId?: string;
  driverName?: string;
  rentalPriceWeekly: number;
  mileage: number;
  nextCtDate: string;
  insuranceExpiryDate: string;
  purchasePrice?: number;
}

export interface FleetFine {
  id: string;
  plate: string;
  driverId?: string;
  driverName?: string;
  amount: number;
  reason: string;
  date: string;
  status: 'a_traiter' | 'contestee' | 'payee_chauffeur' | 'payee_flotte';
  location?: string;
}

export interface FleetContract {
  id: string;
  driverId: string;
  driverName: string;
  vehicleModel: string;
  vehiclePlate: string;
  startDate: string;
  endDate?: string;
  weeklyRate: number;
  status: 'actif' | 'clos' | 'en_attente';
}

export interface FleetMaintenance {
  id: string;
  vehicleModel: string;
  vehiclePlate: string;
  type: 'ct' | 'revision' | 'pneus' | 'reparation';
  date: string;
  cost: number;
  status: 'a_faire' | 'termine' | 'urgent';
  notes?: string;
}
