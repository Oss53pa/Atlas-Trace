import { useEffect, useState } from 'react';
import {
  Link2, LogIn, Loader2, MapPin, Users, ShieldOff, HelpCircle, Check, Send, Clock,
  UserPlus, Trash2, ShieldCheck, AlertTriangle, X, Repeat,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

interface Personne { id: string; nom: string; prenom: string; fonction: string; regime: string; induction_statut: string }
type StatutConf = 'CONFIRMEE' | 'EN_ATTENTE' | 'CONFIRMEE_PAR_SILENCE' | 'CONTESTEE' | 'REMPLACEE';
interface RLigne {
  id: string; nom: string; prenom: string; fonction: string | null;
  present: boolean; tournant: boolean; source: 'REFERENT' | 'PORTAIL';
  statut_confirmation: StatutConf; motif_contestation: string | null;
}
interface Registre { listeId: string; statut: string; effectif: number; deposeeAt: string | null }
interface Resultat {
  statut: 'ACTIF' | 'REVOQUE' | 'INCONNU';
  referent?: string; entreprise?: string; site?: string; organisation?: string;
  dateJour?: string; personnes?: Personne[]; registre?: Registre; lignes?: RLigne[];
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

  async function ouvrir(j: string) {
    setJeton(j); setCharge(true); setErr(null); setRes(null);
    const { data, error } = await supabase.functions.invoke('referent-portal', { body: { jeton: j } });
    if (error) setErr(error.message); else setRes(data as Resultat);
    setCharge(false);
  }

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
          <p className="mt-1 text-sm text-muted">Votre lien vous identifie et ouvre le registre de votre entreprise. Aucun mot de passe.</p>
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

        {res && !charge && res.statut === 'ACTIF' && <PortailActif res={res} jeton={jeton} />}
        {res && !charge && res.statut === 'REVOQUE' && (
          <div className="mt-4 rounded-2xl bg-danger-50 p-5 text-center ring-1 ring-danger-100">
            <ShieldOff className="mx-auto h-8 w-8 text-danger-500" />
            <p className="mt-2 text-sm font-bold text-danger-600">Lien révoqué</p>
            <p className="mt-1 text-xs text-danger-600">Ce lien n’est plus valide. Rapprochez-vous de la direction du site.</p>
          </div>
        )}
        {res && !charge && res.statut === 'INCONNU' && (
          <div className="mt-4 rounded-2xl bg-white p-5 text-center shadow-card ring-1 ring-sand-300/70">
            <HelpCircle className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-sm font-bold text-ink">Lien inconnu</p>
          </div>
        )}
      </div>
    </div>
  );
}

const CONF: Record<StatutConf, { tone: 'forest' | 'amber' | 'danger' | 'neutral'; label: string } | null> = {
  CONFIRMEE: null,
  EN_ATTENTE: { tone: 'amber', label: 'À confirmer' },
  CONFIRMEE_PAR_SILENCE: { tone: 'neutral', label: 'Confirmée (silence)' },
  CONTESTEE: { tone: 'danger', label: 'Contestée' },
  REMPLACEE: { tone: 'neutral', label: 'Remplacée' },
};

