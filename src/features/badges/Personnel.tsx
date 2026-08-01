import { useMemo, useState } from 'react';
import { UserPlus, Check, X, ShieldCheck, CreditCard, AlertTriangle } from 'lucide-react';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { CATEGORIES, PERSONNEL, type InductionStatut, type Personne } from '../../data/badges';

export function Personnel() {
  const [gens, setGens] = useState<Personne[]>(PERSONNEL);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: gens.length,
      valides: gens.filter((p) => p.induction === 'VALIDE').length,
      aViser: gens.filter((p) => p.induction !== 'VALIDE').length,
      bloques: gens.filter((p) => p.badgeStatut === 'BLOQUE').length,
    };
  }, [gens]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }

  function viser(id: string) {
    setGens((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, induction: 'VALIDE', inductionEcheance: '2027-07-29', badgeStatut: 'ACTIF' } : p,
      ),
    );
    flash('Induction visée · badge activé');
  }

  function declarer(v: { prenom: string; nom: string; fonction: string; entreprise: string; categorieId: string }) {
    const num = 200 + gens.length;
    setGens((ps) => [
      {
        id: `new-${num}`,
        ...v,
        induction: 'EN_ATTENTE',
        badgeStatut: 'BLOQUE',
        badgeNumero: `NOM-00${num}`,
      },
      ...ps,
    ]);
    setSheet(false);
    flash('Personne déclarée · induction à viser');
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500">M3 · Personnel</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Personnel &amp; inductions</h1>
          <p className="mt-1 text-sm text-muted">
            Photo prise dans l'application, jamais importée. Visa d'induction bloquant pour l'accès.
          </p>
        </div>
        <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setSheet(true)}>
          Déclarer une personne
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="forest" label="Personnel déclaré" value={stats.total} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Inductions valides" value={stats.valides} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard tone="amber" label="Inductions à viser" value={stats.aViser} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard tone="plain" label="Badges bloqués" value={stats.bloques} icon={<X className="h-5 w-5" />} />
      </div>

      <ul className="space-y-2">
        {gens.map((p) => (
          <PersonneRow key={p.id} p={p} onViser={() => viser(p.id)} />
        ))}
      </ul>

      {sheet && <DeclarerSheet onAnnuler={() => setSheet(false)} onConfirmer={declarer} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonneRow({ p, onViser }: { p: Personne; onViser: () => void }) {
  const cat = CATEGORIES[p.categorieId];
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
      <Avatar nom={p.nom} prenom={p.prenom} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {p.prenom} {p.nom}
        </p>
        <p className="truncate text-xs text-muted">
          {p.fonction} · {p.entreprise}
        </p>
        <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: cat.hex }}>
          {cat.libelle}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <InductionChip statut={p.induction} echeance={p.inductionEcheance} />
        {p.badgeStatut === 'ACTIF' ? (
          <span className="font-mono text-xs font-semibold text-ink">{p.badgeNumero}</span>
        ) : (
          <Badge tone="danger" dot>Badge bloqué</Badge>
        )}
      </div>
      {p.induction !== 'VALIDE' && (
        <Button variant="outline" size="sm" className="shrink-0" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
          Viser
        </Button>
      )}
    </li>
  );
}

function InductionChip({ statut, echeance }: { statut: InductionStatut; echeance?: string }) {
  if (statut === 'VALIDE') return <Badge tone="forest" dot>Induction valide · {echeance}</Badge>;
  if (statut === 'EXPIREE') return <Badge tone="danger" dot>Induction expirée</Badge>;
  return <Badge tone="amber" dot>Induction à viser</Badge>;
}

function DeclarerSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: { prenom: string; nom: string; fonction: string; entreprise: string; categorieId: string }) => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [entreprise, setEntreprise] = useState('Bâti-Sud');
  const [categorieId, setCategorieId] = useState('chantier');
  const [photo, setPhoto] = useState(false);
  const pret = prenom.trim() && nom.trim() && photo;

  const input = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Déclarer une personne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>

        {/* Photo in-app (jamais depuis la galerie) */}
        <div className="mb-4">
          <PhotoCapture label="Prendre la photo (dans l’app)" onCapture={() => setPhoto(true)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {input('Prénom', prenom, setPrenom, 'Prénom')}
          {input('Nom', nom, setNom, 'Nom')}
        </div>
        <div className="mt-3">{input('Fonction', fonction, setFonction, 'Ex. : électricien')}</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
            <select value={entreprise} onChange={(e) => setEntreprise(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {['Bâti-Sud', 'Aménag-Preneur K', 'Froid & Clim', 'VRD Services'].map((e) => <option key={e}>{e}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Catégorie</span>
            <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {Object.values(CATEGORIES).map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-muted">
          À la validation, l'induction est <b>à viser</b> : aucun badge actif tant que le visa n'est
          pas donné.
        </p>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim() || 'Ouvrier', entreprise, categorieId })}>
            Déclarer
          </Button>
        </div>
      </div>
    </div>
  );
}
