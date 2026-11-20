import React, { useState } from 'react';
import { ArrowRight, Award, CheckCircle2, Mail, MapPin, MessageSquare, Phone, Send, Users, Gift } from 'lucide-react';
import './home.css';

type Nav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => void;

const WA = 'https://wa.me/33743767400';

/* ───────── En-tête commun des sous-pages (bandeau sombre) ───────── */
const PageHero: React.FC<{ eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; onNavigate: Nav; children?: React.ReactNode }> = ({
  eyebrow,
  title,
  lead,
  onNavigate,
  children,
}) => (
  <section className="nh-subhero">
    <div className="nh-wrap nh-narrow">
      <a href="/" className="nh-back" onClick={(e) => onNavigate(e, '/')}>← Accueil</a>
      <span className="nh-eyebrow">{eyebrow}</span>
      <h1 className="nh-h1 nh-h1--sub">{title}</h1>
      {lead && <p className="nh-lead">{lead}</p>}
      {children}
    </div>
  </section>
);

/* ═════════════════════ PAGE INTROUVABLE (404) ═════════════════════ */
export const NotFoundPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="nh">
    <PageHero
      eyebrow="Erreur 404"
      title={<>Page <em>introuvable</em></>}
      lead="Cette page n'existe pas ou a été déplacée. Retournez à l'accueil pour rejoindre la flotte Nordrive."
      onNavigate={onNavigate}
    >
      <div className="nh-cta">
        <a href="/" className="nh-btn nh-btn--gold" onClick={(e) => onNavigate(e, '/')}>
          Retour à l'accueil <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
    </PageHero>
  </div>
);

/* ═════════════════════ COMPARATIF ═════════════════════ */
export const ComparatifPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="nh">
    <PageHero
      eyebrow="Comparaison"
      title={<>Le Chaos de la Plaine vs <em>Le Sommet Nordrive</em></>}
      lead="Voyez concrètement comment Nordrive transforme le cauchemar administratif en simplicité absolue."
      onNavigate={onNavigate}
    />
    <section id="comparatif" className="nh-section nh-light">
      <div className="nh-wrap nh-cmp">
        <article className="nh-cmp-card nh-cmp-card--bad">
          <span className="nh-tag nh-tag--bad">Le statut indépendant classique</span>
          <h2>Le cauchemar des démarches obligatoires</h2>
          <ul>
            <li><b>URSSAF & Charges</b><span>Déclaration mensuelle complexe, majorations de retard, calculs compliqués de TVA.</span></li>
            <li><b>Zéro Protection Sociale</b><span>Aucun droit au chômage, mutuelle onéreuse et absence de fiche de paie officielle.</span></li>
            <li><b>Trésorerie & Risques</b><span>Responsabilité personnelle directe en cas de contrôle ou de litige.</span></li>
            <li><b>Support & Comptabilité</b><span>Comptable obligatoire (~2 000€/an), frais bancaires professionnels supplémentaires.</span></li>
          </ul>
        </article>
        <article className="nh-cmp-card nh-cmp-card--good">
          <span className="nh-tag nh-tag--good">Le statut de rattaché Nordrive</span>
          <h2>Le confort du statut salarié</h2>
          <ul>
            <li><b>Zéro Administration</b><span>Nordrive gère 100% de la facturation, déclarations sociales et déclarations fiscales.</span></li>
            <li><b>Vrai Contrat CDI</b><span>Bulletins de paie officiels édités chaque mois en toute conformité.</span></li>
            <li><b>Protection Intégrale</b><span>Mutuelle de flotte incluse, assurance responsabilité professionnelle couverte, cumul de retraite.</span></li>
            <li><b>Versement Garanti le Lundi</b><span>Paiement hebdomadaire de votre salaire net par virement automatique sur votre compte.</span></li>
          </ul>
        </article>
      </div>
    </section>
    <section className="nh-section nh-cta-band">
      <div className="nh-wrap nh-narrow nh-center">
        <h2 className="nh-h2">Prêt à passer au statut sans paperasse ?</h2>
        <div className="nh-cta">
          <a href="/#formulaire" className="nh-btn nh-btn--gold" onClick={(e) => onNavigate(e, '/')}>
            Je me rattache en 2 min <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  </div>
);

