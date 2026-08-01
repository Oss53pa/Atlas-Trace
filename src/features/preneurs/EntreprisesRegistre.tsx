import { useEffect, useState } from 'react';
import { Building2, Plus, X, Check, Loader2, LogIn, Store, HardHat } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz, Gate } from '../../lib/authz';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface Entite {
  id: string;
  type: 'MOA' | 'PRENEUR' | 'ENTREPRISE';
  categorie: string | null;
  raison_sociale: string;
  interne: boolean;
  statut: string;
  parent_id: string | null;
}

const CATEGORIES = ['Construction', 'MOE', 'Gardiennage', 'Bureau de contrôle', 'Fournisseur', 'Autre'];

export function EntreprisesRegistre() {
  const { connecte, chargement, portees } = useAuthz();
  const orgId = portees[0]?.organisationId ?? null;
  const [entites, setEntites] = useState<Entite[]>([]);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function charger() {
    setErreur(null);
    const { data, error } = await supabase.from('at_entites')
      .select('id, type, categorie, raison_sociale, interne, statut, parent_id')
      .in('type', ['PRENEUR', 'ENTREPRISE']).order('raison_sociale');
    if (error) setErreur(error.message);
    else setEntites((data as unknown as Entite[]) ?? []);
    setPret(true);
  }

  useEffect(() => {
    if (connecte) charger(); else setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  async function creer(raison: string, categorie: string, parentId: string | null) {
    if (!orgId) return;
    const { error } = await supabase.from('at_entites').insert({
      organisation_id: orgId, type: 'ENTREPRISE', categorie, raison_sociale: raison, parent_id: parentId,
    });
    if (error) { flash('Refusé : ' + error.message); return; }
    setSheet(false); flash(`Entreprise « ${raison} » créée`); charger();
  }

  if (chargement || !pret) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>;
  if (!connecte) return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><LogIn className="h-6 w-6" /></span>
      <h2 className="text-lg font-extrabold text-ink">Connexion requise</h2>
      <p className="mt-1 text-sm text-muted">Connectez-vous via le bouton en haut de l'écran.</p>
    </div>
  );

  const preneurs = entites.filter((e) => e.type === 'PRENEUR');
  const entreprises = entites.filter((e) => e.type === 'ENTREPRISE');
  const nomParent = (id: string | null) => (id ? preneurs.find((p) => p.id === id)?.raison_sociale ?? 'Preneur' : 'Site (MOA)');

  // Groupage par parent : Site puis chaque Preneur
  const groupes: { cle: string; titre: string; icon: React.ReactNode; items: Entite[] }[] = [
    { cle: 'site', titre: 'Travaux du site (MOA)', icon: <HardHat className="h-4 w-4" />, items: entreprises.filter((e) => !e.parent_id) },
    ...preneurs.map((p) => ({ cle: p.id, titre: `Emprise · ${p.raison_sociale}`, icon: <Store className="h-4 w-4" />, items: entreprises.filter((e) => e.parent_id === p.id) })),
  ];

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Building2 className="h-3.5 w-3.5" /> Registre des entreprises</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Entreprises & rattachement</h1>
            <p className="mt-1 text-sm text-muted">Chaque entreprise (construction, MOE, gardiennage…) est rattachée à un preneur ou aux travaux du site. Le contrôle d'accès (visa, appro, badges) reste géré par la MOA.</p>
          </div>
          <Gate pouvoir="ADMINISTRER_ORGANISATION">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>Nouvelle entreprise</Button>
          </Gate>
        </div>

        {erreur && <p className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        {entreprises.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-sand-300/60">
            <Building2 className="mx-auto h-8 w-8 text-sand-400" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucune entreprise au registre</p>
            <p className="text-xs text-muted">Créez la première et rattachez-la au site ou à un preneur.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupes.filter((g) => g.items.length > 0).map((g) => (
              <section key={g.cle}>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><span className="text-forest-600">{g.icon}</span> {g.titre} <span className="text-xs font-medium text-muted">· {g.items.length}</span></div>
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {g.items.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-sand-300/60">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{e.raison_sociale}</p>
                        <p className="truncate text-xs text-muted">{e.categorie ?? 'Entreprise'} · {nomParent(e.parent_id)}</p>
                      </div>
                      <Badge tone={e.statut === 'ACTIVE' ? 'forest' : 'neutral'} dot>{e.statut === 'ACTIVE' ? 'Active' : e.statut}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {sheet && <EntrepriseSheet preneurs={preneurs} onAnnuler={() => setSheet(false)} onCreer={creer} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function EntrepriseSheet({ preneurs, onAnnuler, onCreer }: { preneurs: Entite[]; onAnnuler: () => void; onCreer: (raison: string, categorie: string, parentId: string | null) => void }) {
  const [raison, setRaison] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [parent, setParent] = useState('site');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle entreprise</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Le MOE, une entreprise de construction ou le gardiennage : ce sont toutes des entreprises soumises aux mêmes règles d'accès.</p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Raison sociale</span>
          <input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Ex. : Bâti-Sud" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Catégorie</span>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Rattachée à</span>
            <select value={parent} onChange={(e) => setParent(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              <option value="site">Site (MOA)</option>
              {preneurs.map((p) => <option key={p.id} value={p.id}>Preneur · {p.raison_sociale}</option>)}
            </select>
          </label>
        </div>

        <Button variant="primary" size="lg" block className="mt-4" disabled={raison.trim().length < 2}
          onClick={() => onCreer(raison.trim(), categorie, parent === 'site' ? null : parent)}>Créer l'entreprise</Button>
      </div>
    </div>
  );
}
