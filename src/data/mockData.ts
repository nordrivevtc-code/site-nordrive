// Données personnelles retirées de l'historique du dépôt (RGPD). Listes volontairement vides.
import type { Driver, DriverPayrollWeek, FleetSettings, Vehicle, FleetFine, FleetContract } from '../types/fleet';

export const initialFleetSettings: FleetSettings = {
  defaultWeeklyFee: 50,
  defaultCommissionRate: 0,
  payoutDayOfWeek: 'lundi',
  companyName: 'Nordrive',
  siren: '',
  whatsappContact: '',
  telegramContact: '',
  emailContact: '',
};

export const initialDrivers: Driver[] = [];
export const initialPayrollWeeks: DriverPayrollWeek[] = [];
export const initialVehicles: Vehicle[] = [];
export const initialFines: FleetFine[] = [];
export const initialContracts: FleetContract[] = [];