/* ═════════════════════ ASSURANCE ═════════════════════ */
export const AssurancePage: React.FC<{ form: React.ReactNode; onNavigate: Nav }> = ({ form, onNavigate }) => (
  <div className="nh">
    <PageHero
      eyebrow="Service assurance VTC & RC circulation"
      title={<>Obtenez votre Tarif d'Assurance VTC <em>en 1h</em></>}
      lead={<>Remplissez le formulaire et joignez vos 3 documents (<strong>Carte Grise</strong>, <strong>Permis de conduire</strong> et <strong>Relevé d'information +36 mois</strong>). Vous recevrez votre devis sur <strong>WhatsApp</strong> et par <strong>e-mail</strong>.</>}
      onNavigate={onNavigate}
    />
    <section className="nh-section nh-light">
      <div className="nh-wrap">
        <div className="nh-head nh-center">
          <span className="nh-eyebrow">Les formules</span>
          <h2 className="nh-h2">Choisissez la couverture qui vous correspond</h2>
        </div>
        <div className="nh-grid-3">
          <article className="nh-card"><h3>RC Circulation Pro</h3><p>Transport de personnes : la responsabilité civile liée à votre activité de chauffeur VTC.</p></article>
          <article className="nh-card"><h3>Assurance Véhicule Flotte VTC</h3><p>Une assurance adaptée aux véhicules circulant au sein de la flotte.</p></article>
          <article className="nh-card"><h3>Assurance Tout Risque VTC</h3><p>Une couverture étendue pour votre véhicule utilisé en VTC.</p></article>
        </div>
      </div>
    </section>
    <section id="assurance" className="nh-section">
      <div className="nh-wrap nh-narrow">{form}</div>
    </section>
  </div>
);

/* ═════════════════════ SIMULATEUR ═════════════════════ */
const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

export const SimulatorPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<'semaine' | 'mois'>('semaine');
  const [weekly, setWeekly] = useState(1000);
  const [monthly, setMonthly] = useState(4000);

  const autoWeek = Math.round(weekly * 0.71);
  const fleetWeek = Math.max(0, weekly - (weekly > 0 ? 50 : 0));
  const gainWeek = fleetWeek - autoWeek;
  const autoMonth = Math.round(monthly * 0.71);
  const fleetMonth = Math.max(0, monthly - (monthly > 0 ? 200 : 0));
  const gainMonth = fleetMonth - autoMonth;

  const isWeek = period === 'semaine';
  const presets = isWeek ? [500, 800, 1200, 1600, 2000] : [2000, 3200, 4800, 6400, 8000];

  return (
    <div className="nh">
      <PageHero
        eyebrow="Simulateur Nordrive"
        title={<>Combien Allez-Vous <em>Gagner de Plus ?</em></>}
        lead="Comparez vos revenus réels en Flotte Nordrive (50€/sem) par rapport à l'Auto-entrepreneur."
        onNavigate={onNavigate}
      />
      <section id="simulateur" className="nh-section nh-light">
        <div className="nh-wrap nh-narrow">
          <div className="nh-toggle" role="group" aria-label="Période">
            <button type="button" className={isWeek ? 'on' : ''} onClick={() => setPeriod('semaine')}>Par semaine</button>
            <button type="button" className={!isWeek ? 'on' : ''} onClick={() => setPeriod('mois')}>Par mois</button>
          </div>

          <div className="nh-calc-card nh-sim-card">
            <div className="nh-presets">
              {presets.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={(isWeek ? weekly : monthly) === v ? 'on' : ''}
                  onClick={() => (isWeek ? (setWeekly(v), setMonthly(v * 4)) : (setMonthly(v), setWeekly(Math.round(v / 4))))}
                >
                  {v.toLocaleString('fr-FR')} € / {isWeek ? 'sem' : 'mois'}
                </button>
              ))}
            </div>

            <label className="nh-calc-label" htmlFor="sim-ca">
              <span>Chiffre d'affaires {isWeek ? 'semaine' : 'mois'} (Uber + Bolt)</span>
              <b>{eur(isWeek ? weekly : monthly)}</b>
            </label>
            <input
              id="sim-ca"
              className="nh-range"
              type="range"
              min={isWeek ? 300 : 1200}
              max={isWeek ? 2500 : 10000}
              step={isWeek ? 50 : 200}
              value={isWeek ? weekly : monthly}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (isWeek) { setWeekly(v); setMonthly(v * 4); } else { setMonthly(v); setWeekly(Math.round(v / 4)); }
              }}
            />
            <div className="nh-range-scale" aria-hidden="true">
              <span>{isWeek ? '300 €' : '1 200 €'}</span><span>{isWeek ? '2 500 €' : '10 000 €'}</span>
            </div>

            <div className="nh-sim-results" aria-live="polite">
              <div className="nh-sim-box nh-sim-box--bad">
                <small>Statut Auto-Entrepreneur</small>
                <b>{eur(isWeek ? autoWeek : autoMonth)}</b>
                <span>Après URSSAF (~25%) & charges non déductibles.</span>
              </div>
              <div className="nh-sim-box nh-sim-box--good">
                <small>Flotte Nordrive · net dans votre poche</small>
                <b>{eur(isWeek ? fleetWeek : fleetMonth)}</b>
                <span>{isWeek ? 'Forfait 50€/sem • CDI • Viré chaque lundi' : 'Forfait 200€/mois • CDI • Viré chaque lundi'}</span>
              </div>
            </div>

            <p className="nh-sim-gain">
              En choisissant Nordrive, vous gagnez{' '}
              <strong>
                {isWeek
                  ? `+${eur(gainWeek)} / sem (+${eur(gainWeek * 4)} / mois)`
                  : `+${eur(gainMonth)} / mois (+${eur(gainMonth / 4)} / sem)`}
              </strong>{' '}
              de plus dans votre poche.
            </p>
            <p className="nh-calc-foot">Estimation indicative, avant carburant et charges liées au véhicule.</p>
          </div>
        </div>
      </section>
      <section className="nh-section nh-cta-band">
        <div className="nh-wrap nh-narrow nh-center">
          <h2 className="nh-h2">Convaincu par les chiffres ?</h2>
          <div className="nh-cta">
            <a href="/" className="nh-btn nh-btn--gold" onClick={(e) => onNavigate(e, '/')}>
              Je me rattache en 2 min <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ═════════════════════ PARRAINAGE ═════════════════════ */
