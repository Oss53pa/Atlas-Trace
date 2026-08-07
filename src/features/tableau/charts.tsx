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
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F1EBDC" strokeWidth="12" />
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

/** Colonnes empilées entrées (vert profond) / sorties (vert clair).
 *  Les libellés sont affichés tels quels (déjà formatés : « 08h » ou « 05/08 »). */
export function ColumnChart({ data }: { data: Colonne[] }) {
  const max = Math.max(...data.map((d) => d.entrees + d.sorties), 1);
  const dense = data.length > 12;
  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d, i) => {
        const h = ((d.entrees + d.sorties) / max) * 100;
        const partEntrees = d.entrees + d.sorties ? (d.entrees / (d.entrees + d.sorties)) * 100 : 0;
        // En vue dense (24 h / 30 j) on n'affiche qu'un libellé sur deux pour rester lisible.
        const montrerLabel = !dense || i % 2 === 0;
        return (
          <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="flex w-full max-w-[34px] flex-col justify-end overflow-hidden rounded-lg bg-sand-200"
              style={{ height: `${h}%`, minHeight: 6 }}
              title={`${d.label} — ${d.entrees} entrées, ${d.sorties} sorties`}
            >
              <div className="w-full bg-forest-300" style={{ height: `${100 - partEntrees}%` }} />
              <div className="w-full bg-forest-500" style={{ height: `${partEntrees}%` }} />
            </div>
            <span className="h-3 text-[10px] font-medium text-muted">{montrerLabel ? d.label : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Sparkline : courbe compacte avec aire dégradée, SVG pur, sans axes. */
export function Sparkline({ data, color = '#0F5044', className }: { data: number[]; color?: string; className?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 28;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`);
  const trace = 'M' + pts.join(' L');
  const aire = `${trace} L${w.toFixed(1)},${h} L0,${h} Z`;
  const id = 'sp-' + data.length + '-' + Math.round(max);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className ?? 'h-7 w-full'} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={aire} fill={`url(#${id})`} />
      <path d={trace} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
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
