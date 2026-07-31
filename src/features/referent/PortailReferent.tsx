import { useEffect, useState } from 'react';
import { Link2, LogIn, Loader2, Building2, MapPin, Users, ShieldOff, HelpCircle, Check, Send } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

interface Personne { nom: string; prenom: string; fonction: string; regime: string; induction_statut: string }
interface Resultat {
  statut: 'ACTIF' | 'REVOQUE' | 'INCONNU';
  referent?: string; entreprise?: string; site?: string; organisation?: string; personnes?: Personne[];
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
  const [toast, setToast] = useState<string | null>(null);

  async function ouvrir(j: string) {
    setJeton(j); setCharge(true); setErr(null); setRes(null);
    const { data, error } = await supabase.functions.invoke('referent-portal', { body: { jeton: j } });
    if (error) setErr(error.message);
    else setRes(data as Resultat);
    setCharge(false);
  }

  // Auto-ouverture si le lien est passé en ?r=<jeton>
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
          <p className="mt-1 text-sm text-muted">Votre lien vous identifie et ouvre l’accès de votre entreprise. Aucun mot de passe, aucun compte à retenir.</p>
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

        {res && !charge && (
          <div className="mt-4">
            {res.statut === 'ACTIF' ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-forest-500 p-5 text-white shadow-card">
                  <p className="flex items-center gap-2 text-lg font-extrabold"><Check className="h-5 w-5" strokeWidth={3} /> {res.entreprise}</p>
                  <p className="mt-1 text-sm text-white/90">Référent {res.referent} · accès ouvert pour {res.organisation}.</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><Building2 className="h-3.5 w-3.5" /> {res.entreprise}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><MapPin className="h-3.5 w-3.5" /> {res.site}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-forest-500" /> Votre personnel <Badge tone="neutral">{res.personnes?.length ?? 0}</Badge></p>
                  <ul className="space-y-1.5">
                    {(res.personnes ?? []).map((p, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
                        <div><p className="text-sm font-semibold text-ink">{p.prenom} {p.nom}</p><p className="text-xs text-muted">{p.fonction} · {p.regime.toLowerCase()}</p></div>
                        <Badge tone={p.induction_statut === 'VALIDE' ? 'forest' : p.induction_statut === 'EXPIREE' ? 'danger' : 'amber'} dot>Induction {p.induction_statut.toLowerCase()}</Badge>
                      </li>
                    ))}
                    {(res.personnes ?? []).length === 0 && <li className="py-4 text-center text-sm text-muted">Aucun personnel déclaré pour l’instant.</li>}
                  </ul>
                  <Button variant="primary" block className="mt-3" icon={<Send className="h-4 w-4" />} onClick={() => { setToast('Dépôt de la liste — à brancher (prochaine tranche)'); setTimeout(() => setToast(null), 2600); }}>
                    Déposer la liste du jour
                  </Button>
                </div>
                <p className="text-center text-[11px] text-muted">Le lien est validé côté serveur (edge function service_role) ; le navigateur n’a jamais de droit privilégié.</p>
              </div>
            ) : res.statut === 'REVOQUE' ? (
              <div className="rounded-2xl bg-danger-50 p-5 text-center ring-1 ring-danger-100">
                <ShieldOff className="mx-auto h-8 w-8 text-danger-500" />
                <p className="mt-2 text-sm font-bold text-danger-600">Lien révoqué</p>
                <p className="mt-1 text-xs text-danger-600">Ce lien n’est plus valide. Rapprochez-vous de la direction du site pour en obtenir un nouveau.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-5 text-center shadow-card ring-1 ring-sand-300/70">
                <HelpCircle className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-2 text-sm font-bold text-ink">Lien inconnu</p>
                <p className="mt-1 text-xs text-muted">Aucun accès ne correspond à ce jeton.</p>
              </div>
            )}
          </div>
        )}

        {toast && (
          <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div className="rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">{toast}</div>
          </div>
        )}
      </div>
    </div>
  );
}
