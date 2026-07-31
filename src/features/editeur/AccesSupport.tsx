import { useState } from 'react';
import { ShieldCheck, Plus, Check, X, Eye, UserCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ACCES_SUPPORT_INIT, COLLABORATEURS_EDITEUR, ORGANISATIONS, type AccesSupport as Acces } from '../../data/editeur';

export function AccesSupport() {
  const [acces, setAcces] = useState<Acces[]>(ACCES_SUPPORT_INIT);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }
  function ouvrir(v: { collaborateur: string; organisation: string; motif: string }) {
    setAcces((as) => [{ id: `s-${as.length}`, ...v, date: '31/07 10:05', duree: 'en cours' }, ...as]);
    setSheet(false);
    flash('Accès ouvert · nominatif, motivé, journalisé et visible du client');
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><ShieldCheck className="h-3.5 w-3.5" /> M20 · Éditeur</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Journal des accès support</h1>
          <p className="mt-1 text-sm text-muted">
            Tout accès d'un collaborateur Atlas Studio aux données d'un client est nominatif, motivé et journalisé.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>Ouvrir un accès support</Button>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-700 ring-1 ring-forest-100">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
        Ce journal est consultable par le client concerné. C'est une exigence de confiance, pas une commodité technique.
      </div>

      <ul className="space-y-2">
        {acces.map((a) => (
          <li key={a.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink"><UserCheck className="h-4 w-4 text-forest-500" /> {a.collaborateur}</p>
                <p className="mt-0.5 text-xs text-muted">Organisation : <span className="font-semibold text-ink">{a.organisation}</span></p>
                <p className="mt-1 text-sm text-ink">Motif : {a.motif}</p>
              </div>
              <div className="text-right">
                <p className="text-xs tabular-nums text-muted">{a.date}</p>
                {a.duree === 'en cours' ? <Badge tone="amber" dot>En cours</Badge> : <Badge tone="neutral">{a.duree}</Badge>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {sheet && <AccesSheet onAnnuler={() => setSheet(false)} onConfirmer={ouvrir} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function AccesSheet({ onAnnuler, onConfirmer }: { onAnnuler: () => void; onConfirmer: (v: { collaborateur: string; organisation: string; motif: string }) => void }) {
  const [collaborateur, setCollaborateur] = useState(COLLABORATEURS_EDITEUR[0]);
  const [organisation, setOrganisation] = useState(ORGANISATIONS[0].nom);
  const [motif, setMotif] = useState('');
  const pret = motif.trim().length >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Ouvrir un accès support</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">L'accès sera journalisé et visible du client. Le motif est obligatoire.</p>

        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Collaborateur</span>
          <select value={collaborateur} onChange={(e) => setCollaborateur(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {COLLABORATEURS_EDITEUR.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Organisation cliente</span>
          <select value={organisation} onChange={(e) => setOrganisation(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {ORGANISATIONS.map((o) => <option key={o.id}>{o.nom}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Motif de l'accès</span>
          <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="Ex. : diagnostic d'un problème de synchronisation signalé par le client"
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={() => onConfirmer({ collaborateur, organisation, motif: motif.trim() })}>
            Ouvrir l'accès (journalisé)
          </Button>
        </div>
      </div>
    </div>
  );
}
