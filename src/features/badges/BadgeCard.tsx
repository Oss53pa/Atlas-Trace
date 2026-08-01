import { Avatar } from '../../components/ui/Avatar';
import { FakeQR } from './FakeQR';
import { SITE } from '../../data/badges';

export interface BadgeCardData {
  numero: string;
  typeLabel: string; // NOMINATIF · TEMPORAIRE · VISITEUR
  nom: string;
  prenom: string;
  fonction: string;
  entreprise: string;
  categorieLabel: string;
  categorieHex: string;
  zoneLabel: string;
  validite: string;
  accompagnateur?: string;
}

/**
 * Badge au format carte (CR80 ≈ 1.585), recto : photo, identité, QR, bande de
 * catégorie à la charte du site. Le code QR n'est qu'une clé (R2).
 */
export function BadgeCard({ data }: { data: BadgeCardData }) {
  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-card-lg ring-1 ring-sand-300">
      {/* Bande de catégorie */}
      <div className="flex items-center justify-between px-4 py-2 text-white" style={{ background: data.categorieHex }}>
        <span className="font-display text-xl leading-none">Trace</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/85">
          {data.typeLabel}
        </span>
      </div>

      <div className="flex gap-3 p-4">
        <div className="shrink-0">
          <Avatar nom={data.nom} prenom={data.prenom} size="md" className="h-24 w-24 rounded-2xl" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold leading-tight text-ink">
            {data.prenom} {data.nom}
          </p>
          <p className="truncate text-xs font-medium text-muted">{data.fonction}</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">{data.entreprise}</p>
          <span
            className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: data.categorieHex }}
          >
            {data.categorieLabel}
          </span>
          {data.accompagnateur && (
            <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
              Accompagné · {data.accompagnateur}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-sand-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Zone</p>
          <p className="truncate text-xs font-semibold text-ink">{data.zoneLabel}</p>
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">Validité</p>
          <p className="text-xs font-semibold text-ink">{data.validite}</p>
          <p className="mt-1.5 font-mono text-xs font-bold tracking-wide text-ink">{data.numero}</p>
        </div>
        <div className="shrink-0 rounded-lg border border-sand-200 p-1">
          <FakeQR value={`${SITE.site}|${data.numero}`} size={72} />
        </div>
      </div>

      {/* Mention légale au verso (info personnes, chap. 16) */}
      <div className="bg-sand-100 px-4 py-1.5 text-center text-[9px] leading-tight text-muted">
        {SITE.organisation} · {SITE.site} — Données traitées à des fins de sûreté du site. Aucune
        biométrie. Photo = contrôle visuel.
      </div>
    </div>
  );
}
