import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { track } from '../lib/analytics';
import { splitLinks } from './chatLinks';
import './chat.css';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY = 11; // la fonction serveur accepte 12 messages au maximum
const MAX_CHARS = 1000;
const WHATSAPP = 'https://wa.me/33743767400';
const SUGGESTIONS = ['Combien ça coûte ?', 'Je veux me rattacher : que faut-il fournir ?', 'Mon véhicule a plus de 12 ans, est-ce possible ?'];
const WELCOME: Msg = {
  role: 'assistant',
  content: "Bonjour ! Je suis l'assistant de Nordrive. Posez-moi vos questions sur le rattachement, les tarifs ou le parrainage.",
};

/** Les 11 derniers échanges, en commençant par une question (contrainte de l'API : alternance user/assistant). */
export function buildPayload(history: Msg[], question: string): Msg[] {
  const all = [...history.filter(m => m !== WELCOME), { role: 'user' as const, content: question }];
  let recent = all.slice(-MAX_HISTORY);
  while (recent.length > 1 && recent[0].role !== 'user') recent = recent.slice(1);
  return recent;
}

/** `bottom` : hauteur (px) laissée libre sous la bulle, pour ne pas recouvrir les boutons WhatsApp et Telegram. */
export function ChatWidget({ bottom = 92 }: { bottom?: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, busy, open]);

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_CHARS);
    if (!question || busy) return;
    const payload = buildPayload(messages, question);
    setMessages(m => [...m, { role: 'user', content: question }]);
    setInput('');
    setBusy(true);
    track('Chat question'); // aucun contenu de message n'est envoyé à la mesure d'audience
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      const text = data.reply ?? data.error ?? "L'assistant est momentanément indisponible. Écrivez-nous sur WhatsApp.";
      setMessages(m => [...m, { role: 'assistant', content: text }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Connexion impossible pour le moment. Écrivez-nous sur WhatsApp au 07 43 76 74 00." }]);
    } finally {
      setBusy(false);
    }
  }

  const toggle = () => {
    if (!open) track('Chat ouvert');
    setOpen(o => !o);
  };

  return (
    <div className="nc-root" style={{ '--nc-bottom': `${bottom}px` } as CSSProperties}>
      {open && (
        <section className="nc-panel" role="dialog" aria-label="Assistant Nordrive">
          <header className="nc-head">
            <div>
              <strong>Assistant Nordrive</strong>
              <span>Réponse automatique, 24h/24</span>
            </div>
            <button type="button" className="nc-icon" onClick={() => setOpen(false)} aria-label="Fermer la discussion">
              <X size={18} />
            </button>
          </header>

          <div className="nc-body" aria-live="polite">
            {messages.map((m, i) => (
              <p key={i} className={m.role === 'user' ? 'nc-msg nc-user' : 'nc-msg nc-bot'}>
                {m.role === 'user'
                  ? m.content
                  : splitLinks(m.content).map((s, j) =>
                      s.type === 'text' ? (
                        <span key={j}>{s.text}</span>
                      ) : (
                        <a
                          key={j}
                          className="nc-btn"
                          href={s.href}
                          {...(s.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {s.label}
                        </a>
                      ),
                    )}
              </p>
            ))}
            {busy && <p className="nc-msg nc-bot nc-typing" aria-label="L'assistant écrit">…</p>}
            {messages.length === 1 && !busy && (
              <div className="nc-chips">
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <p className="nc-note">
            Assistant automatique : il peut se tromper. Ne partagez ici ni IBAN ni pièces d'identité.{' '}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              Parler à l'équipe sur WhatsApp
            </a>
          </p>

          <form
            className="nc-form"
            onSubmit={e => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={MAX_CHARS}
              placeholder="Votre question…"
              aria-label="Votre question"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button type="button" className="nc-fab" onClick={toggle} aria-expanded={open} aria-label={open ? 'Fermer la discussion' : 'Poser une question à l\'assistant'}>
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && <span>Une question ?</span>}
      </button>
    </div>
  );
}
