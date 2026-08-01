import { useMemo } from 'react';
import { Building, MapPin, CreditCard, Activity, Server, Globe } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { ORGANISATIONS, type Organisation, type StatutSite } from '../../data/editeur';

const siteChip: Record<StatutSite, React.ReactNode> = {
  ACTIF: <Badge tone="forest" dot>Actif</Badge>,
  EN_SERVICE: <Badge tone="amber" dot>En service</Badge>,
  CONFIGURATION: <Badge tone="neutral" dot>Configuration</Badge>,
};

export function OrganisationsEditeur() {
  const totaux = useMemo(() => ({
    orgs: ORGANISATIONS.length,
    sites: ORGANISATIONS.reduce((s, o) => s + o.sites.length, 0),
    badges: ORGANISATIONS.reduce((s, o) => s + o.badgesActifs, 0),
    controles: ORGANISATIONS.reduce((s, o) => s + o.controles30j, 0),
  }), []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Building className="h-3.5 w-3.5" /> M20 · Éditeur</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Organisations &amp; sites</h1>
        <p className="mt-1 text-sm text-muted">Supervision multi-organisations. Cloisonnement absolu — aucune requête transverse hors de ce back office nominatif et journalisé.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard tone="forest" label="Organisations" value={totaux.orgs} icon={<Building className="h-5 w-5" />} />
        <StatCard label="Sites" value={totaux.sites} icon={<MapPin className="h-5 w-5" />} />
        <StatCard tone="amber" label="Badges actifs" value={totaux.badges.toLocaleString('fr-FR')} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Contrôles / 30 j" value={totaux.controles.toLocaleString('fr-FR')} icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="space-y-3">
        {ORGANISATIONS.map((o) => (
          <OrgCard key={o.id} o={o} />
        ))}
      </div>
    </div>
  );
}

function OrgCard({ o }: { o: Organisation }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">{o.nom}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {o.pays}</span>
            <span className="inline-flex items-center gap-1"><Server className="h-3 w-3" /> Hébergement {o.hebergement.toLowerCase()}</span>
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div><p className="text-lg font-extrabold text-ink">{o.badgesActifs}</p><p className="text-[10px] text-muted">badges actifs</p></div>
          <div><p className="text-lg font-extrabold text-ink">{o.controles30j.toLocaleString('fr-FR')}</p><p className="text-[10px] text-muted">contrôles / 30 j</p></div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-sand-200 pt-3">
        {o.sites.map((s) => (
          <span key={s.nom} className="inline-flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-sand-200">
            <MapPin className="h-3.5 w-3.5 text-forest-500" /> {s.nom} {siteChip[s.statut]}
          </span>
        ))}
      </div>
    </div>
  );
}
