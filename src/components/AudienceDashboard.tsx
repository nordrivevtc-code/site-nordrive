import React, { useMemo } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import type { Driver, DriverStatus } from '../types/fleet';
import { analyticsStatus } from '../lib/analytics';

const DAY = 86_400_000;

const STATUS_LABELS: Array<[DriverStatus, string]> = [
  ['nouveau_prospect', 'Nouveaux'],
  ['contact_initial', 'Contactés'],
  ['docs_en_attente', 'Documents en attente'],
  ['docs_recus', 'Documents reçus'],
  ['rattache', 'Rattachés'],
  ['actif', 'Actifs'],
];

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  padding: 20,
};
const h3: React.CSSProperties = { margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: '#fff' };
const muted: React.CSSProperties = { color: '#94A3B8', fontSize: 13, lineHeight: 1.55 };

function Bars({ rows, color = '#E5C158' }: { rows: Array<[string, number]>; color?: string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (rows.length === 0) return <p style={muted}>Pas encore de données.</p>;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map(([label, n]) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#E2E8F0', marginBottom: 4 }}>
            <span>{label}</span><strong>{n}</strong>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: `${(n / max) * 100}%`, height: '100%', borderRadius: 99, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export const AudienceDashboard: React.FC<{ drivers: Driver[] }> = ({ drivers }) => {
  const status = analyticsStatus();

  const stats = useMemo(() => {
    const now = Date.now();
    const times = drivers.map((d) => ({ d, t: new Date(d.createdAt).getTime() })).filter((x) => Number.isFinite(x.t));
    const within = (days: number) => times.filter((x) => now - x.t <= days * DAY).length;

    // 30 derniers jours
    const perDay = Array.from({ length: 30 }, (_, i) => {
      const start = new Date(now - (29 - i) * DAY);
      start.setHours(0, 0, 0, 0);
      const end = start.getTime() + DAY;
      return {
        label: start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        count: times.filter((x) => x.t >= start.getTime() && x.t < end).length,
      };
    });

    const tally = (key: (d: Driver) => string | undefined, limit = 8): Array<[string, number]> => {
      const m = new Map<string, number>();
      for (const { d } of times) {
        const k = key(d);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    };

    const rattaches = drivers.filter((d) => d.status === 'rattache' || d.status === 'actif').length;
    return {
      total: drivers.length,
      d1: within(1),
      d7: within(7),
      d30: within(30),
      rate: drivers.length ? Math.round((rattaches / drivers.length) * 100) : 0,
      perDay,
      sources: tally((d) => d.source ?? 'Non renseignée'),
      cities: tally((d) => d.city?.split(/[(&,]/)[0].trim() || undefined, 5),
      funnel: STATUS_LABELS.map(([s, label]) => [label, drivers.filter((d) => d.status === s).length] as [string, number]),
    };
  }, [drivers]);

  const maxDay = Math.max(1, ...stats.perDay.map((x) => x.count));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px', display: 'grid', gap: 20, color: '#E2E8F0' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff' }}>Statistiques du site</h1>
        <p style={{ ...muted, margin: '6px 0 0' }}>Visiteurs, provenance et inscriptions. Aucune donnée personnelle n'est envoyée à l'outil de mesure.</p>
      </div>

      {/* ───── Visiteurs : tableau de bord de l'outil de mesure ───── */}
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h2 style={{ ...h3, margin: 0 }}>Visiteurs et provenance</h2>
          <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: status.provider ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: status.provider ? '#34D399' : '#FBBF24' }}>
            {status.provider ? `Mesure active : ${status.provider}` : 'Mesure non configurée'}
          </span>
        </div>

        {status.dashboardUrl ? (
          <>
            <iframe
              title="Tableau de bord des visiteurs"
              src={status.dashboardUrl}
              style={{ width: '100%', height: 760, border: 0, borderRadius: 12, background: '#fff' }}
              loading="lazy"
            />
            <p style={{ ...muted, margin: '12px 0 0' }}>
              Si l'affichage reste vide (certains outils interdisent l'intégration), ouvrez-le directement :{' '}
              <a href={status.dashboardUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#E5C158', fontWeight: 800 }}>
                ouvrir le tableau de bord <ExternalLink size={13} style={{ verticalAlign: '-2px' }} />
              </a>
            </p>
          </>
        ) : (
          <div style={{ ...muted, display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, display: 'flex', gap: 8, color: '#E2E8F0' }}><Info size={18} style={{ flex: 'none', color: '#E5C158' }} /> Pour voir ici le nombre de visiteurs, d'où ils viennent (Google, ChatGPT, WhatsApp…), leurs pays, appareils et pages vues :</p>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Créez un compte <strong>Umami</strong> (cloud.umami.is) ou <strong>Plausible</strong> (plausible.io) et ajoutez le site <code>nordrive-flotte.com</code>.</li>
              <li>Dans le fichier <code>.env.local</code> du projet, ajoutez <code>VITE_UMAMI_WEBSITE_ID=…</code> (Umami) <em>ou</em> <code>VITE_PLAUSIBLE_DOMAIN=nordrive-flotte.com</code> (Plausible).</li>
              <li>Créez un lien de partage dans l'outil et placez-le dans <code>VITE_ANALYTICS_DASHBOARD_URL=…</code> : le tableau de bord s'affichera ici.</li>
              <li>Relancez <code>npm run build</code> puis renvoyez le site sur OVH.</li>
            </ol>
          </div>
        )}
      </section>

      {/* ───── Inscriptions (CRM) ───── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {[
          ['Inscrits (24 h)', stats.d1],
          ['Inscrits (7 jours)', stats.d7],
          ['Inscrits (30 jours)', stats.d30],
          ['Total dans le CRM', stats.total],
          ['Taux de rattachement', `${stats.rate} %`],
        ].map(([label, value]) => (
          <div key={label as string} style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={card}>
        <h2 style={h3}>Inscriptions par jour (30 derniers jours)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }} role="img" aria-label="Graphique des inscriptions par jour">
          {stats.perDay.map((x) => (
            <div key={x.label} title={`${x.label} : ${x.count}`} style={{ flex: 1, height: `${Math.max(3, (x.count / maxDay) * 100)}%`, background: x.count ? '#E5C158' : 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...muted, marginTop: 6 }}>
          <span>{stats.perDay[0].label}</span><span>{stats.perDay[29].label}</span>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div style={card}>
          <h2 style={h3}>D'où viennent vos inscrits</h2>
          <Bars rows={stats.sources} />
          <p style={{ ...muted, margin: '12px 0 0' }}>Source enregistrée à l'inscription (lien utm, site référent). « Direct » : adresse tapée, favori ou source inconnue.</p>
        </div>
        <div style={card}>
          <h2 style={h3}>Parcours des chauffeurs (CRM)</h2>
          <Bars rows={stats.funnel} color="#38BDF8" />
        </div>
        <div style={card}>
          <h2 style={h3}>Villes les plus fréquentes</h2>
          <Bars rows={stats.cities} color="#34D399" />
        </div>
      </section>

      <p style={{ ...muted, margin: 0 }}>
        Ces chiffres viennent des chauffeurs enregistrés dans le CRM (y compris d'éventuels chauffeurs d'exemple). Pour suivre l'entonnoir
        « visiteur → formulaire vu → formulaire démarré → envoyé », utilisez les événements de l'outil de mesure
        (Formulaire vu, Formulaire démarré, Formulaire envoyé, Clic WhatsApp).
      </p>
    </div>
  );
};
