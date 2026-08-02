import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Check, X, Send, Loader2, Trash2, ShieldCheck, AlertTriangle, Repeat } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useEntreprises } from '../materiel/referentiel';
import {
  assurerRegistre,
  chargerLignes,
  ajouterLigne,
  basculerPresent,
  retirerLigne,
  confirmerLigne,
  contesterLigne,
  remplacerLigne,
  enregistrerRegistre,
  type RegistreEntete,
  type RegistreLigne,
  type StatutConfirmation,
} from './api';

/**
 * M4 — registre de présence vivant, en base. Le référent ajoute, retire, bascule
 * et confirme à tout moment ; aucune de ces actions ne verrouille le registre.
 * Les lignes inscrites au portail (EN_ATTENTE) sont confirmées ou contestées ici.
 */
export function RegistreLive() {
  const entreprises = useEntreprises();
  const [entrepriseId, setEntrepriseId] = useState('');
  const [entete, setEntete] = useState<RegistreEntete | null>(null);
  const [lignes, setLignes] = useState<RegistreLigne[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [contest, setContest] = useState<RegistreLigne | null>(null);
  const [remplace, setRemplace] = useState<RegistreLigne | null>(null);
  const [horsDelai, setHorsDelai] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!entrepriseId && entreprises.length > 0) setEntrepriseId(entreprises[0].id);
  }, [entreprises, entrepriseId]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const rafraichirLignes = useCallback(async (listeId: string) => {
    setLignes(await chargerLignes(listeId));
  }, []);

  const ouvrir = useCallback(async (id: string) => {
    setChargement(true);
    setErreur(null);
    try {
      const e = await assurerRegistre(id);
      setEntete(e);
      await rafraichirLignes(e.listeId);
    } catch (err) {
      setErreur((err as Error).message);
      setEntete(null);
      setLignes([]);
    } finally {
      setChargement(false);
    }
  }, [rafraichirLignes]);

  useEffect(() => {
    if (entrepriseId) ouvrir(entrepriseId);
  }, [entrepriseId, ouvrir]);

  const effectif = useMemo(() => lignes.filter((l) => l.present && l.statutConfirmation !== 'CONTESTEE').length, [lignes]);
  const enAttente = useMemo(() => lignes.filter((l) => l.statutConfirmation === 'EN_ATTENTE').length, [lignes]);

  async function action<T>(fn: () => Promise<T>, ok?: string) {
    if (!entete) return;
    setErreur(null);
    try {
      await fn();
      await rafraichirLignes(entete.listeId);
      if (ok) flash(ok);
    } catch (err) {
      setErreur((err as Error).message);
    }
  }

  async function faireAjout(v: { nom: string; prenom: string; fonction: string }) {
    if (!entete) return;
    setErreur(null);
    try {
      const r = await ajouterLigne({ listeId: entete.listeId, nom: v.nom, prenom: v.prenom, fonction: v.fonction });
      flash(r.resultat === 'REFUSE'
        ? `Plafond atteint (${r.plafond}) — dérogation requise pour ajouter.`
        : 'Personne ajoutée');
      await rafraichirLignes(entete.listeId);
      setSheet(false);
    } catch (err) {
      setErreur((err as Error).message);
    }
  }

  async function faireRemplacement(v: { nom: string; prenom: string; fonction: string }) {
    if (!remplace || !entete) return;
    setErreur(null);
    try {
      const r = await remplacerLigne(remplace.id, v);
      flash(r.resultat === 'REFUSE'
        ? 'Déjà entré au poste — enregistrez d’abord sa sortie, puis remplacez.'
        : 'Personne remplacée · effectif inchangé');
      await rafraichirLignes(entete.listeId);
      setRemplace(null);
    } catch (err) {
      setErreur((err as Error).message);
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-sand-100">
      <header className="border-b border-sand-300 bg-sand-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-extrabold text-ink">Registre de présence</p>
          <Badge tone="forest" dot>Vivant · en base</Badge>
        </div>
        <select
          value={entrepriseId}
          onChange={(e) => setEntrepriseId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400"
        >
          {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
          {entreprises.map((e) => (
            <option key={e.id} value={e.id}>{e.raisonSociale}</option>
          ))}
        </select>
      </header>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-500 text-white">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-none text-ink">
              {effectif}
              {entete?.plafond != null && <span className="text-base font-bold text-muted"> / {entete.plafond}</span>}
            </p>
            <p className="text-xs text-muted">présents{entete?.plafond != null ? ' · plafond' : ' · pas de plafond'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {entete?.plafond != null && effectif >= entete.plafond && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
              <AlertTriangle className="h-3.5 w-3.5" /> Plafond atteint
            </span>
          )}
          {enAttente > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" /> {enAttente} à confirmer
            </span>
          )}
        </div>
      </div>

      {erreur && (
        <p className="mx-4 mb-2 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {chargement ? (
          <div className="flex justify-center py-10 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <ul className="space-y-1.5">
              {lignes.map((l) => (
                <LigneItem
                  key={l.id}
                  ligne={l}
                  onTogglePresent={() => action(() => basculerPresent(l.id, !l.present))}
                  onRetirer={() => action(() => retirerLigne(l.id), 'Ligne retirée')}
                  onConfirmer={() => action(() => confirmerLigne(l.id), 'Ligne confirmée')}
                  onContester={() => setContest(l)}
                  onRemplacer={() => setRemplace(l)}
                />
              ))}
            </ul>
            {lignes.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">Registre vide — ajoutez les présents du jour.</p>
            )}
            <button
              onClick={() => setSheet(true)}
              disabled={!entete}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-forest-300 bg-forest-50 py-3 text-sm font-semibold text-forest-600 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" /> Ajouter une personne
            </button>
            <p className="mt-2 text-center text-[11px] text-muted">
              Ajout, retrait ou remplacement à tout moment — aucun verrouillage horaire.
            </p>
          </>
        )}
      </div>

      <div className="border-t border-sand-300 bg-white px-4 py-3">
        <button
          onClick={() => setHorsDelai((v) => !v)}
          className={`mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${horsDelai ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-sand-50 text-muted ring-sand-300'}`}
        >
          {horsDelai ? 'Après l’heure indicative' : 'Dans l’heure indicative'}
        </button>
        <Button
          variant={horsDelai ? 'accent' : 'primary'}
          size="lg"
          block
          disabled={!entete}
          icon={<Send className="h-5 w-5" />}
          onClick={() => action(() => enregistrerRegistre(entete!.listeId, horsDelai), 'Registre enregistré · toujours modifiable')}
        >
          Enregistrer le registre
        </Button>
      </div>

      {sheet && entete && (
        <AjoutSheet onAnnuler={() => setSheet(false)} onConfirmer={(v) => faireAjout({ nom: v.nom, prenom: v.prenom, fonction: v.fonction })} />
      )}

      {contest && (
        <ContestSheet
          ligne={contest}
          onAnnuler={() => setContest(null)}
          onConfirmer={async (motif) => {
            await action(() => contesterLigne(contest.id, motif), 'Ligne contestée · incident créé');
            setContest(null);
          }}
        />
      )}

      {remplace && (
        <RemplaceSheet ligne={remplace} onAnnuler={() => setRemplace(null)} onConfirmer={faireRemplacement} />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

const CONF: Record<StatutConfirmation, { tone: 'forest' | 'amber' | 'danger' | 'neutral'; label: string } | null> = {
  CONFIRMEE: null,
  EN_ATTENTE: { tone: 'amber', label: 'À confirmer' },
  CONFIRMEE_PAR_SILENCE: { tone: 'neutral', label: 'Confirmée (silence)' },
  CONTESTEE: { tone: 'danger', label: 'Contestée' },
  REMPLACEE: { tone: 'neutral', label: 'Remplacée' },
};

function LigneItem({
  ligne,
  onTogglePresent,
  onRetirer,
  onConfirmer,
  onContester,
  onRemplacer,
}: {
  ligne: RegistreLigne;
  onTogglePresent: () => void;
  onRetirer: () => void;
  onConfirmer: () => void;
  onContester: () => void;
  onRemplacer: () => void;
}) {
  const conf = CONF[ligne.statutConfirmation];
  const enAttente = ligne.statutConfirmation === 'EN_ATTENTE';
  const remplacee = ligne.statutConfirmation === 'REMPLACEE';
  const actionnable = !enAttente && !remplacee;
  return (
    <li className={`rounded-xl bg-white px-3 py-2.5 shadow-card ring-1 ring-sand-300/70 ${ligne.present ? '' : 'opacity-55'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePresent}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${ligne.present ? 'border-forest-500 bg-forest-500 text-white' : 'border-sand-400 bg-white text-transparent'}`}
          aria-label={ligne.present ? 'Présent' : 'Absent'}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{ligne.prenom} {ligne.nom}</p>
          <p className="truncate text-xs text-muted">{ligne.fonction || '—'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {ligne.tournant && <Badge tone="amber">Tournant</Badge>}
          {ligne.source === 'PORTAIL' && <Badge tone="neutral">Portail</Badge>}
          {conf && <Badge tone={conf.tone}>{conf.label}</Badge>}
        </div>
        {actionnable && (
          <div className="ml-1 flex shrink-0 items-center gap-0.5">
            <button onClick={onRemplacer} className="rounded-lg p-1.5 text-muted hover:bg-forest-50 hover:text-forest-600" aria-label="Remplacer">
              <Repeat className="h-4 w-4" />
            </button>
            <button onClick={onRetirer} className="rounded-lg p-1.5 text-muted hover:bg-danger-50 hover:text-danger-600" aria-label="Retirer">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {enAttente && (
        <div className="mt-2 flex gap-2 border-t border-sand-200 pt-2">
          <Button variant="primary" size="sm" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={onConfirmer}>Confirmer</Button>
          <Button variant="ghost" size="sm" onClick={onContester}>Contester</Button>
        </div>
      )}
    </li>
  );
}

function AjoutSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: { prenom: string; nom: string; fonction: string }) => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const pret = prenom.trim() && nom.trim() && !envoi;
  const champ = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
    </label>
  );
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/40">
      <div className="rounded-t-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Ajouter une personne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-muted">Ajout au registre du jour — aucun motif requis.</p>
        <div className="grid grid-cols-2 gap-3">
          {champ('Prénom', prenom, setPrenom, 'Prénom')}
          {champ('Nom', nom, setNom, 'Nom')}
        </div>
        <div className="mt-3">{champ('Fonction', fonction, setFonction, 'Ex. : manœuvre')}</div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            onClick={() => { setEnvoi(true); onConfirmer({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim() }); }}>
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContestSheet({
  ligne,
  onAnnuler,
  onConfirmer,
}: {
  ligne: RegistreLigne;
  onAnnuler: () => void;
  onConfirmer: (motif: string) => void;
}) {
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const pret = motif.trim().length >= 5 && !envoi;
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/40">
      <div className="rounded-t-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Contester la ligne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-muted">
          {ligne.prenom} {ligne.nom} — inscrit au portail. La contestation crée un incident ; elle ne rétroagit pas sur la présence déjà eue.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Motif</span>
          <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="Ex. : personne inconnue de l'entreprise"
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="danger" size="lg" block disabled={!pret}
            icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            onClick={() => { setEnvoi(true); onConfirmer(motif.trim()); }}>
            Contester
          </Button>
        </div>
      </div>
    </div>
  );
}

function RemplaceSheet({
  ligne,
  onAnnuler,
  onConfirmer,
}: {
  ligne: RegistreLigne;
  onAnnuler: () => void;
  onConfirmer: (v: { nom: string; prenom: string; fonction: string }) => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const pret = prenom.trim() && nom.trim() && !envoi;
  const champ = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
    </label>
  );
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/40">
      <div className="rounded-t-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Remplacer une personne</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-muted">
          <b className="text-ink">{ligne.prenom} {ligne.nom}</b> est remplacé(e) — l'effectif ne change pas, la ligne d'origine est conservée. Aucun motif requis. Refusé si déjà entré au poste.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {champ('Prénom', prenom, setPrenom, 'Prénom')}
          {champ('Nom', nom, setNom, 'Nom')}
        </div>
        <div className="mt-3">{champ('Fonction', fonction, setFonction, 'Ex. : manœuvre')}</div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            onClick={() => { setEnvoi(true); onConfirmer({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim() }); }}>
            Remplacer
          </Button>
        </div>
      </div>
    </div>
  );
}
