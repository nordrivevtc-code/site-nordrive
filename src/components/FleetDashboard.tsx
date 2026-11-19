import React, { useState } from 'react';
import {
  Car, Users, TrendingUp, AlertTriangle, Search, Bell, Moon,
  FileText, CreditCard, Wrench, LayoutDashboard, FileCheck, Shield,
  LogOut, ExternalLink, Plus, Trash2, X, CheckCircle2, RotateCcw
} from 'lucide-react';
import type { Driver, Vehicle, FleetFine, FleetContract } from '../types/fleet';
import { initialVehicles, initialFines, initialContracts } from '../data/mockData';
import { logoutAdmin } from './AdminLogin';
import { clearNordriveStorage } from '../hooks/useLocalStorage';

interface FleetDashboardProps {
  drivers: Driver[];
  onNavigateSubTab?: () => void;
  onOpenPublicSite?: () => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({
  drivers,
  onNavigateSubTab,
  onOpenPublicSite
}) => {
  // Real ERP State Management
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [revenuePeriod, setRevenuePeriod] = useState<'semaine' | 'mois'>('semaine');
  const [activeFilter, setActiveFilter] = useState<'tous' | 'critique' | 'urgent'>('tous');

  // Dynamic Fleet Data State (Persistent in LocalStorage)
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const saved = localStorage.getItem('nordrive_real_vehicles');
      return saved ? JSON.parse(saved) : initialVehicles;
    } catch {
      return initialVehicles;
    }
  });

  const [fines, setFines] = useState<FleetFine[]>(() => {
    try {
      const saved = localStorage.getItem('nordrive_real_fines');
      return saved ? JSON.parse(saved) : initialFines;
    } catch {
      return initialFines;
    }
  });

  const [contracts, setContracts] = useState<FleetContract[]>(() => {
    try {
      const saved = localStorage.getItem('nordrive_real_contracts');
      return saved ? JSON.parse(saved) : initialContracts;
    } catch {
      return initialContracts;
    }
  });

  const [maintenances, setMaintenances] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('nordrive_real_maintenances');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveVehicles = (next: Vehicle[]) => {
    setVehicles(next);
    localStorage.setItem('nordrive_real_vehicles', JSON.stringify(next));
  };

  const saveFines = (next: FleetFine[]) => {
    setFines(next);
    localStorage.setItem('nordrive_real_fines', JSON.stringify(next));
  };

  const saveContracts = (next: FleetContract[]) => {
    setContracts(next);
    localStorage.setItem('nordrive_real_contracts', JSON.stringify(next));
  };

  const saveMaintenances = (next: any[]) => {
    setMaintenances(next);
    localStorage.setItem('nordrive_real_maintenances', JSON.stringify(next));
  };

  // Modals State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState<boolean>(false);
  const [newVehicle, setNewVehicle] = useState({ model: '', plate: '', year: 2025, rentalPriceWeekly: 300, mileage: 25000, nextCtDate: '2027-06-01', insuranceExpiryDate: '2026-12-31' });

  const [showAddFineModal, setShowAddFineModal] = useState<boolean>(false);
  const [newFine, setNewFine] = useState({ plate: '', driverName: '', amount: 135, reason: 'Excès de vitesse < 20 km/h', location: 'A86 Paris', date: new Date().toISOString().slice(0, 10) });

  const [showAddContractModal, setShowAddContractModal] = useState<boolean>(false);
  const [newContract, setNewContract] = useState({ driverName: '', vehicleModel: '', vehiclePlate: '', weeklyRate: 350, startDate: new Date().toISOString().slice(0, 10) });

  const [showAddMaintenanceModal, setShowAddMaintenanceModal] = useState<boolean>(false);
  const [newMaintenance, setNewMaintenance] = useState({ vehicleModel: '', vehiclePlate: '', type: 'Vidange & Révision', cost: 180, date: new Date().toISOString().slice(0, 10), notes: '' });

  // Dynamic Real-time Calculations
  const totalVehicles = vehicles.length;
  const activeRentals = vehicles.filter(v => v.status === 'en_location').length;
  const availableVehicles = vehicles.filter(v => v.status === 'disponible').length;
  const inWorkshop = vehicles.filter(v => v.status === 'en_atelier').length;
  const totalDrivers = drivers.length;
  const activeFinesCount = fines.filter(f => f.status === 'a_traiter').length;
  const occupancyRate = totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0;
  
  // Real monthly revenue calculation based on active rentals
  const monthlyRevenue = vehicles.reduce((sum, v) => sum + (v.status === 'en_location' ? (v.rentalPriceWeekly || 300) * 4 : 0), 0);
  const totalInvestment = vehicles.reduce((sum, v) => sum + (v.purchasePrice || 35000), 0);

  // Dynamic Activity Feed generated from real actions
  const recentActivities = [
    ...(vehicles.slice(0, 3).map(v => ({
      id: `act-v-${v.id}`,
      title: v.status === 'en_location' ? 'Véhicule en location' : 'Véhicule ajouté à la flotte',
      detail: `${v.model} (${v.plate})`,
      time: 'Actif',
      color: v.status === 'en_location' ? '#34D399' : '#38BDF8'
    }))),
    ...(fines.slice(0, 2).map(f => ({
      id: `act-f-${f.id}`,
      title: 'PV enregistré',
      detail: `${f.amount}€ — ${f.plate} (${f.reason})`,
      time: f.date,
      color: '#F59E0B'
    }))),
    ...(drivers.slice(0, 2).map(d => ({
      id: `act-d-${d.id}`,
      title: 'Chauffeur inscrit',
      detail: `${d.firstName} ${d.lastName} (${d.city || 'VTC'})`,
      time: 'Récent',
      color: '#A78BFA'
    })))
  ];

  // Dynamic Fleet Alerts
  const fleetAlerts = [
    ...fines.filter(f => f.status === 'a_traiter').map(f => ({
      id: `alt-f-${f.id}`,
      title: 'Amende à traiter',
      vehicle: `${f.plate} — ${f.reason}`,
      tag: 'Urgent',
      badgeColor: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.2)',
      level: 'critique'
    })),
    ...vehicles.filter(v => v.status === 'en_atelier').map(v => ({
      id: `alt-v-${v.id}`,
      title: 'Véhicule en atelier',
      vehicle: `${v.model} (${v.plate})`,
      tag: 'Maintenance',
      badgeColor: '#F59E0B',
      badgeBg: 'rgba(245, 158, 11, 0.2)',
      level: 'urgent'
    }))
  ];

  const filteredAlerts = fleetAlerts.filter(a => {
    if (activeFilter === 'critique') return a.level === 'critique';
    if (activeFilter === 'urgent') return a.level === 'urgent';
    return true;
  });

  // Handlers for real data mutations
  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.model || !newVehicle.plate) return;
    const created: Vehicle = {
      id: `veh-${Date.now()}`,
      model: newVehicle.model,
      plate: newVehicle.plate.toUpperCase(),
      year: Number(newVehicle.year),
      status: 'disponible',
      rentalPriceWeekly: Number(newVehicle.rentalPriceWeekly),
      mileage: Number(newVehicle.mileage),
      nextCtDate: newVehicle.nextCtDate,
      insuranceExpiryDate: newVehicle.insuranceExpiryDate,
      purchasePrice: 42000
    };
    saveVehicles([created, ...vehicles]);
    setShowAddVehicleModal(false);
    setNewVehicle({ model: '', plate: '', year: 2025, rentalPriceWeekly: 300, mileage: 25000, nextCtDate: '2027-06-01', insuranceExpiryDate: '2026-12-31' });
  };

  const handleUpdateVehicleStatus = (vehicleId: string, newStatus: Vehicle['status']) => {
    saveVehicles(vehicles.map(v => v.id === vehicleId ? { ...v, status: newStatus } : v));
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (window.confirm('Voulez-vous vraiment retirer ce véhicule de la flotte ?')) {
      saveVehicles(vehicles.filter(v => v.id !== vehicleId));
    }
  };

  const handleAddFineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFine.plate || !newFine.amount) return;
    const created: FleetFine = {
      id: `fine-${Date.now()}`,
      plate: newFine.plate.toUpperCase(),
      driverName: newFine.driverName || 'Chauffeur Flotte',
      amount: Number(newFine.amount),
      reason: newFine.reason,
      location: newFine.location,
      date: newFine.date,
      status: 'a_traiter'
    };
    saveFines([created, ...fines]);
    setShowAddFineModal(false);
    setNewFine({ plate: '', driverName: '', amount: 135, reason: 'Excès de vitesse < 20 km/h', location: 'A86 Paris', date: new Date().toISOString().slice(0, 10) });
  };

  const handleUpdateFineStatus = (fineId: string, newStatus: FleetFine['status']) => {
    saveFines(fines.map(f => f.id === fineId ? { ...f, status: newStatus } : f));
  };

  const handleAddContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.driverName || !newContract.vehicleModel) return;
    const created: FleetContract = {
      id: `ctr-${Date.now()}`,
      driverId: `drv-${Date.now()}`,
      driverName: newContract.driverName,
      vehicleModel: newContract.vehicleModel,
      vehiclePlate: newContract.vehiclePlate.toUpperCase(),
      startDate: newContract.startDate,
      weeklyRate: Number(newContract.weeklyRate),
      status: 'actif'
    };
    saveContracts([created, ...contracts]);
    setShowAddContractModal(false);
    setNewContract({ driverName: '', vehicleModel: '', vehiclePlate: '', weeklyRate: 350, startDate: new Date().toISOString().slice(0, 10) });
  };

  const handleAddMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintenance.vehicleModel) return;
    const created = {
      id: `maint-${Date.now()}`,
      vehicleModel: newMaintenance.vehicleModel,
      vehiclePlate: newMaintenance.vehiclePlate.toUpperCase(),
      type: newMaintenance.type,
      cost: Number(newMaintenance.cost),
      date: newMaintenance.date,
      notes: newMaintenance.notes,
      status: 'termine'
    };
    saveMaintenances([created, ...maintenances]);
    setShowAddMaintenanceModal(false);
    setNewMaintenance({ vehicleModel: '', vehiclePlate: '', type: 'Vidange & Révision', cost: 180, date: new Date().toISOString().slice(0, 10), notes: '' });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050A16', color: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      
      {/* ─── LEFT SIDEBAR NAV (NORDRIVE DA) ─────────────────────────────────── */}
      <aside style={{ width: '260px', background: '#0A1020', borderRight: '1px solid rgba(56, 189, 248, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 16px', flexShrink: 0 }}>
        <div>
          
          {/* Logo & Brand Header (Nordrive Cyan/Teal Gradient DA) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px', borderBottom: '1px solid rgba(56, 189, 248, 0.12)', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 900, fontSize: '18px', boxShadow: '0 4px 18px rgba(56, 189, 248, 0.35)' }}>
              N
            </div>
            <div>
              <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.3px', color: '#FFF', display: 'block', lineHeight: 1.1 }}>
                NOR<span style={{ color: '#38BDF8' }}>DRIVE</span>
              </span>
              <span style={{ fontSize: '10px', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.5px' }}>ERP FLOTTE VTC</span>
            </div>
          </div>

          {/* Navigation Categories */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CATEGORY: PRINCIPAL */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748B', padding: '0 8px', display: 'block', marginBottom: '8px' }}>
                PRINCIPAL
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={16} /> },
                  { id: 'voitures', label: 'Voitures', icon: <Car size={16} />, badge: String(totalVehicles) },
                  { id: 'chauffeurs', label: 'Chauffeurs CRM', icon: <Users size={16} />, badge: String(totalDrivers) },
                  { id: 'contrats', label: 'Contrats', icon: <FileText size={16} />, badge: String(contracts.length) },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'chauffeurs' && onNavigateSubTab) {
                        onNavigateSubTab();
                      } else {
                        setActiveSidebarTab(item.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeSidebarTab === item.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                      background: activeSidebarTab === item.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: activeSidebarTab === item.id ? '#38BDF8' : '#94A3B8',
                      fontSize: '13px',
                      fontWeight: activeSidebarTab === item.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '100px', background: activeSidebarTab === item.id ? '#0284C7' : 'rgba(255, 255, 255, 0.08)', color: '#FFF' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORY: FINANCE */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748B', padding: '0 8px', display: 'block', marginBottom: '8px' }}>
                FINANCE
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { id: 'paiements', label: 'Paiements & Paie', icon: <CreditCard size={16} /> },
                  { id: 'amendes', label: 'Amendes & PV', icon: <AlertTriangle size={16} />, badge: String(activeFinesCount), alertBadge: activeFinesCount > 0 },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSidebarTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeSidebarTab === item.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                      background: activeSidebarTab === item.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: activeSidebarTab === item.id ? '#38BDF8' : '#94A3B8',
                      fontSize: '13px',
                      fontWeight: activeSidebarTab === item.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '100px', background: item.alertBadge ? '#EF4444' : 'rgba(255, 255, 255, 0.08)', color: '#FFF' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORY: OPÉRATIONS */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748B', padding: '0 8px', display: 'block', marginBottom: '8px' }}>
                OPÉRATIONS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { id: 'inspection', label: 'Inspection / CT', icon: <FileCheck size={16} /> },
                  { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={16} />, badge: String(maintenances.length) },
                  { id: 'documents', label: 'Documents Flotte', icon: <Shield size={16} /> },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSidebarTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeSidebarTab === item.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                      background: activeSidebarTab === item.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: activeSidebarTab === item.id ? '#38BDF8' : '#94A3B8',
                      fontSize: '13px',
                      fontWeight: activeSidebarTab === item.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </nav>

        </div>

        {/* User Admin Profile at Bottom */}
        <div style={{ borderTop: '1px solid rgba(56, 189, 248, 0.12)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284C7, #0D9488)', color: '#FFF', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}>
              ND
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: '#FFF', display: 'block', lineHeight: 1.1 }}>Direction Nordrive</strong>
              <span style={{ fontSize: '11px', color: '#64748B' }}>nordrivevtc@gmail.com</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous réinitialiser et nettoyer TOUTES les données de test ?\n(Cela videra le CRM pour repartir sur une base 100% propre et réelle).')) {
                  clearNordriveStorage();
                  window.location.reload();
                }
              }}
              title="Effacer les données de test (Démarrage propre)"
              style={{ background: 'transparent', border: 'none', color: '#F87171', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={logoutAdmin}
              title="Déconnexion CRM"
              style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        
        {/* TOP HEADER BAR */}
        <header style={{ height: '64px', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', background: '#0A1020', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Bonjour, <strong style={{ color: '#FFF' }}>Administrateur 👋</strong></span>
            <span style={{ color: '#334155' }}>•</span>
            <h1 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>
              {activeSidebarTab === 'dashboard' && 'Tableau de bord ERP'}
              {activeSidebarTab === 'voitures' && 'Gestion de la Flotte Automobile'}
              {activeSidebarTab === 'amendes' && 'Gestion des Amendes & Infractions ANTAI'}
              {activeSidebarTab === 'contrats' && 'Gestion des Contrats VTC'}
              {activeSidebarTab === 'maintenance' && 'Maintenance & Entretien de Flotte'}
              {activeSidebarTab === 'paiements' && 'Paiements & Paie Hebdomadaire'}
              {activeSidebarTab !== 'dashboard' && activeSidebarTab !== 'voitures' && activeSidebarTab !== 'amendes' && activeSidebarTab !== 'contrats' && activeSidebarTab !== 'maintenance' && activeSidebarTab !== 'paiements' && 'Module Flotte'}
            </h1>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Rechercher chauffeur, immatriculation, amende..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '100px',
                color: '#FFF',
                fontSize: '12.5px',
                outline: 'none'
              }}
            />
          </div>

          {/* Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            
            {/* Security Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '100px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34D399', fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px',
            }}>
              <Shield size={13} />
              <span>Haute Sécurité SSL / RLS</span>
            </div>

            <button style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', cursor: 'pointer' }}>
              <Moon size={16} />
            </button>

            <div style={{ position: 'relative' }}>
              <button style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', cursor: 'pointer' }}>
                <Bell size={16} />
              </button>
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#0284C7', color: '#FFF', fontSize: '9px', fontWeight: 900, width: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFinesCount}
              </span>
            </div>

            {onOpenPublicSite && (
              <button
                onClick={onOpenPublicSite}
                style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Site Nordrive</span>
                <ExternalLink size={13} />
              </button>
            )}
          </div>
        </header>

        {/* ─── TAB 1: TABLEAU DE BORD ERP OVERVIEW ─────────────────────────── */}
        {activeSidebarTab === 'dashboard' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── Quick Action Hub (Barre d'actions rapides simple & ergonomique) ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(13,148,136,0.15))',
              border: '1px solid rgba(56,189,248,0.25)',
              borderRadius: '20px',
              padding: '20px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>⚡ Raccourcis Rapides</span>
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0 }}>
                  Que souhaitez-vous effectuer aujourd'hui ?
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveSidebarTab('paiements')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284C7, #0D9488)', border: 'none', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.3)' }}
                >
                  <TrendingUp size={15} /> Calculer la Paie Flotte
                </button>
                <button
                  onClick={() => setActiveSidebarTab('voitures')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Car size={15} /> Ajouter un Véhicule
                </button>
                <button
                  onClick={() => setActiveSidebarTab('amendes')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <AlertTriangle size={15} /> Traiter les Amendes ({activeFinesCount})
                </button>
              </div>
            </div>

            {/* TOP METRICS GRID (4 CARDS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              
              {/* Card 1: Total Véhicules */}
              <div 
                onClick={() => setActiveSidebarTab('voitures')}
                style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'transform 0.2s' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                  <Car size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>Total véhicules</span>
                  <strong style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>{totalVehicles}</strong>
                  <span style={{ fontSize: '11px', color: '#34D399', display: 'block', marginTop: '2px' }}>{activeRentals} en location active</span>
                </div>
              </div>

              {/* Card 2: Chauffeurs */}
              <div 
                onClick={() => onNavigateSubTab && onNavigateSubTab()}
                style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                  <Users size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>Chauffeurs</span>
                  <strong style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>{totalDrivers}</strong>
                  <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '2px' }}>Dossiers CRM inscrits</span>
                </div>
              </div>

              {/* Card 3: Revenus du mois */}
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>Revenus du mois</span>
                  <strong style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>{monthlyRevenue.toLocaleString('fr-FR')} €</strong>
                  <span style={{ fontSize: '11px', color: '#38BDF8', display: 'block', marginTop: '2px' }}>Calculé en direct</span>
                </div>
              </div>

              {/* Card 4: Amendes actives */}
              <div 
                onClick={() => setActiveSidebarTab('amendes')}
                style={{ background: '#0A1020', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>Amendes actives</span>
                  <strong style={{ fontSize: '24px', fontWeight: 900, color: activeFinesCount > 0 ? '#EF4444' : '#10B981' }}>{activeFinesCount}</strong>
                  <span style={{ fontSize: '11px', color: activeFinesCount > 0 ? '#EF4444' : '#10B981', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                    {activeFinesCount > 0 ? 'À traiter' : 'Aucune amende'}
                  </span>
                </div>
              </div>

            </div>

            {/* MIDDLE ROW GRID (3 COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              
              {/* Col 1: Voitures Stats */}
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>Voitures</h3>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Statistiques véhicules</span>
                  </div>
                  
                  {/* Circular gauge */}
                  <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="44" height="44" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#38BDF8" strokeWidth="3.5" strokeDasharray={`${occupancyRate}, 100`} />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 900, color: '#FFF' }}>{occupancyRate}%</span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>RÉCAPITULATIF FLOTTE</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                      <span>Total véhicules</span>
                      <strong style={{ color: '#FFF' }}>{totalVehicles}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                      <span>Disponibles</span>
                      <strong style={{ color: '#38BDF8' }}>{availableVehicles}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                      <span>En location</span>
                      <strong style={{ color: '#34D399' }}>{activeRentals}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                      <span>En atelier</span>
                      <strong style={{ color: '#F97316' }}>{inWorkshop}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', paddingTop: '6px', borderTop: '1px dashed rgba(56,189,248,0.15)' }}>
                      <span>Investissement total</span>
                      <strong style={{ color: '#38BDF8' }}>{totalInvestment.toLocaleString('fr-FR')} €</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddVehicleModal(true)}
                  style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Ajouter un véhicule à la flotte
                </button>
              </div>

              {/* Col 2: Chauffeurs Stats */}
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>Chauffeurs</h3>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>Statistiques chauffeurs</span>
                    </div>
                    
                    <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="44" height="44" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#A78BFA" strokeWidth="3.5" strokeDasharray={`${occupancyRate}, 100`} />
                      </svg>
                      <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 900, color: '#FFF' }}>{occupancyRate}%</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>RÉCAPITULATIF CHAUFFEURS</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                        <span>Total chauffeurs inscrits</span>
                        <strong style={{ color: '#FFF' }}>{totalDrivers}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                        <span>En location active</span>
                        <strong style={{ color: '#34D399' }}>{activeRentals}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                        <span>En attente de rattachement</span>
                        <strong style={{ color: '#94A3B8' }}>{totalDrivers > activeRentals ? totalDrivers - activeRentals : 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10.5px', color: '#38BDF8', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Taux d'occupation Flotte</span>
                  <strong style={{ fontSize: '26px', fontWeight: 900, color: '#FFF' }}>{occupancyRate}%</strong>
                </div>
              </div>

              {/* Col 3: Activité récente */}
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>Activité récente</h3>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Actions réelles sur votre registre</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {recentActivities.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', display: 'block', padding: '20px 0' }}>
                      Aucune activité enregistrée. Vos actions sur la flotte s'afficheront ici en direct.
                    </span>
                  ) : (
                    recentActivities.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, marginTop: '5px', flexShrink: 0, boxShadow: `0 0 8px ${item.color}` }} />
                          <div>
                            <strong style={{ fontSize: '12.5px', color: '#FFF', display: 'block', lineHeight: 1.2 }}>{item.title}</strong>
                            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '1px' }}>{item.detail}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#475569', whiteSpace: 'nowrap' }}>{item.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* BOTTOM ROW GRID (CHART 2/3 + ALERTES 1/3) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              
              {/* Left 2/3: Revenus totaux Chart (Nordrive DA Cyan Curve) */}
              <div style={{ gridColumn: 'span 2', background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block' }}>Revenus calculés</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <strong style={{ fontSize: '28px', fontWeight: 900, color: '#FFF' }}>{monthlyRevenue.toLocaleString('fr-FR')} €</strong>
                      <span style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 800 }}>En direct</span>
                    </div>
                  </div>

                  <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '3px', borderRadius: '100px' }}>
                    <button
                      onClick={() => setRevenuePeriod('semaine')}
                      style={{ padding: '5px 14px', borderRadius: '100px', border: 'none', background: revenuePeriod === 'semaine' ? 'linear-gradient(135deg, #0284C7, #0D9488)' : 'transparent', color: revenuePeriod === 'semaine' ? '#FFF' : '#94A3B8', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Semaine
                    </button>
                    <button
                      onClick={() => setRevenuePeriod('mois')}
                      style={{ padding: '5px 14px', borderRadius: '100px', border: 'none', background: revenuePeriod === 'mois' ? 'linear-gradient(135deg, #0284C7, #0D9488)' : 'transparent', color: revenuePeriod === 'mois' ? '#FFF' : '#94A3B8', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Mois
                    </button>
                  </div>
                </div>

                <div style={{ height: '180px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="nordriveCyanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="30" x2="600" y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="600" y2="70" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <line x1="0" y1="110" x2="600" y2="110" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <polygon points="0,150 80,145 160,135 240,140 320,130 400,120 480,118 560,122 600,125 600,160 0,160" fill="url(#nordriveCyanGradient)" />
                    <path d="M 0,150 Q 80,140 160,135 T 320,130 T 480,118 T 600,125" fill="none" stroke="#38BDF8" strokeWidth="3" />
                  </svg>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', paddingTop: '10px' }}>
                  <span>Lun</span>
                  <span>Mar</span>
                  <span>Mer</span>
                  <span>Jeu</span>
                  <span>Ven</span>
                  <span>Sam</span>
                  <span>Dim</span>
                </div>
              </div>

              {/* Right 1/3: Alertes Flotte */}
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>Alertes</h3>
                      <span style={{ background: filteredAlerts.length > 0 ? '#0284C7' : '#10B981', color: '#FFF', fontSize: '10px', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {filteredAlerts.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => setActiveFilter('tous')}
                        style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '100px', border: 'none', background: activeFilter === 'tous' ? 'rgba(56, 189, 248, 0.2)' : 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => setActiveFilter('critique')}
                        style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '100px', border: 'none', background: activeFilter === 'critique' ? '#0284C7' : 'transparent', color: '#FFF', cursor: 'pointer' }}
                      >
                        Critique
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredAlerts.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: '#10B981', fontSize: '12.5px', fontWeight: 600 }}>
                        <CheckCircle2 size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                        Toutes les alertes sont traitées !
                      </div>
                    ) : (
                      filteredAlerts.map(alert => (
                        <div
                          key={alert.id}
                          style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <div>
                            <strong style={{ fontSize: '12.5px', color: '#FFF', display: 'block' }}>{alert.title}</strong>
                            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '1px' }}>{alert.vehicle}</span>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '100px', background: alert.badgeBg, color: alert.badgeColor, whiteSpace: 'nowrap' }}>
                            {alert.tag}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─── TAB 2: GESTION DE LA FLOTTE AUTOMOBILE (VOITURES) ──────────── */}
        {activeSidebarTab === 'voitures' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', margin: 0 }}>Flotte Automobile Nordrive</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>{vehicles.length} véhicules enregistrés dans le parc</p>
              </div>

              <button
                onClick={() => setShowAddVehicleModal(true)}
                style={{ padding: '10px 20px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)' }}
              >
                <Plus size={16} /> Ajouter un véhicule
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px' }}>
                <Car size={40} style={{ color: '#38BDF8', margin: '0 auto 16px', opacity: 0.6 }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Aucun véhicule enregistré dans le parc</h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Votre registre de flotte est prêt. Cliquez ci-dessous pour enregistrer le premier véhicule réel de votre parc Nordrive.
                </p>
                <button
                  onClick={() => setShowAddVehicleModal(true)}
                  style={{ padding: '10px 24px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Ajouter mon premier véhicule
                </button>
              </div>
            ) : (
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <th style={{ padding: '14px 20px' }}>Véhicule / Modèle</th>
                      <th style={{ padding: '14px 20px' }}>Immatriculation</th>
                      <th style={{ padding: '14px 20px' }}>Statut</th>
                      <th style={{ padding: '14px 20px' }}>Chauffeur</th>
                      <th style={{ padding: '14px 20px' }}>Tarif/sem.</th>
                      <th style={{ padding: '14px 20px' }}>Kilométrage</th>
                      <th style={{ padding: '14px 20px' }}>Prochain CT</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '16px 20px', color: '#FFF', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Car size={18} style={{ color: '#38BDF8' }} />
                            <div>
                              <div>{v.model}</div>
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Année {v.year}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
                          {v.plate}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <select
                            value={v.status}
                            onChange={(e) => handleUpdateVehicleStatus(v.id, e.target.value as any)}
                            style={{
                              background: v.status === 'en_location' ? 'rgba(16, 185, 129, 0.15)' : v.status === 'disponible' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: v.status === 'en_location' ? '#34D399' : v.status === 'disponible' ? '#38BDF8' : '#F87171',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              padding: '4px 10px',
                              borderRadius: '100px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="disponible">🟢 Disponible</option>
                            <option value="en_location">🔵 En location</option>
                            <option value="en_atelier">🔴 En atelier</option>
                          </select>
                        </td>
                        <td style={{ padding: '16px 20px', color: v.driverName ? '#FFF' : '#64748B' }}>
                          {v.driverName || 'Aucun (Flotte libre)'}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: '#FFF' }}>
                          {v.rentalPriceWeekly} € / sem.
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                          {v.mileage.toLocaleString()} km
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                          {v.nextCtDate}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteVehicle(v.id)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#EF4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: GESTION DES CONTRATS VTC ────────────────────────────── */}
        {activeSidebarTab === 'contrats' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', margin: 0 }}>Gestion des Contrats VTC</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Contrats de rattachement et de mise à disposition de véhicules</p>
              </div>

              <button
                onClick={() => setShowAddContractModal(true)}
                style={{ padding: '10px 20px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)' }}
              >
                <Plus size={16} /> Nouveau Contrat VTC
              </button>
            </div>

            {contracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px' }}>
                <FileText size={40} style={{ color: '#38BDF8', margin: '0 auto 16px', opacity: 0.6 }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Aucun contrat actif</h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Créez un contrat pour associer officiellement un chauffeur à un véhicule de votre flotte Nordrive.
                </p>
                <button
                  onClick={() => setShowAddContractModal(true)}
                  style={{ padding: '10px 24px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Créer mon premier contrat
                </button>
              </div>
            ) : (
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <th style={{ padding: '14px 20px' }}>Chauffeur</th>
                      <th style={{ padding: '14px 20px' }}>Véhicule Associé</th>
                      <th style={{ padding: '14px 20px' }}>Immatriculation</th>
                      <th style={{ padding: '14px 20px' }}>Tarif Hebdo</th>
                      <th style={{ padding: '14px 20px' }}>Date Début</th>
                      <th style={{ padding: '14px 20px' }}>Statut Contrat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '16px 20px', color: '#FFF', fontWeight: 700 }}>
                          {c.driverName}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                          {c.vehicleModel}
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 800, color: '#38BDF8' }}>
                          {c.vehiclePlate}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 900, color: '#34D399' }}>
                          {c.weeklyRate} € / sem.
                        </td>
                        <td style={{ padding: '16px 20px', color: '#64748B' }}>
                          {c.startDate}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
                            Actif ✅
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: MAINTENANCE & RÉVISIONS ────────────────────────────── */}
        {activeSidebarTab === 'maintenance' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', margin: 0 }}>Maintenance & Entretien de Flotte</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Historique des vidanges, freins, pneus et frais de garage</p>
              </div>

              <button
                onClick={() => setShowAddMaintenanceModal(true)}
                style={{ padding: '10px 20px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)' }}
              >
                <Plus size={16} /> Enregistrer une Révision / Entretien
              </button>
            </div>

            {maintenances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px' }}>
                <Wrench size={40} style={{ color: '#F97316', margin: '0 auto 16px', opacity: 0.6 }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Aucune intervention enregistrée</h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Suivez les frais de garage, changements de pneus et vidanges pour maintenir vos véhicules VTC en parfait état.
                </p>
                <button
                  onClick={() => setShowAddMaintenanceModal(true)}
                  style={{ padding: '10px 24px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Enregistrer un entretien
                </button>
              </div>
            ) : (
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <th style={{ padding: '14px 20px' }}>Véhicule</th>
                      <th style={{ padding: '14px 20px' }}>Plaque</th>
                      <th style={{ padding: '14px 20px' }}>Intervention</th>
                      <th style={{ padding: '14px 20px' }}>Coût €</th>
                      <th style={{ padding: '14px 20px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenances.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '16px 20px', color: '#FFF', fontWeight: 700 }}>
                          {m.vehicleModel}
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 800, color: '#38BDF8' }}>
                          {m.vehiclePlate}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                          {m.type}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 900, color: '#EF4444' }}>
                          {m.cost} €
                        </td>
                        <td style={{ padding: '16px 20px', color: '#64748B' }}>
                          {m.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: GESTION DES AMENDES & PV ANTAI ──────────────────────── */}
        {activeSidebarTab === 'amendes' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', margin: 0 }}>Gestion des Amendes & PV ANTAI</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Enregistrement et transfert de responsabilité des contraventions aux chauffeurs</p>
              </div>

              <button
                onClick={() => setShowAddFineModal(true)}
                style={{ padding: '10px 20px', borderRadius: '100px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', color: '#FFF', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)' }}
              >
                <Plus size={16} /> Enregistrer un PV / Amende
              </button>
            </div>

            {fines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px' }}>
                <AlertTriangle size={40} style={{ color: '#10B981', margin: '0 auto 16px', opacity: 0.6 }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Aucune amende enregistrée</h3>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Votre registre de PV est vierge. Enregistrez une contravention dès sa réception pour la désigner ou la contester sur ANTAI.
                </p>
                <button
                  onClick={() => setShowAddFineModal(true)}
                  style={{ padding: '10px 24px', borderRadius: '100px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Enregistrer mon premier PV
                </button>
              </div>
            ) : (
              <div style={{ background: '#0A1020', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '20px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <th style={{ padding: '14px 20px' }}>Plaque</th>
                      <th style={{ padding: '14px 20px' }}>Chauffeur Présumé</th>
                      <th style={{ padding: '14px 20px' }}>Motif / Infraction</th>
                      <th style={{ padding: '14px 20px' }}>Lieu</th>
                      <th style={{ padding: '14px 20px' }}>Montant</th>
                      <th style={{ padding: '14px 20px' }}>Date</th>
                      <th style={{ padding: '14px 20px' }}>Statut Traitement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 800, color: '#38BDF8' }}>
                          {f.plate}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#FFF', fontWeight: 700 }}>
                          {f.driverName || 'En recherche...'}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                          {f.reason}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#64748B' }}>
                          {f.location || 'N/C'}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 900, color: '#EF4444' }}>
                          {f.amount} €
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                          {f.date}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <select
                            value={f.status}
                            onChange={(e) => handleUpdateFineStatus(f.id, e.target.value as any)}
                            style={{
                              background: f.status === 'a_traiter' ? 'rgba(239, 68, 68, 0.15)' : f.status === 'contestee' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: f.status === 'a_traiter' ? '#EF4444' : f.status === 'contestee' ? '#F59E0B' : '#34D399',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              padding: '4px 10px',
                              borderRadius: '100px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="a_traiter">🔴 À traiter</option>
                            <option value="contestee">🟡 Transféré ANTAI (Contesté)</option>
                            <option value="payee_chauffeur">🟢 Payé par Chauffeur</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── MODAL ADD VEHICLE ────────────────────────────────────────────── */}
      {showAddVehicleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#0A1020', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0 }}>Ajouter un Véhicule à la Flotte</h3>
              <button onClick={() => setShowAddVehicleModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Modèle & Marque *</label>
                <input type="text" required placeholder="Ex: Tesla Model 3, BMW X5..." value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Immatriculation *</label>
                  <input type="text" required placeholder="FX-892-KL" value={newVehicle.plate} onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Année</label>
                  <input type="number" value={newVehicle.year} onChange={e => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Prix Location / sem (€)</label>
                  <input type="number" value={newVehicle.rentalPriceWeekly} onChange={e => setNewVehicle({ ...newVehicle, rentalPriceWeekly: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '100px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Kilométrage (km)</label>
                  <input type="number" value={newVehicle.mileage} onChange={e => setNewVehicle({ ...newVehicle, mileage: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '100px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <button type="submit" style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', border: 'none', borderRadius: '100px', color: '#FFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}>
                Enregistrer le véhicule dans l'ERP →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL ADD FINE ────────────────────────────────────────────────── */}
      {showAddFineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#0A1020', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0 }}>Enregistrer une Amende / PV</h3>
              <button onClick={() => setShowAddFineModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddFineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Immatriculation *</label>
                  <input type="text" required placeholder="FX-892-KL" value={newFine.plate} onChange={e => setNewFine({ ...newFine, plate: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Nom Chauffeur</label>
                  <input type="text" placeholder="Nom du chauffeur" value={newFine.driverName} onChange={e => setNewFine({ ...newFine, driverName: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Montant PV (€) *</label>
                  <input type="number" required value={newFine.amount} onChange={e => setNewFine({ ...newFine, amount: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Lieu Infraction</label>
                  <input type="text" placeholder="Lieu de la contravention" value={newFine.location} onChange={e => setNewFine({ ...newFine, location: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Motif de la contravention</label>
                <input type="text" required placeholder="Excès de vitesse < 20 km/h..." value={newFine.reason} onChange={e => setNewFine({ ...newFine, reason: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
              </div>

              <button type="submit" style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', border: 'none', borderRadius: '100px', color: '#FFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
                Enregistrer l'amende dans le registre →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL ADD CONTRACT ────────────────────────────────────────────── */}
      {showAddContractModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#0A1020', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0 }}>Nouveau Contrat VTC</h3>
              <button onClick={() => setShowAddContractModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddContractSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Nom du Chauffeur *</label>
                <input type="text" required placeholder="Ex: Jean Dupont" value={newContract.driverName} onChange={e => setNewContract({ ...newContract, driverName: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Modèle Véhicule *</label>
                  <input type="text" required placeholder="Tesla Model 3" value={newContract.vehicleModel} onChange={e => setNewContract({ ...newContract, vehicleModel: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Immatriculation *</label>
                  <input type="text" required placeholder="FX-892-KL" value={newContract.vehiclePlate} onChange={e => setNewContract({ ...newContract, vehiclePlate: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Tarif Hebdo (€)</label>
                  <input type="number" value={newContract.weeklyRate} onChange={e => setNewContract({ ...newContract, weeklyRate: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '100px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Date Début</label>
                  <input type="date" value={newContract.startDate} onChange={e => setNewContract({ ...newContract, startDate: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '100px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <button type="submit" style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', border: 'none', borderRadius: '100px', color: '#FFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}>
                Créer et valider le contrat →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL ADD MAINTENANCE ────────────────────────────────────────── */}
      {showAddMaintenanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#0A1020', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', margin: 0 }}>Enregistrer un Entretien / Maintenance</h3>
              <button onClick={() => setShowAddMaintenanceModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddMaintenanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Modèle Véhicule *</label>
                  <input type="text" required placeholder="Tesla Model 3" value={newMaintenance.vehicleModel} onChange={e => setNewMaintenance({ ...newMaintenance, vehicleModel: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Immatriculation *</label>
                  <input type="text" required placeholder="FX-892-KL" value={newMaintenance.vehiclePlate} onChange={e => setNewMaintenance({ ...newMaintenance, vehiclePlate: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Intervention</label>
                  <input type="text" required value={newMaintenance.type} onChange={e => setNewMaintenance({ ...newMaintenance, type: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '100px', color: '#FFF', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Coût (€)</label>
                  <input type="number" value={newMaintenance.cost} onChange={e => setNewMaintenance({ ...newMaintenance, cost: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '100px', color: '#FFF', outline: 'none' }} />
                </div>
              </div>

              <button type="submit" style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)', border: 'none', borderRadius: '100px', color: '#FFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}>
                Consigner l'intervention →
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
