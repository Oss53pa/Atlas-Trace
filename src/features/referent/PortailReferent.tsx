import { useEffect, useState } from 'react';
import { Link2, LogIn, Loader2, MapPin, Users, ShieldOff, HelpCircle, Check, Send, Pencil, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

interface Personne { id: string; nom: string; prenom: string; fonction: string; regime: string; induction_statut: string }
interface ListeJour { id: string; statut: string; effectif: number; deposee_at: string }
interface Resultat {
  statut: 'ACTIF' | 'REVOQUE' | 'INCONNU';
  referent?: string; entreprise?: string; site?: string; organisation?: string;
  dateJour?: string; personnes?: Personne[]; listeJour?: ListeJour | null;
}

const DEMO = [
  { label: 'Lien Bâti-Sud (actif)', jeton: 'jeton-bati-sud-2026' },
  { label: 'Lien Élec-Plus (actif)', jeton: 'jeton-elec-plus-2026' },
  { label: 'Lien révoqué', jeton: 'jeton-revoque-demo' },
];

export function PortailReferent() {
  const [jeton, setJeton] = useState('');
  const [res, setRes] = useState<Resultat | null>(null);
  const [charge, setCharge] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ouvrir(j: string) {
    setJeton(j); setCharge(true); setErr(null); setRes(null);
    const { data, error } = await supabase.functions.invoke('referent-portal', { body: { jeton: j } });
    if (error) setErr(error.message); else setRes(data as Resultat);
    setCharge(false);
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('r');
    if (p) ouvrir(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-200 via-sand-100 to-forest-50">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"><Link2 className="h-3.5 w-3.5" /> Accès par lien unique · sans compte</span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Portail référent</h1>
          <p className="mt-1 text-sm text-muted">Votre lien vous identifie et ouvre l’accès de votre entreprise. Aucun mot de passe.</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Jeton du lien</span>
            <div className="flex gap-2">
              <input value={jeton} onChange={(e) => setJeton(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && jeton && ouvrir(jeton)} placeholder="collez votre jeton…"
                className="flex-1 rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-forest-400" />
              <Button variant="primary" disabled={!jeton || charge} icon={charge ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} onClick={() => ouvrir(jeton)}>Ouvrir</Button>
            </div>
          </label>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DEMO.map((d) => (
              <button key={d.jeton} onClick={() => ouvrir(d.jeton)} className="rounded-full bg-sand-50 px-3 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-inset ring-sand-300 hover:bg-forest-50 hover:ring-forest-200">{d.label}</button>
            ))}
          </div>
        </div>

        {err && <p className="mt-4 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}
        {charge && <div className="mt-4 flex items-center justify-center gap-2 py-8 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Vérification du lien…</div>}

        {res && !charge && res.statut === 'ACTIF' && <PortailActif res={res} jeton={jeton} onMaj={() => ouvrir(jeton)} />}
        {res && !charge && res.statut === 'REVOQUE' && (
          <div className="mt-4 rounded-2xl bg-danger-50 p-5 text-center ring-1 ring-danger-100">
            <ShieldOff className="mx-auto h-8 w-8 text-danger-500" />
            <p className="mt-2 text-sm font-bold text-danger-600">Lien révoqué</p>
            <p className="mt-1 text-xs text-danger-600">Ce lien n’est plus valide. Rapprochez-vous de la direction du site.</p>
          </div>
        )}
        {res && !charge && res.statut === 'INCONNU' && (
          <div className="mt-4 rounded-2xl bg-white p-5 text-center shadow-card ring-1 ring-sand-300/70">
            <HelpCircle className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-sm font-bold text-ink">Lien inconnu</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface Ligne { personne_id: string | null; nom: string; prenom: string; fonction: string; induction?: string; present: boolean; tournant: boolean; sousTraitant: string | null }

function PortailActif({ res, jeton, onMaj }: { res: Resultat; jeton: string; onMaj: () => void }) {
  const [mode, setMode] = useState<'apercu' | 'edition'>(res.listeJour ? 'apercu' : 'edition');
  const [lignes, setLignes] = useState<Ligne[]>(
    (res.personnes ?? []).map((p) => ({ personne_id: p.id, nom: p.nom, prenom: p.prenom, fonction: p.fonction, induction: p.induction_statut, present: true, tournant: false, sousTraitant: null })),
  );
  const [horsDelai, setHorsDelai] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tournant, setTournant] = useState({ prenom: '', nom: '', fonction: '' });

  const effectif = lignes.filter((l) => l.present).length;
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function deposer() {
    setEnvoi(true);
    const payload = lignes.map((l) => ({ personne_id: l.personne_id, nom: l.nom, prenom: l.prenom, present: l.present, tournant: l.tournant, sous_traitant: l.sousTraitant }));
    const { data, error } = await supabase.functions.invoke('referent-portal', { body: { jeton, action: 'deposer', date: res.dateJour, horsDelai, lignes: payload } });
    setEnvoi(false);
    if (error || (data as any)?.error) { flash('Erreur : ' + (error?.message || (data as any).error)); return; }
    flash(`Liste déposée · ${(data as any).effectif} présents · ${(data as any).statut}`);
    onMaj();
  }

  function ajouterTournant() {
    if (!tournant.prenom.trim() || !tournant.nom.trim()) return;
    setLignes((ls) => [...ls, { personne_id: null, nom: tournant.nom.trim(), prenom: tournant.prenom.trim(), fonction: tournant.fonction.trim() || 'Manœuvre', present: true, tournant: true, sousTraitant: null }]);
    setTournant({ prenom: '', nom: '', fonction: '' });
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-forest-500 p-5 text-white shadow-card">
        <p className="flex items-center gap-2 text-lg font-extrabold"><Check className="h-5 w-5" strokeWidth={3} /> {res.entreprise}</p>
        <p className="mt-1 text-sm text-white/90">Référent {res.referent} · {res.organisation}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><MapPin className="h-3.5 w-3.5" /> {res.site}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> Liste du {fmt(res.dateJour)}</span>
        </div>
      </div>

      {/* Déjà déposée */}
      {mode === 'apercu' && res.listeJour && (
        <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Liste déjà déposée</p>
              <p className="text-xs text-muted">{res.listeJour.effectif} présents · déposée le {new Date(res.listeJour.deposee_at).toLocaleString('fr-FR')}</p>
            </div>
            {res.listeJour.statut === 'HORS_DELAI' ? <Badge tone="amber" dot>Hors délai</Badge> : <Badge tone="forest" dot>Déposée</Badge>}
          </div>
          <Button variant="outline" size="sm" className="mt-3" icon={<Pencil className="h-4 w-4" />} onClick={() => setMode('edition')}>Modifier / redéposer</Button>
        </div>
      )}

      {/* Éditeur de dépôt */}
      {mode === 'edition' && (
        <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-forest-500" /> Présents aujourd’hui</p>
            <Badge tone="forest">{effectif} présents</Badge>
          </div>
          <ul className="space-y-1.5">
            {lignes.map((l, i) => (
              <li key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ${l.present ? 'bg-sand-50 ring-sand-200' : 'bg-white ring-sand-200 opacity-60'}`}>
                <button onClick={() => setLignes((ls) => ls.map((x, j) => j === i ? { ...x, present: !x.present } : x))}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${l.present ? 'border-forest-500 bg-forest-500 text-white' : 'border-sand-400 bg-white text-transparent'}`}><Check className="h-4 w-4" strokeWidth={3} /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{l.prenom} {l.nom}</p>
                  <p className="truncate text-xs text-muted">{l.fonction}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {l.tournant && <Badge tone="amber">Tournant</Badge>}
                  {l.induction && l.induction !== 'VALIDE' && <Badge tone="danger">Induction</Badge>}
                  <button onClick={() => setLignes((ls) => ls.map((x, j) => j === i ? { ...x, sousTraitant: x.sousTraitant ? null : 'Élec-Plus' } : x))}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${l.sousTraitant ? 'bg-forest-100 text-forest-700 ring-forest-200' : 'bg-white text-muted ring-sand-300'}`}>{l.sousTraitant ? `S-T · ${l.sousTraitant}` : 'S-T'}</button>
                </div>
              </li>
            ))}
          </ul>

          {/* Ajouter un tournant */}
          <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5">
            <input value={tournant.prenom} onChange={(e) => setTournant({ ...tournant, prenom: e.target.value })} placeholder="Prénom" className="rounded-lg border border-sand-300 bg-sand-50 px-2 py-1.5 text-xs text-ink outline-none focus:border-forest-400" />
            <input value={tournant.nom} onChange={(e) => setTournant({ ...tournant, nom: e.target.value })} placeholder="Nom" className="rounded-lg border border-sand-300 bg-sand-50 px-2 py-1.5 text-xs text-ink outline-none focus:border-forest-400" />
            <input value={tournant.fonction} onChange={(e) => setTournant({ ...tournant, fonction: e.target.value })} placeholder="Fonction" className="rounded-lg border border-sand-300 bg-sand-50 px-2 py-1.5 text-xs text-ink outline-none focus:border-forest-400" />
            <button onClick={ajouterTournant} className="rounded-lg bg-forest-50 px-2.5 text-xs font-semibold text-forest-700 hover:bg-forest-100">+ Tournant</button>
          </div>

          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-muted">
            <input type="checkbox" checked={horsDelai} onChange={(e) => setHorsDelai(e.target.checked)} /> Dépôt hors délai (après l’heure limite)
          </label>

          <Button variant="primary" block className="mt-3" disabled={envoi} icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} onClick={deposer}>
            {envoi ? 'Envoi…' : 'Déposer la liste du jour'}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted">Écriture côté serveur (edge function service_role) — le référent n’a aucun droit direct sur la base.</p>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');
