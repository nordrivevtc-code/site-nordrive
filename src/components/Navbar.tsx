import React from 'react';
import { 
  Car, 
  Users, 
  Calculator, 
  Cpu, 
  MessageSquare, 
  Sparkles,
  TrendingUp,
  Compass,
  Settings
} from 'lucide-react';
import type { Driver, DriverPayrollWeek } from '../types/fleet';

interface NavbarProps {
  activeTab: 'site_public' | 'crm_chauffeurs' | 'statistiques' | 'comptabilite_paie' | 'guide_api' | 'parametres_api';
  setActiveTab: (tab: 'site_public' | 'crm_chauffeurs' | 'statistiques' | 'comptabilite_paie' | 'guide_api' | 'parametres_api') => void;
  drivers: Driver[];
  payrollWeeks: DriverPayrollWeek[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  drivers,
  payrollWeeks
}) => {
  const leadsCount = drivers.filter(d => d.status === 'nouveau_prospect' || d.status === 'docs_en_attente' || d.status === 'docs_recus').length;
  
  // Calculate total turnover for the current week
  const totalTurnover = payrollWeeks.reduce((sum, p) => sum + p.earnings.totalBrut, 0);

  return (
    <header className="dd-header">
      <div className="dd-header-inner">
        
        {/* Nordrive Brand Logo */}
        <div className="dd-logo-box" onClick={() => setActiveTab('site_public')}>
          <div className="dd-logo-icon">
            <Compass size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#FFF' }}>
                Nor<span style={{ color: '#38BDF8' }}>drive</span>
              </span>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#7DD3FC', border: '1px solid rgba(56, 189, 248, 0.35)', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={10} /> ❄️ FLOTTE NORDIQUE
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block' }}>L'Excellence du Nord • Rattachement VTC Agréé</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="dd-nav-tabs">
          <button
            onClick={() => setActiveTab('site_public')}
            className={`dd-nav-tab ${activeTab === 'site_public' ? 'active' : ''}`}
          >
            <Car size={16} />
            <span>Site Nordrive</span>
          </button>

          <button
            onClick={() => setActiveTab('crm_chauffeurs')}
            className={`dd-nav-tab ${activeTab === 'crm_chauffeurs' ? 'active' : ''}`}
          >
            <Users size={16} />
            <span>Espace CRM Flotte</span>
            {leadsCount > 0 && (
              <span style={{ background: '#F59E0B', color: '#000', fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '9999px', marginLeft: '4px' }}>
                {leadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('statistiques')}
            className={`dd-nav-tab ${activeTab === 'statistiques' ? 'active' : ''}`}
          >
            <TrendingUp size={16} />
            <span>Statistiques</span>
          </button>

          <button
            onClick={() => setActiveTab('comptabilite_paie')}
            className={`dd-nav-tab ${activeTab === 'comptabilite_paie' ? 'active' : ''}`}
          >
            <Calculator size={16} />
            <span>Comptabilité & Paie</span>
          </button>

          <button
            onClick={() => setActiveTab('guide_api')}
            className={`dd-nav-tab ${activeTab === 'guide_api' ? 'active' : ''}`}
          >
            <Cpu size={16} />
            <span>Guide API</span>
          </button>

          <button
            onClick={() => setActiveTab('parametres_api')}
            className={`dd-nav-tab ${activeTab === 'parametres_api' ? 'active' : ''}`}
          >
            <Settings size={16} />
            <span>Paramètres API</span>
          </button>
        </nav>

        {/* Quick Fleet Metrics Summary */}
        <div className="dd-header-stats">
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: '#10B981' }} />
            <div style={{ fontSize: '11px' }}>
              <span style={{ color: '#9CA3AF', display: 'block', fontSize: '10px', lineHeight: 1 }}>CA Semaine</span>
              <strong style={{ color: '#10B981' }}>{totalTurnover.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong>
            </div>
          </div>

          <a
            href="https://wa.me/33743767400"
            target="_blank"
            rel="noopener noreferrer"
            className="dd-btn dd-btn-whatsapp"
            style={{ padding: '8px 14px', fontSize: '12px' }}
            title="Support Nordrive WhatsApp"
          >
            <MessageSquare size={14} />
            <span>WhatsApp</span>
          </a>
        </div>

      </div>
    </header>
  );
};
