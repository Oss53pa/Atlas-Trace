import { useEffect, useState } from 'react';
import { KeyRound, Plus, X, Check, Loader2, LogIn, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz, Gate } from '../../lib/authz';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { POUVOIRS } from '../../data/parametrage';

interface Role { id: string; libelle: string; pouvoirs: string[] }

const effetDe = (code: string) => POUVOIRS.find((p) => p.code === code)?.effet ?? code;

export function RolesLive() {
  const { connecte, chargement, portees, a } = useAuthz();
  const orgId = portees[0]?.organisationId ?? null;
  const [roles, setRoles] = useState<Role[]>([]);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function charger() {
    setErreur(null);
    const { data, error } = await supabase.from('at_roles').select('id, libelle, pouvoirs').order('libelle');
    if (error) setErreur(error.message);
    else setRoles((data as unknown as Role[]) ?? []);
    setPret(true);
  }

  useEffect(() => {
    if (connecte) charger(); else setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  async function creerRole(libelle: string, pouvoirs: string[]) {
    if (!orgId) return;
    const { error } = await supabase.from('at_roles').insert({ organisation_id: orgId, libelle, pouvoirs });
    if (error) { flash('Refusé : ' + error.message); return; }
    setSheet(false); flash(`Rôle « ${libelle} » créé`); charger();
  }

  async function basculerPouvoir(role: Role, code: string) {
    const nouveaux = role.pouvoirs.includes(code) ? role.pouvoirs.filter((p) => p !== code) : [...role.pouvoirs, code];
    const { error } = await supabase.from('at_roles').update({ pouvoirs: nouveaux }).eq('id', role.id);
    if (error) { flash('Refusé : ' + error.message); return; }
    setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, pouvoirs: nouveaux } : r)));
  }

  if (chargement || !pret) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>;
  if (!connecte) return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><LogIn className="h-6 w-6" /></span>
      <h2 className="text-lg font-extrabold text-ink">Connexion requise</h2>
      <p className="mt-1 text-sm text-muted">Connectez-vous via le bouton en haut de l'écran.</p>
    </div>
  );

  const editable = a('ADMINISTRER_ORGANISATION');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><KeyRound className="h-3.5 w-3.5" /> Rôles & pouvoirs</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Rôles</h1>
            <p className="mt-1 text-sm text-muted">Un rôle est une composition de pouvoirs atomiques. Ce qu'un utilisateur voit et peut faire en découle directement (interface par rôle).</p>
          </div>
          <Gate pouvoir="ADMINISTRER_ORGANISATION">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>Créer un rôle</Button>
          </Gate>
        </div>

        {!editable && <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Lecture seule — votre rôle ne permet pas de modifier les rôles.</p>}
        {erreur && <p className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        <ul className="space-y-3">
          {roles.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/60">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-extrabold text-ink">{r.libelle}</p>
                <Badge tone="neutral">{r.pouvoirs.length} pouvoir(s)</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POUVOIRS.map((p) => {
                  const actif = r.pouvoirs.includes(p.code);
                  return (
                    <button
                      key={p.code}
                      disabled={!editable}
                      title={p.effet}
                      onClick={() => basculerPouvoir(r, p.code)}
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold ring-1 transition-colors ${
                        actif ? 'bg-forest-50 text-forest-700 ring-forest-200' : 'bg-sand-50 text-muted ring-sand-300'
                      } ${editable ? 'hover:ring-forest-300' : 'cursor-default opacity-80'}`}
                    >
                      {actif && <Check className="mr-0.5 inline h-2.5 w-2.5" />}{p.code}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
          {roles.length === 0 && (
            <li className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-sand-300/60"><Users className="mx-auto h-8 w-8 text-sand-400" /><p className="mt-2 text-sm font-semibold text-ink">Aucun rôle</p></li>
          )}
        </ul>
        <p className="mt-3 text-[11px] text-muted">Astuce : touchez un pouvoir pour l'ajouter/retirer d'un rôle. Toute écriture est refusée en base sans le pouvoir <span className="font-mono">ADMINISTRER_ORGANISATION</span> — même en forçant l'UI.</p>
      </div>

      {sheet && <RoleSheet onAnnuler={() => setSheet(false)} onCreer={creerRole} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function RoleSheet({ onAnnuler, onCreer }: { onAnnuler: () => void; onCreer: (libelle: string, pouvoirs: string[]) => void }) {
  const [libelle, setLibelle] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const bascule = (c: string) => setSel((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
          <h3 className="text-lg font-extrabold text-ink">Créer un rôle</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Libellé du rôle</span>
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex. : Coordinateur de lot" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
          <p className="mb-2 mt-4 text-xs font-semibold text-muted">Pouvoirs ({sel.size} sélectionné(s))</p>
          <div className="space-y-1.5">
            {POUVOIRS.map((p) => (
              <button key={p.code} onClick={() => bascule(p.code)} className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition-colors ${sel.has(p.code) ? 'border-forest-200 bg-forest-50' : 'border-sand-200 bg-white hover:bg-sand-50'}`}>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${sel.has(p.code) ? 'bg-forest-500 text-white' : 'ring-1 ring-sand-300'}`}>{sel.has(p.code) && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] font-bold text-ink">{p.code}</span>
                  <span className="block text-[11px] text-muted">{effetDe(p.code)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-sand-200 px-5 py-4">
          <Button variant="primary" size="lg" block disabled={libelle.trim().length < 2 || sel.size === 0} onClick={() => onCreer(libelle.trim(), [...sel])}>Créer le rôle ({sel.size})</Button>
        </div>
      </div>
    </div>
  );
}
