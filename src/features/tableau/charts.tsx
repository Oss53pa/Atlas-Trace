/** Mini-graphes en SVG pur — aucune dépendance externe. */

interface DonutSegment {
  label: string;
  value: number;
  color: string; // classe de couleur de trait (stroke via currentColor)
  hex: string;
}

export function Donut({
  segments,
  centre,
  sousTitre,
}: {
  segments: DonutSegment[];
  centre: string;
  sousTitre: string;
}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E9EDE5" strokeWidth="12" />
        {segments.map((seg) => {
          const len = (seg.value / total) * c;
          const el = (
            <circle
              key={seg.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.hex}
              strokeWidth="12"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="min-w-0">
        <p className="text-3xl font-extrabold leading-none text-ink">{centre}</p>
        <p className="mb-2 text-xs text-muted">{sousTitre}</p>
        <ul className="space-y-1">
          {segments.map((seg) => (
            <li key={seg.label} className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.hex }} />
              {seg.label}
              <span className="font-bold text-ink">{seg.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface Colonne {
  label: string;
  entrees: number;
  sorties: number;
}

/** Colonnes empilées entrées (vert profond) / sorties (vert clair) par heure. */
export function ColumnChart({ data }: { data: Colonne[] }) {
  const max = Math.max(...data.map((d) => d.entrees + d.sorties), 1);
  return (
    <div className="flex h-44 items-end gap-2">
      {data.map((d) => {
        const h = ((d.entrees + d.sorties) / max) * 100;
        const partEntrees = d.entrees + d.sorties ? (d.entrees / (d.entrees + d.sorties)) * 100 : 0;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="flex w-full max-w-[34px] flex-col justify-end overflow-hidden rounded-lg bg-sand-200"
              style={{ height: `${h}%`, minHeight: 6 }}
              title={`${d.label}h — ${d.entrees} entrées, ${d.sorties} sorties`}
            >
              <div className="w-full bg-forest-300" style={{ height: `${100 - partEntrees}%` }} />
              <div className="w-full bg-forest-500" style={{ height: `${partEntrees}%` }} />
            </div>
            <span className="text-[11px] font-medium text-muted">{d.label}h</span>
          </div>
        );
      })}
    </div>
  );
}

/** Barre horizontale : effectif entré sur déclaré, normalisée sur un max global. */
export function BarEffectif({
  entre,
  declare,
  max,
}: {
  entre: number;
  declare: number;
  max: number;
}) {
  const wDeclare = (declare / max) * 100;
  const wEntre = (entre / max) * 100;
  return (
    <div className="relative h-3 w-full rounded-full bg-sand-200">
      {/* déclaré : gabarit clair */}
      <div className="absolute inset-y-0 left-0 rounded-full bg-forest-100" style={{ width: `${wDeclare}%` }} />
      {/* entré : rempli */}
      <div className="absolute inset-y-0 left-0 rounded-full bg-forest-500" style={{ width: `${wEntre}%` }} />
    </div>
  );
}