function PortailActif({ res, jeton }: { res: Resultat; jeton: string }) {
  const [lignes, setLignes] = useState<RLigne[]>(res.lignes ?? []);
  const [registre, setRegistre] = useState<Registre | undefined>(res.registre);
  const [busy, setBusy] = useState(false);
  const [horsDelai, setHorsDelai] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [add, setAdd] = useState(false);
  const [contest, setContest] = useState<RLigne | null>(null);
  const [remplace, setRemplace] = useState<RLigne | null>(null);

  const effectif = lignes.filter((l) => l.present && l.statut_confirmation !== 'CONTESTEE').length;
  const enAttente = lignes.filter((l) => l.statut_confirmation === 'EN_ATTENTE').length;
  const dejaListe = new Set(lignes.map((l) => `${l.prenom.toLowerCase()} ${l.nom.toLowerCase()}`));
  const vivier = (res.personnes ?? []).filter((p) => !dejaListe.has(`${p.prenom.toLowerCase()} ${p.nom.toLowerCase()}`));

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function recharger() {
    const { data } = await supabase.functions.invoke('referent-portal', { body: { jeton, date: res.dateJour } });
    const r = data as Resultat;
    if (r?.lignes) setLignes(r.lignes);
    if (r?.registre) setRegistre(r.registre);
  }

  async function agir(action: string, extra: Record<string, unknown>, ok?: string) {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('referent-portal', { body: { jeton, date: res.dateJour, action, ...extra } });
    const e = error?.message || (data as { error?: string })?.error;
    if (e) { flash('Erreur : ' + e); setBusy(false); return false; }
    await recharger();
    setBusy(false);
    if (ok) flash(ok);
    return true;
  }

  async function remplacer(v: { nom: string; prenom: string; fonction: string }) {
    if (!remplace) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('referent-portal', { body: { jeton, date: res.dateJour, action: 'remplacer', ligneId: remplace.id, ...v } });
    const e = error?.message || (data as { error?: string })?.error;
    if (e) { flash('Erreur : ' + e); setBusy(false); return; }
    flash((data as { resultat?: string })?.resultat === 'REFUSE'
      ? 'Déjà entré — enregistrez d’abord sa sortie, puis remplacez.'
      : 'Personne remplacée · effectif inchangé');
    await recharger();
    setBusy(false);
    setRemplace(null);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-forest-500 p-5 text-white shadow-card">
        <p className="flex items-center gap-2 text-lg font-extrabold"><Check className="h-5 w-5" strokeWidth={3} /> {res.entreprise}</p>
        <p className="mt-1 text-sm text-white/90">Référent {res.referent} · {res.organisation}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><MapPin className="h-3.5 w-3.5" /> {res.site}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> Registre du {fmt(res.dateJour)}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-ink"><Users className="h-4 w-4 text-forest-500" /> Présents aujourd’hui</p>
          <div className="flex items-center gap-1.5">
            {enAttente > 0 && <Badge tone="amber" dot>{enAttente} à confirmer</Badge>}
            <Badge tone="forest">{effectif} présents</Badge>
          </div>
        </div>

        <ul className="space-y-1.5">
          {lignes.map((l) => {
            const conf = CONF[l.statut_confirmation];
            const attente = l.statut_confirmation === 'EN_ATTENTE';
            return (
              <li key={l.id} className={`rounded-xl px-3 py-2 ring-1 ${l.present ? 'bg-sand-50 ring-sand-200' : 'bg-white ring-sand-200 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <button disabled={busy} onClick={() => agir('basculer', { ligneId: l.id, present: !l.present })}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${l.present ? 'border-forest-500 bg-forest-500 text-white' : 'border-sand-400 bg-white text-transparent'}`}><Check className="h-4 w-4" strokeWidth={3} /></button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{l.prenom} {l.nom}</p>
                    <p className="truncate text-xs text-muted">{l.fonction || '—'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {l.tournant && <Badge tone="amber">Tournant</Badge>}
                    {l.source === 'PORTAIL' && <Badge tone="neutral">Portail</Badge>}
                    {conf && <Badge tone={conf.tone}>{conf.label}</Badge>}
                  </div>
                  {!attente && l.statut_confirmation !== 'REMPLACEE' && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button disabled={busy} onClick={() => setRemplace(l)} className="rounded-lg p-1.5 text-muted hover:bg-forest-50 hover:text-forest-600" aria-label="Remplacer"><Repeat className="h-4 w-4" /></button>
                      <button disabled={busy} onClick={() => agir('retirer', { ligneId: l.id }, 'Ligne retirée')} className="rounded-lg p-1.5 text-muted hover:bg-danger-50 hover:text-danger-600" aria-label="Retirer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                {attente && (
                  <div className="mt-2 flex gap-2 border-t border-sand-200 pt-2">
                    <Button variant="primary" size="sm" disabled={busy} icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => agir('confirmer', { ligneId: l.id }, 'Ligne confirmée')}>Confirmer</Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => setContest(l)}>Contester</Button>
                  </div>
                )}
              </li>
            );
          })}
          {lignes.length === 0 && <li className="py-6 text-center text-sm text-muted">Registre vide — ajoutez les présents du jour.</li>}
        </ul>

        <button onClick={() => setAdd(true)} disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-forest-300 bg-forest-50 py-2.5 text-sm font-semibold text-forest-600 disabled:opacity-50">
          <UserPlus className="h-4 w-4" /> Ajouter une personne
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">
          Ajout, retrait ou remplacement à tout moment — aucun verrouillage horaire. Écriture serveur (edge en service_role) : le référent n’a aucun droit direct sur la base.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        {registre && registre.statut !== 'NON_DEPOSE' && (
          <p className="mb-3 flex items-center gap-2 text-xs text-muted">
            {registre.statut === 'HORS_DELAI' ? <Badge tone="amber" dot>Enregistré après l’heure</Badge> : <Badge tone="forest" dot>Enregistré</Badge>}
            {registre.deposeeAt && <>le {new Date(registre.deposeeAt).toLocaleString('fr-FR')}</>}
          </p>
        )}
        <label className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
          <input type="checkbox" checked={horsDelai} onChange={(e) => setHorsDelai(e.target.checked)} /> Enregistrement après l’heure indicative
        </label>
        <Button variant={horsDelai ? 'accent' : 'primary'} block disabled={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          onClick={() => agir('enregistrer', { horsDelai }, 'Registre enregistré · toujours modifiable')}>
          Enregistrer le registre du jour
        </Button>
      </div>

      {add && (
        <AjoutSheet
          vivier={vivier}
          busy={busy}
          onAnnuler={() => setAdd(false)}
          onVivier={async (p) => { const ok = await agir('ajouter', { nom: p.nom, prenom: p.prenom, fonction: p.fonction, tournant: false }, 'Personne ajoutée'); if (ok) setAdd(false); }}
          onManuel={async (v) => { const ok = await agir('ajouter', { nom: v.nom, prenom: v.prenom, fonction: v.fonction, tournant: true }, 'Tournant ajouté'); if (ok) setAdd(false); }}
        />
      )}
      {contest && (
        <ContestSheet
          ligne={contest} busy={busy}
          onAnnuler={() => setContest(null)}
          onConfirmer={async (motif) => { const ok = await agir('contester', { ligneId: contest.id, motif }, 'Ligne contestée'); if (ok) setContest(null); }}
        />
      )}
      {remplace && (
        <RemplaceSheet ligne={remplace} busy={busy} onAnnuler={() => setRemplace(null)} onConfirmer={remplacer} />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function AjoutSheet({
  vivier, busy, onAnnuler, onVivier, onManuel,
}: {
  vivier: Personne[]; busy: boolean;
  onAnnuler: () => void;
  onVivier: (p: Personne) => void;
  onManuel: (v: { prenom: string; nom: string; fonction: string }) => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const pret = prenom.trim() && nom.trim() && !busy;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card-lg sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Ajouter une personne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        {vivier.length > 0 && (
          <>
            <p className="mb-2 mt-2 text-xs font-semibold text-muted">Depuis le vivier</p>
            <div className="flex flex-wrap gap-1.5">
              {vivier.map((p) => (
                <button key={p.id} disabled={busy} onClick={() => onVivier(p)}
                  className="rounded-full bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-inset ring-forest-200 hover:bg-forest-100 disabled:opacity-50">
                  + {p.prenom} {p.nom}
                </button>
              ))}
            </div>
            <div className="my-4 h-px bg-sand-200" />
          </>
        )}
        <p className="mb-2 text-xs font-semibold text-muted">Ou saisir un tournant (aucun motif requis)</p>
        <div className="grid grid-cols-2 gap-3">
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        </div>
        <input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Fonction (ex. : manœuvre)" className="mt-3 w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onManuel({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim() })}>Ajouter le tournant</Button>
        </div>
      </div>
    </div>
  );
}

function ContestSheet({
  ligne, busy, onAnnuler, onConfirmer,
}: {
  ligne: RLigne; busy: boolean;
  onAnnuler: () => void;
  onConfirmer: (motif: string) => void;
}) {
  const [motif, setMotif] = useState('');
  const pret = motif.trim().length >= 5 && !busy;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-lg sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Contester la ligne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 flex items-start gap-2 text-sm text-muted">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {ligne.prenom} {ligne.nom} — inscrit au portail. La contestation crée un incident ; elle ne rétroagit pas sur la présence déjà eue.
        </p>
        <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="Motif — ex. : personne inconnue de l'entreprise"
          className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="danger" size="lg" block disabled={!pret} onClick={() => onConfirmer(motif.trim())}>Contester</Button>
        </div>
      </div>
    </div>
  );
}

function RemplaceSheet({
  ligne, busy, onAnnuler, onConfirmer,
}: {
  ligne: RLigne; busy: boolean;
  onAnnuler: () => void;
  onConfirmer: (v: { nom: string; prenom: string; fonction: string }) => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const pret = prenom.trim() && nom.trim() && !busy;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-lg sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Remplacer une personne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-muted">
          <b className="text-ink">{ligne.prenom} {ligne.nom}</b> est remplacé(e) — l’effectif ne change pas, la ligne d’origine est conservée. Aucun motif. Refusé si déjà entré au poste.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        </div>
        <input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Fonction (ex. : manœuvre)" className="mt-3 w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim() })}>Remplacer</Button>
        </div>
      </div>
    </div>
  );
}

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');
