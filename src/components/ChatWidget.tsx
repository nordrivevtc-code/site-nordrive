import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { track } from '../lib/analytics';
import { splitLinks } from './chatLinks';
import { answerText, answerTopic, topicTitle, WELCOME } from './chatEngine';
import './chat.css';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  /** Boutons de sujets proposés sous la réponse (le dernier message seulement les affiche) */
  chips?: string[];
}

const MAX_CHARS = 300;
const WHATSAPP = 'https://wa.me/33743767400';

/** `bottom` : hauteur (px) laissée libre sous la bulle, pour ne pas recouvrir les boutons WhatsApp et Telegram. */
export function ChatWidget({ bottom = 92 }: { bottom?: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: WELCOME.text, chips: WELCOME.chips }]);
  const [input, setInput] = useState('');
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
  }, [messages, open]);

  function ask(userText: string, reply: { text: string; chips: string[] }) {
    setMessages(m => [...m, { role: 'user', content: userText }, { role: 'assistant', content: reply.text, chips: reply.chips }]);
  }

  function pickTopic(id: string) {
    track('Chat sujet', { sujet: id }); // seul l'identifiant du sujet est compté, jamais un texte saisi
    ask(topicTitle(id), answerTopic(id));
  }

  function send(text: string) {
    const question = text.trim().slice(0, MAX_CHARS);
    if (!question) return;
    track('Chat question'); // aucun contenu de message n'est envoyé à la mesure d'audience
    setInput('');
    ask(question, answerText(question));
  }

  const toggle = () => {
    if (!open) track('Chat ouvert');
    setOpen(o => !o);
  };

  const last = messages.length - 1;

  return (
    <div className="nc-root" style={{ '--nc-bottom': `${bottom}px` } as CSSProperties}>
      {open && (
        <section className="nc-panel" role="dialog" aria-label="Assistant Nordrive">
          <header className="nc-head">
            <div>
              <strong>Assistant Nordrive</strong>
              <span>Réponses instantanées</span>
            </div>
            <button type="button" className="nc-icon" onClick={() => setOpen(false)} aria-label="Fermer la discussion">
              <X size={18} />
            </button>
          </header>

          <div className="nc-body" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className="nc-row">
                <p className={m.role === 'user' ? 'nc-msg nc-user' : 'nc-msg nc-bot'}>
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
                {i === last && m.chips && m.chips.length > 0 && (
                  <div className="nc-chips">
                    {m.chips.map(id => (
                      <button key={id} type="button" onClick={() => pickTopic(id)}>
                        {topicTitle(id)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <p className="nc-note">
            Assistant automatique : n'écrivez ici ni IBAN ni pièces d'identité.{' '}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              Parler à l'équipe sur WhatsApp
            </a>
          </p>

          <form
            className="nc-form"
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={MAX_CHARS}
              placeholder="Votre question…"
              aria-label="Votre question"
            />
            <button type="submit" disabled={!input.trim()} aria-label="Envoyer">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button type="button" className="nc-fab" onClick={toggle} aria-expanded={open} aria-label={open ? 'Fermer la discussion' : "Poser une question à l'assistant"}>
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && <span>Une question ?</span>}
      </button>
    </div>
  );
}