interface ReferralForm { referrerName: string; referrerPhone: string; friendName: string; friendPhone: string }

export const ParrainagePage: React.FC<{
  form: ReferralForm;
  setForm: (f: ReferralForm) => void;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  phonePattern: string;
  onNavigate: Nav;
}> = ({ form, setForm, submitted, setSubmitted, error, onSubmit, phonePattern, onNavigate }) => (
  <div className="nh">
    <PageHero
      eyebrow="Programme parrainage"
      title={<>Parrainez un confrère, <em>touchez jusqu'à 200 €</em></>}
      lead="Chaque chauffeur que vous recommandez et qui rejoint la flotte vous rapporte une prime, versée dès que sa première semaine de courses est validée."
      onNavigate={onNavigate}
    />
    <section className="nh-section nh-light">
      <div className="nh-wrap">
        <ol className="nh-steps nh-steps--row">
          <li><span className="nh-step-n">1</span><div><b>Vous parrainez</b><span>Envoyez l'invitation sur WhatsApp ou indiquez-nous son numéro.</span></div></li>
          <li><span className="nh-step-n">2</span><div><b>Il rejoint la flotte</b><span>Nous le rattachons en 1h : macaron, contrat, comptes plateformes.</span></div></li>
          <li><span className="nh-step-n">3</span><div><b>Vous touchez la prime</b><span>Jusqu'à 200 € dès sa 1ère semaine de courses validée.</span></div></li>
        </ol>
      </div>
    </section>
    <section id="parrainage" className="nh-section">
      <div className="nh-wrap nh-narrow nh-formcard">
        {!submitted ? (
          <>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Salut ! Je te recommande Nordrive pour ton rattachement VTC : 50€/semaine uniquement si tu roules (0€ en vacances), véhicules +12 ans acceptés et macaron en moins d'1h. Inscris-toi ici : https://nordrive-flotte.com/")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nh-btn nh-btn--wa nh-btn--block"
            >
              <MessageSquare size={18} aria-hidden="true" /> Envoyer l'invitation sur WhatsApp
            </a>
            <div className="nh-or"><span>puis enregistrez votre prime</span></div>
            <form onSubmit={onSubmit} className="nh-form">
              <div className="nh-fields">
                <div><label className="nh-label" htmlFor="ref-referrer-name">Votre nom *</label>
                  <input id="ref-referrer-name" className="nh-input" type="text" required autoComplete="name" placeholder="Jean Dupont" value={form.referrerName} onChange={(e) => setForm({ ...form, referrerName: e.target.value })} /></div>
                <div><label className="nh-label" htmlFor="ref-referrer-phone">Votre téléphone *</label>
                  <input id="ref-referrer-phone" className="nh-input" type="tel" inputMode="tel" required autoComplete="tel" pattern={phonePattern} title="Numéro français, par exemple 06 12 34 56 78" placeholder="06 12 34 56 78" value={form.referrerPhone} onChange={(e) => setForm({ ...form, referrerPhone: e.target.value })} /></div>
                <div><label className="nh-label" htmlFor="ref-friend-name">Nom de votre ami *</label>
                  <input id="ref-friend-name" className="nh-input" type="text" required placeholder="Marie Martin" value={form.friendName} onChange={(e) => setForm({ ...form, friendName: e.target.value })} /></div>
                <div><label className="nh-label" htmlFor="ref-friend-phone">Son téléphone *</label>
                  <input id="ref-friend-phone" className="nh-input" type="tel" inputMode="tel" required pattern={phonePattern} title="Numéro français, par exemple 07 12 34 56 78" placeholder="07 12 34 56 78" value={form.friendPhone} onChange={(e) => setForm({ ...form, friendPhone: e.target.value })} /></div>
              </div>
              {error && <div role="alert" className="nh-alert">{error}</div>}
              <button type="submit" className="nh-btn nh-btn--gold nh-btn--block">Enregistrer mon parrainage <ArrowRight size={18} aria-hidden="true" /></button>
              <p className="nh-fine">Nous contactons votre ami pour son rattachement. Votre prime est versée sur le numéro indiqué ci-dessus.</p>
            </form>
          </>
        ) : (
          <div className="nh-done">
            <CheckCircle2 size={44} aria-hidden="true" />
            <h2>Parrainage enregistré</h2>
            <p>La demande pour <strong>{form.friendName}</strong> a bien été transmise à notre équipe.</p>
            <p className="nh-fine">Dès que son rattachement est validé et sa première semaine de courses effectuée, votre prime (jusqu'à 200 €) vous est versée.</p>
            <button type="button" className="nh-btn nh-btn--gold nh-btn--block" onClick={() => { setForm({ ...form, friendName: '', friendPhone: '' }); setSubmitted(false); }}>
              <Gift size={18} aria-hidden="true" /> Parrainer un autre ami
            </button>
          </div>
        )}
      </div>
    </section>
  </div>
);

/* ═════════════════════ QUI SOMMES-NOUS ═════════════════════ */
export const AboutPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="nh">
    <PageHero
      eyebrow="Voir au sommet"
      title="Qui sommes-nous ?"
      lead={<><strong>Nordrive</strong> est née d'une ambition forte : offrir aux chauffeurs VTC la solidité, la sérénité et la transparence à la hauteur des plus grands sommets. Nous plaçons la sécurité sociale et la réactivité au cœur de notre flotte.</>}
      onNavigate={onNavigate}
    />
    <section id="qui-sommes-nous" className="nh-section nh-light">
      <div className="nh-wrap">
        <div className="nh-grid-2">
          <article className="nh-card">
            <div className="nh-ico"><Users size={24} aria-hidden="true" /></div>
            <h2 className="nh-h3">Proximité & Support Dédié</h2>
            <p>Une équipe disponible sur WhatsApp 7j/7 pour vous assister à tout moment dans vos démarches et l'accès aux plateformes.</p>
          </article>
          <article className="nh-card">
            <div className="nh-ico"><Award size={24} aria-hidden="true" /></div>
            <h2 className="nh-h3">Conformité & Sécurité Maximum</h2>
            <p>Rattachement agréé par le ministère des Transports, macaron provisoire délivré en 1h et contrat CDI officiel.</p>
          </article>
        </div>
      </div>
    </section>
    <section id="support-humain" className="nh-section">
      <div className="nh-wrap nh-narrow nh-founder">
        <div className="nh-avatars" aria-hidden="true"><span>A</span><span>R</span></div>
        <div>
          <span className="nh-eyebrow">Vos interlocuteurs directs</span>
          <h2 className="nh-h2">Un accompagnement humain avec l'équipe Nordrive</h2>
          <p className="nh-lead">
            "Nous avons fondé <strong>Nordrive</strong> avec une idée simple : en finir avec les intermédiaires anonymes et les flottes fantômes. Quand vous rejoignez Nordrive, vous travaillez directement avec nous. Nous gérons votre dossier de A à Z, nous vous conseillons sur l'optimisation de vos revenus et nous répondons à toutes vos questions sous 10 minutes sur WhatsApp."
          </p>
          <p style={{ margin: '22px 0 0' }}>
            <a href={`${WA}?text=Bonjour%20l%27%C3%A9quipe%20Nordrive%2C%20je%20souhaite%20des%20infos`} target="_blank" rel="noopener noreferrer" className="nh-btn nh-btn--wa">
              <MessageSquare size={18} aria-hidden="true" /> Discuter en direct avec nous
            </a>
          </p>
        </div>
      </div>
    </section>
  </div>
);

/* ═════════════════════ FAQ ═════════════════════ */
export const FaqPage: React.FC<{ faq: Array<{ q: string; a: string }>; onNavigate: Nav }> = ({ faq, onNavigate }) => (
  <div className="nh">
    <PageHero eyebrow="Votre sérénité" title="FAQ complète Nordrive" onNavigate={onNavigate} />
    <section id="faq" className="nh-section nh-light">
      <div className="nh-wrap nh-narrow">
        <div className="nh-faq">
          {faq.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
    <section className="nh-section nh-cta-band">
      <div className="nh-wrap nh-narrow nh-center">
        <h2 className="nh-h2">Une autre question ?</h2>
        <div className="nh-cta">
          <a href={`${WA}?text=${encodeURIComponent("Bonjour Nordrive, j'ai une question sur le rattachement.")}`} target="_blank" rel="noopener noreferrer" className="nh-btn nh-btn--wa">
            <MessageSquare size={18} aria-hidden="true" /> Écrire sur WhatsApp
          </a>
        </div>
      </div>
    </section>
  </div>
);

/* ═════════════════════ CONTACT ═════════════════════ */
interface ContactForm { name: string; phone: string; email: string; message: string }

export const ContactPage: React.FC<{
  form: ContactForm;
  setForm: (f: ContactForm) => void;
  submitted: boolean;
  onSubmit: (e: React.FormEvent) => void;
  phonePattern: string;
  onNavigate: Nav;
}> = ({ form, setForm, submitted, onSubmit, phonePattern, onNavigate }) => (
  <div className="nh">
    <PageHero
      eyebrow="Support & contact"
      title="Une question ? Contactez l'équipe Nordrive"
      lead="Nos conseillers vous répondent sous 2 heures ouvrées."
      onNavigate={onNavigate}
    />
    <section id="contact" className="nh-section nh-light">
      <div className="nh-wrap">
        <div className="nh-contact">
          <article className="nh-card">
            <h2 className="nh-h3">Nos coordonnées</h2>
            <ul className="nh-contact-list">
              <li><Phone size={18} aria-hidden="true" /><a href="tel:0743767400">07 43 76 74 00 (7j/7)</a></li>
              <li><Mail size={18} aria-hidden="true" /><span>nordrivevtc@gmail.com</span></li>
              <li><MapPin size={18} aria-hidden="true" /><span>Paris & Île-de-France</span></li>
            </ul>
            <a href={`${WA}?text=Bonjour%20Nordrive%2C%20j%27ai%20une%20question`} target="_blank" rel="noopener noreferrer" className="nh-btn nh-btn--wa nh-btn--block">
              <MessageSquare size={18} aria-hidden="true" /> Démarrer un chat WhatsApp
            </a>
          </article>
          <article className="nh-card">
            {!submitted ? (
              <form onSubmit={onSubmit} className="nh-form">
                <h2 className="nh-h3">Envoyer un message</h2>
                <div><label className="nh-label" htmlFor="ct-name">Nom complet</label>
                  <input id="ct-name" className="nh-input" type="text" required autoComplete="name" placeholder="Jean Dupont" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="nh-label" htmlFor="ct-phone">Téléphone</label>
                  <input id="ct-phone" className="nh-input" type="tel" inputMode="tel" required autoComplete="tel" pattern={phonePattern} title="Numéro de téléphone, par exemple 06 12 34 56 79" placeholder="06 12 34 56 79" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="nh-label" htmlFor="ct-msg">Message</label>
                  <textarea id="ct-msg" className="nh-input" rows={4} required placeholder="Bonjour, je souhaiterais des précisions sur..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                <button type="submit" className="nh-btn nh-btn--gold nh-btn--block"><Send size={16} aria-hidden="true" /> Envoyer mon message</button>
              </form>
            ) : (
              <div className="nh-done">
                <CheckCircle2 size={44} aria-hidden="true" />
                <h2>Message envoyé</h2>
                <p>Merci. Un conseiller Nordrive vous recontacte rapidement.</p>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  </div>
);
