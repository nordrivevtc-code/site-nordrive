import React from 'react';
import { 
  Cpu, 
  Zap, 
  Code2, 
  ExternalLink, 
  CheckCircle2
} from 'lucide-react';

export const ApiIntegrationGuide: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 animate-fade-in space-y-8">
      
      {/* Header */}
      <div className="glass-panel p-6 md:p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
          <Cpu className="w-3.5 h-3.5" /> Architecture Technique Production
        </div>
        <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">
          Guide d'Automatisation & Connexion API <span className="text-amber-400">Uber, Bolt & Heetch</span>
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed max-w-3xl">
          Voici comment fonctionne l'automatisation complète de votre flotte VTC. En production, les données de courses et de chiffre d'affaires peuvent être récupérées quotidiennement selon 3 méthodes complémentaires.
        </p>
      </div>

      {/* 3 Integration Methods Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Method 1: Uber Supplier API */}
        <div className="glass-card p-6 border-t-4 border-t-amber-400">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/20 flex items-center justify-center font-black text-amber-400">
              UBER
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Uber Supplier Fleet API</h3>
              <span className="text-[11px] text-emerald-400 font-semibold">API Officielle OAuth2</span>
            </div>
          </div>
          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            Uber met à disposition des gestionnaires de flotte agréés une API officielle pour consulter en temps réel l'activité et le relevé de paie.
          </p>
          <ul className="text-xs space-y-2 text-gray-400 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Endpoint: <code className="text-indigo-300 bg-white/5 px-1 rounded">GET /v1/suppliers/drivers</code></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Relevés de gains bruts & nets chaque nuit</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Synchronisation automatique des statut chauffeurs</span>
            </li>
          </ul>
          <a
            href="https://developer.uber.com/docs/suppliers/references/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1"
          >
            <span>Voir la documentation Uber Developer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Method 2: Bolt Fleet API & Webhook */}
        <div className="glass-card p-6 border-t-4 border-t-emerald-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center font-extrabold text-emerald-400">
              BOLT
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Bolt Fleet Partner Portal</h3>
              <span className="text-[11px] text-emerald-400 font-semibold">API & Reports Automatisés</span>
            </div>
          </div>
          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            Bolt propose l'accès partenaire flotte avec l'export automatique des fichiers de paie hebdomadaires par email ou via leur API Flotte.
          </p>
          <ul className="text-xs space-y-2 text-gray-400 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Récupération automatique du rapport le lundi</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Matching automatique par N° SIREN ou Email</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Déduction automatique des bonus flotte Bolt</span>
            </li>
          </ul>
          <span className="text-xs text-emerald-400 font-bold">Compatible avec l'importateur CSV intégré.</span>
        </div>

        {/* Method 3: Cron Job & Automated Payroll Trigger */}
        <div className="glass-card p-6 border-t-4 border-t-indigo-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Robot de Paie (Cron Scheduled)</h3>
              <span className="text-[11px] text-indigo-300 font-semibold">Exécution automatique 7j/7</span>
            </div>
          </div>
          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            Un script planifié (Cron) tourne chaque jour à minuit pour recalculer le Net à payer au chauffeur et notifier sur WhatsApp.
          </p>
          <ul className="text-xs space-y-2 text-gray-400 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Calcul du CA brut consolidé</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Soustraction des frais de flotte (50€/semaine active, 0€ si 0€ de CA)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Ordre de virement bancaire SEPA auto-généré</span>
            </li>
          </ul>
          <span className="text-xs text-indigo-400 font-bold">Zéro saisie manuelle requise.</span>
        </div>

      </div>

      {/* Code Snippet Example */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-indigo-400" />
          Exemple de script d'automatisation Node.js (Calcul & Virement Auto)
        </h3>
        <div className="bg-[#0b101c] p-4 rounded-xl border border-white/10 font-mono text-xs text-gray-300 overflow-x-auto">
          <pre>{`// Example: Serverless function running every Monday at 06:00 AM
async function processWeeklyFleetPayroll() {
  const drivers = await db.getDrivers({ status: 'actif' });

  for (const driver of drivers) {
    // 1. Fetch earnings from Uber Fleet API & Bolt Fleet API
    const uberEarnings = await uberFleetApi.getWeeklyReport(driver.vtcCardNumber);
    const boltEarnings = await boltFleetApi.getWeeklyReport(driver.email);

    const totalBrut = uberEarnings.brut + boltEarnings.brut;
    const weeklyFee = driver.fixedWeeklyFee || 50;
    const fleetFee = totalBrut > 0 ? Math.min(weeklyFee, totalBrut) : 0;
    const netPayout = totalBrut - uberEarnings.fees - fleetFee;

    // 2. Trigger Bank SEPA Payout / Instant Transfer API
    const payoutResult = await bankApi.createTransfer({
      iban: driver.iban,
      amount: netPayout,
      reason: \`Paie VTC Semaine \${currentWeek}\`
    });

    // 3. Send automatic WhatsApp notification to driver
    await whatsapp.sendMessage({
      to: driver.phone,
      text: \`Bonjour \${driver.firstName}, votre paie VTC de \${netPayout.toFixed(2)}€ a été transférée !\`
    });
  }
}`}</pre>
        </div>
      </div>

    </div>
  );
};
