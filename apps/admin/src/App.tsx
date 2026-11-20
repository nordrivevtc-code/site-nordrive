import { useCallback, useEffect, useState } from 'react';
import { AuthGate } from './AuthGate.tsx';
import { FUNCTIONS_URL, supabase } from './supabase.ts';

type Role = 'owner' | 'manager' | 'advisor' | 'accountant';
const ROLE_LABEL: Record<Role, string> = { owner: 'Propriétaire', manager: 'Responsable', advisor: 'Conseiller', accountant: 'Comptable' };

interface Application {
  id: string; created_at: string; status: 'new' | 'needs_info' | 'approved' | 'rejected';
  first_name: string; last_name: string; city: string; phone: string; email: string | null;
  vtc_card_status: string; source: string | null;
}
interface Doc { id: string; doc_type: string; mime_type: string; size_bytes: number; status: string }

const STATUS_LABEL = { new: 'Nouvelle', needs_info: 'À compléter', approved: 'Approuvée', rejected: 'Refusée' } as const;
const DOC_LABEL: Record<string, string> = {
  vtc_card_front: 'Carte VTC (recto)', vtc_card_back: 'Carte VTC (verso)', driving_license: 'Permis', id_photo: "Photo d'identité",
  rc_circulation: 'RC circulation', vehicle_registration: 'Carte grise', insurance_memo: "Mémo d'assurance", insurance_statement: "Relevé d'information", signature: 'Signature',
};

export function App() {
  return <AuthGate>{(signOut) => <Shell signOut={signOut} />}</AuthGate>;
}

function Shell({ signOut }: { signOut: () => void }) {
  const [profile, setProfile] = useState<{ role: Role; full_name: string } | null | undefined>(undefined);

  useEffect(() => {
    // Le rôle vient de la base ; sans profil actif (ou sans double authentification), la base ne renvoie rien.
    supabase.rpc('my_profile').then(({ data }) => setProfile((data as { role: Role; full_name: string }[] | null)?.[0] ?? null));
  }, []);

  if (profile === undefined) return <main className="center"><p>Chargement…</p></main>;
  if (profile === null) {
    return (
      <main className="center">
        <div className="card narrow">
          <h1>Accès non autorisé</h1>
          <p>Votre compte n'a pas encore de rôle. Demandez au propriétaire de l'activer.</p>
          <button onClick={signOut}>Se déconnecter</button>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="bar">
        <strong>Nordrive · Administration</strong>
        <span>{profile.full_name} · {ROLE_LABEL[profile.role]} <button className="link" onClick={signOut}>Déconnexion</button></span>
      </header>
      <main className="page">
        <Applications role={profile.role} />
      </main>
    </>
  );
}

function Applications({ role }: { role: Role }) {
  const [rows, setRows] = useState<Application[] | null>(null);
  const [error, setError] = useState('');
  const [docs, setDocs] = useState<Record<string, Doc[]>>({});

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('applications')
      .select('id, created_at, status, first_name, last_name, city, phone, email, vtc_card_status, source')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) setError('Chargement impossible.');
    else setRows((data as Application[]) ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const showDocs = async (id: string) => {
    const { data } = await supabase.from('driver_documents').select('id, doc_type, mime_type, size_bytes, status').eq('application_id', id);
    setDocs((d) => ({ ...d, [id]: (data as Doc[]) ?? [] }));
  };

  // L'ouverture passe par la fonction serveur : contrôle du rôle + MFA, trace d'audit, lien valable 60 secondes
  const openDoc = async (docId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${FUNCTIONS_URL}/document-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ documentId: docId }),
    });
    const body = res.ok ? ((await res.json()) as { url: string }) : null;
    if (body?.url) window.open(body.url, '_blank', 'noopener,noreferrer');
    else setError("Ouverture refusée (droits insuffisants ou session expirée).");
  };

  const promote = async (id: string) => {
    const { error: err } = await supabase.rpc('promote_application', { p_application: id });
    if (err) setError('Action refusée.');
    else { setError(''); void load(); }
  };

  if (role === 'accountant') return <p className="card">Votre rôle (comptable) n'a pas accès aux candidatures.</p>;

  return (
    <section className="card">
      <h2>Candidatures</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {rows === null ? <p>Chargement…</p> : rows.length === 0 ? <p className="muted">Aucune candidature visible.</p> : (
        <table>
          <thead><tr><th>Reçue</th><th>Nom</th><th>Ville</th><th>Carte VTC</th><th>Source</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {rows.map((a) => (
              <>
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{a.first_name} {a.last_name}<br /><span className="muted">{a.phone}{a.email ? ` · ${a.email}` : ''}</span></td>
                  <td>{a.city}</td><td>{a.vtc_card_status}</td><td>{a.source ?? '—'}</td>
                  <td>{STATUS_LABEL[a.status]}</td>
                  <td className="actions">
                    <button className="link" onClick={() => void showDocs(a.id)}>Documents</button>
                    {a.status !== 'approved' && <button onClick={() => void promote(a.id)}>Créer le chauffeur</button>}
                  </td>
                </tr>
                {docs[a.id] && (
                  <tr key={`${a.id}-docs`}><td colSpan={7} className="docs">
                    {docs[a.id].length === 0 ? <span className="muted">Aucun document.</span> : docs[a.id].map((d) => (
                      <button key={d.id} className="chip" onClick={() => void openDoc(d.id)}>{DOC_LABEL[d.doc_type] ?? d.doc_type} · {(d.size_bytes / 1024).toFixed(0)} Ko</button>
                    ))}
                  </td></tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
