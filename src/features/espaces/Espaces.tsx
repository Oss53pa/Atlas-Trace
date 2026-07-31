import { useState } from 'react';
import {
  Landmark, Compass, ShieldCheck, HardHat, Store, ArrowRight, ArrowLeft, Link2, UserCog,
  Layers, ArrowUpRight, Boxes, HardDrive, ClipboardCheck, Truck, KeyRound,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { CARTES, FONCTIONS_ACCES, PROFILS, TYPES_ENTITE, type Carte, type Portee, type Profil } from '../../data/cartes';

const ICONE: Record<string, React.ReactNode> = {
  moa: <Landmark className="h-5 w-5" />, moe: <Compass className="h-5 w-5" />, hse: <ShieldCheck className="h-5 w-5" />,
  gardiennage: <ShieldCheck className="h-5 w-5" />, pilote: <Truck className="h-5 w-5" />, referent: <HardHat className="h-5 w-5" />,
  representant: <UserCog className="h-5 w-5" />, donneur_ordre: <Store className="h-5 w-5" />, moe_preneur: <Compass className="h-5 w-5" />,
};
const HEX: Record<string, string> = {
  moa: '#0F5044', moe: '#2E7C68', hse: '#0A2E28', gardiennage: '#6F7C75', pilote: '#2E7C68',
  referent: '#C08A2A', representant: '#A87C1E', donneur_ordre: '#6F7C75', moe_preneur: '#2E7C68',
};
const PORTEE_LABEL: Record<Portee, string> = { ORGANISATION: 'Organisation', SITE: 'Site', EMPRISE: 'Emprise', POSTE: 'Poste', ENTITE: 'Entité' };
const porteeTxt = (p: Portee | Portee[]) => (Array.isArray(p) ? p.map((x) => PORTEE_LABEL[x]).join(' / ') : PORTEE_LABEL[p]);
const carteDe = (id: string) => CARTES.find((c) => c.id === id);

export function Espaces({ onOpen }: { onOpen: (vue: string) => void }) {
  const [sel, setSel] = useState<Profil | null>(null);
  if (sel) return <Atelier profil={sel} onRetour={() => setSel(null)} onOpen={onOpen} />;
  return <Selecteur onChoisir={setSel} />;
}

function Selecteur({ onChoisir }: { onChoisir: (p: Profil) => void }) {
  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700 ring-1 ring-forest-100"><Layers className="h-3.5 w-3.5" /> Une app · un catalogue de cartes · des profils composés</span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Profils &amp; interfaces composées</h1>
          <p className="mx-auto mt-1 max-w-2xl text-sm text-muted">Il n’existe pas une interface par groupe. Chaque carte déclare le pouvoir et la portée qu’elle exige ; un profil est une sélection de cartes, composée à l’exécution. Ajouter un acteur relève du paramétrage, jamais du développement.</p>
        </div>

        {/* Modèle à trois axes */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AxeCard icon={<Boxes className="h-4 w-4" />} titre="Entité" texte="Personne morale durable — porte fiche, personnel, parc, historique. Un type d’entité, pas une catégorie codée." />
          <AxeCard icon={<KeyRound className="h-4 w-4" />} titre="Rôle" texte="Ensemble nommé de pouvoirs atomiques, composé par l’organisation. Attribuable à n’importe quelle entité." />
          <AxeCard icon={<Compass className="h-4 w-4" />} titre="Portée" texte="Périmètre d’exercice : organisation, site, emprise ou poste. Le preneur = portée « emprise », pas de récursivité." />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROFILS.map((p) => (
            <button key={p.id} onClick={() => onChoisir(p)} className="group flex items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:ring-forest-300">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: HEX[p.id] }}>{ICONE[p.id]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-ink">{p.nom}</p>
                  {p.acces === 'LIEN' ? <Badge tone="amber"><Link2 className="h-3 w-3" /> Lien</Badge> : <Badge tone="forest">Interne</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">{p.typeEntite} · portée {p.portee}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted">{p.cartes.length} cartes</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest-600">Composer <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><HardDrive className="h-4 w-4 text-forest-500" /> Catalogue de cartes <Badge tone="neutral">{CARTES.length}</Badge></p>
            <p className="mt-1 text-xs text-muted">Une carte existe en <b className="text-ink">un seul exemplaire</b>. Si elle doit se comporter différemment selon la portée, c’est le filtrage qui s’en charge — jamais une seconde implémentation (§8.4).</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><Boxes className="h-4 w-4 text-amber-500" /> Types d’entité standard <Badge tone="neutral">{TYPES_ENTITE.length}</Badge></p>
            <div className="mt-2 flex flex-wrap gap-1">{TYPES_ENTITE.map((t) => <span key={t} className="rounded-full bg-sand-50 px-2 py-0.5 text-[11px] font-medium text-ink ring-1 ring-sand-300">{t}</span>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AxeCard({ icon, titre, texte }: { icon: React.ReactNode; titre: string; texte: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <p className="flex items-center gap-2 text-sm font-bold text-ink"><span className="text-forest-500">{icon}</span>{titre}</p>
      <p className="mt-1 text-xs text-muted">{texte}</p>
    </div>
  );
}

function Atelier({ profil, onRetour, onOpen }: { profil: Profil; onRetour: () => void; onOpen: (vue: string) => void }) {
  const cartes = profil.cartes.map(carteDe).filter(Boolean) as Carte[];
  const hex = HEX[profil.id];
  return (
    <div className="min-h-screen bg-sand-100">
      <div className="px-5 py-5 text-white" style={{ background: hex }}>
        <div className="mx-auto max-w-5xl">
          <button onClick={onRetour} className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Tous les profils</button>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">{ICONE[profil.id]}</span>
            <div>
              <p className="text-lg font-extrabold">{profil.nom}</p>
              <p className="text-xs text-white/85">{profil.typeEntite} · portée {profil.portee}{profil.invitePar ? ` · invité par la ${profil.invitePar}` : ''}</p>
            </div>
            <span className="ml-auto">{profil.acces === 'LIEN' ? <Badge tone="amber"><Link2 className="h-3 w-3" /> Accès par lien</Badge> : <Badge tone="forest">Compte interne</Badge>}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Interface composée</h2>
          <span className="text-xs text-muted">{cartes.length} cartes du catalogue · aucune interface dédiée (R16)</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {cartes.map((c) => <CarteTile key={c.id} carte={c} hex={hex} onOpen={() => onOpen(c.vue)} />)}
        </div>

        {profil.acces === 'LIEN' && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-bold text-ink">Trois accès par entité et par site (max)</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {FONCTIONS_ACCES.map((f) => (
                <div key={f.code} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
                  <p className="text-sm font-bold text-ink">{f.nom}</p>
                  <p className="mt-0.5 text-xs text-muted">{f.profil}</p>
                  <p className="mt-2 text-[11px]"><span className="font-semibold text-forest-700">Notifications :</span> <span className="text-muted">{f.notif}</span></p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">L’adjoint a des pouvoirs identiques et reste actif en permanence — aucune bascule d’absence (§4.2/4.3). Escalade des notifications si une action attend trop longtemps.</p>
          </div>
        )}

        {profil.note && (
          <div className="mt-4 rounded-2xl bg-forest-50 p-4 text-sm text-forest-700 ring-1 ring-forest-100">{profil.note}</div>
        )}
      </div>
    </div>
  );
}

function CarteTile({ carte, hex, onOpen }: { carte: Carte; hex: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex flex-col rounded-2xl bg-white p-3.5 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:ring-forest-300">
      <div className="flex items-start justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: hex }}><ClipboardCheck className="h-4 w-4" /></span>
        <ArrowUpRight className="h-4 w-4 text-sand-400 group-hover:text-forest-500" />
      </div>
      <p className="mt-2 text-sm font-bold text-ink">{carte.titre}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full bg-forest-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-forest-700">{carte.pouvoir}</span>
        <span className="rounded-full bg-sand-50 px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-sand-300">{porteeTxt(carte.portee)}</span>
      </div>
    </button>
  );
}
