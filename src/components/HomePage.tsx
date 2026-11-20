import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarCheck, Car, MessageSquare, Wallet } from 'lucide-react';
import { trackOnce } from '../lib/analytics';
import './home.css';

interface HomePageProps {
  /** Formulaire de rattachement (rendu par PublicPortal, qui porte toute la logique d'envoi) */
  form: React.ReactNode;
  faq: Array<{ q: string; a: string }>;
  onNavigate: (e: React.MouseEvent<HTMLAnchorElement>, path: string) => void;
  onScrollTo: (e: React.MouseEvent<HTMLElement>, sectionId: string) => void;
}

const WA_BASE = 'https://wa.me/33743767400';
const WA_JOIN = `${WA_BASE}?text=${encodeURIComponent('Bonjour Nordrive, je souhaite rejoindre la flotte (50€/semaine).')}`;
const WA_QUESTION = `${WA_BASE}?text=${encodeURIComponent("Bonjour Nordrive, j'ai une question sur le rattachement.")}`;

const WEEKLY_FEE = 50;
const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

export const HomePage: React.FC<HomePageProps> = ({ form, faq, onNavigate, onScrollTo }) => {
  const [weeklyTurnover, setWeeklyTurnover] = useState<number>(1000);
  const fee = weeklyTurnover > 0 ? WEEKLY_FEE : 0;
  const net = Math.max(0, weeklyTurnover - fee);

  // Mesure : le formulaire a-t-il été vu par le visiteur ? (une seule fois par visite)
  const formSection = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = formSection.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackOnce('form-view', 'Formulaire vu');
          observer.disconnect();
        }
      },
      // 10 % suffisent : la section est très haute, 25 % ne seraient jamais visibles sur un petit écran
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="nh">
      {/* ───────── 1. HERO (sombre) : une promesse, une action ───────── */}
      <section className="nh-hero" data-zone="hero" aria-labelledby="nh-title">
        <div className="nh-wrap">
          <span className="nh-pill"><span className="nh-dot" aria-hidden="true" /> Flotte VTC agréée</span>
          <h1 id="nh-title" className="nh-h1">
            Roulez libre.<br />
            Gardez <em>tout votre CA.</em>
          </h1>
          <p className="nh-lead">
            <strong>50 € par semaine travaillée, 0 € si vous ne roulez pas.</strong> Aucune commission, virement chaque lundi.
          </p>

          <div className="nh-cta">
            <a href="#formulaire" className="nh-btn nh-btn--gold" onClick={(e) => onScrollTo(e, 'formulaire')}>
              Je me rattache en 2 min <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href={WA_JOIN} target="_blank" rel="noopener noreferrer" className="nh-textlink">
              <MessageSquare size={16} aria-hidden="true" /> ou écrire sur WhatsApp
            </a>
          </div>

          <div className="nh-stats">
            <div className="nh-stat"><b>50 €</b><span>par semaine travaillée</span></div>
            <div className="nh-stat"><b>0 %</b><span>de commission</span></div>
            <div className="nh-stat"><b>1 h</b><span>pour votre macaron</span></div>
          </div>
          <p className="nh-apps">Sur <strong>Uber</strong>, <strong>Bolt</strong> et <strong>Heetch</strong> · véhicules +12 ans acceptés</p>
        </div>
      </section>

      {/* ───────── 2. AVANTAGES + GAINS (bande claire) ───────── */}
      <section id="calcul-gains" className="nh-section nh-light" aria-labelledby="nh-why">
        <div className="nh-wrap">
          <div className="nh-head nh-center">
            <span className="nh-eyebrow">Pourquoi Nordrive</span>
            <h2 id="nh-why" className="nh-h2">Simple, clair, sans surprise</h2>
          </div>

          <div className="nh-grid-3">
            <article className="nh-card">
              <div className="nh-ico"><Wallet size={24} aria-hidden="true" /></div>
              <h3>50 € fixes, 0 % de commission</h3>
              <p>Vous ne payez que les semaines où vous roulez. Le reste de votre CA est à vous.</p>
            </article>
            <article className="nh-card">
              <div className="nh-ico"><CalendarCheck size={24} aria-hidden="true" /></div>
              <h3>Payé chaque lundi</h3>
              <p>Vos gains Uber, Bolt et Heetch sont regroupés, puis virés sur votre compte.</p>
            </article>
            <article className="nh-card">
              <div className="nh-ico"><Car size={24} aria-hidden="true" /></div>
              <h3>Véhicules +12 ans acceptés</h3>
              <p>Contrat CDI ou CDD, fiche de paie et macaron VTC en moins d'1h.</p>
            </article>
          </div>

          <div className="nh-calc-wrap">
            <div>
              <span className="nh-eyebrow">Vos gains</span>
              <h2 className="nh-h2">Combien vous gardez ?</h2>
              <p className="nh-lead">Déplacez le curseur sur votre chiffre d'affaires de la semaine : seuls 50 € sont prélevés.</p>
              <p style={{ margin: '18px 0 0' }}>
                <a href="/simulateur" className="nh-textlink" onClick={(e) => onNavigate(e, '/simulateur')}>
                  Comparer avec un statut indépendant <ArrowRight size={16} aria-hidden="true" />
                </a>
              </p>
            </div>

            <div className="nh-calc-card">
              <label className="nh-calc-label" htmlFor="nh-ca">
                <span>CA de la semaine</span>
                <b>{eur(weeklyTurnover)}</b>
              </label>
              <input
                id="nh-ca"
                className="nh-range"
                type="range"
                min={0}
                max={2500}
                step={50}
                value={weeklyTurnover}
                onChange={(e) => {
                  setWeeklyTurnover(Number(e.target.value));
                  trackOnce('simulator', 'Simulateur utilisé');
                }}
              />
              <div className="nh-range-scale" aria-hidden="true"><span>0 €</span><span>2 500 €</span></div>

              <div className="nh-result" aria-live="polite">
                <small>Dans votre poche</small>
                <b>{eur(net)}</b>
                <span>{fee === 0 ? 'Aucun frais cette semaine' : `après ${eur(fee)} de frais Nordrive`}</span>
              </div>
              <p className="nh-calc-foot">Montants indicatifs, avant carburant et charges du véhicule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 3. FORMULAIRE (sombre) : étapes + dossier ───────── */}
      <section id="formulaire" ref={formSection} className="nh-section" aria-labelledby="nh-join">
        <div className="nh-wrap nh-form-grid">
          <div className="nh-sticky">
            <span className="nh-eyebrow">Rejoindre la flotte</span>
            <h2 id="nh-join" className="nh-h2">Votre dossier en 2 minutes</h2>
            <ol className="nh-steps">
              <li><span className="nh-step-n">1</span><div><b>Vous remplissez 4 champs</b><span>Les documents peuvent suivre sur WhatsApp.</span></div></li>
              <li><span className="nh-step-n">2</span><div><b>Un conseiller vous répond</b><span>Sous 1h, 7j/7, pour valider votre dossier.</span></div></li>
              <li><span className="nh-step-n">3</span><div><b>Vous roulez</b><span>Macaron et contrat en main, sans engagement.</span></div></li>
            </ol>
            <a href={WA_QUESTION} target="_blank" rel="noopener noreferrer" className="nh-btn nh-btn--ghost">
              <MessageSquare size={18} aria-hidden="true" /> Une question ? WhatsApp
            </a>
          </div>
          <div>{form}</div>
        </div>
      </section>

      {/* ───────── 4. FAQ (bande claire) ───────── */}
      <section id="faq" className="nh-section nh-light" aria-labelledby="nh-faq">
        <div className="nh-wrap nh-narrow">
          <div className="nh-head nh-center">
            <span className="nh-eyebrow">Questions fréquentes</span>
            <h2 id="nh-faq" className="nh-h2">Vous vous demandez…</h2>
          </div>
          <div className="nh-faq">
            {faq.slice(0, 4).map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <div className="nh-faq-foot">
            <a href="/faq" className="nh-textlink" onClick={(e) => onNavigate(e, '/faq')}>
              Toutes les questions <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/parrainage" className="nh-textlink" onClick={(e) => onNavigate(e, '/parrainage')}>
              Parrainage : jusqu'à 200 € <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
