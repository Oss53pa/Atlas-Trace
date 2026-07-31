import { useMemo, useState } from 'react';
import {
  Link2,
  Clock,
  UserPlus,
  Check,
  Lock,
  Users,
  Send,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LISTE_CONFIG, PERSONNEL_VEILLE } from '../../data/listes';

interface Ligne {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  regime: 'STABLE' | 'TOURNANT';
  sousTraitant?: string;
  present: boolean;
  ajoutee?: boolean;
  exceptionnelle?: boolean;
  motif?: string;
}

type Statut = 'BROUILLON' | 'DEPOSEE' | 'HORS_DELAI';

const initiales = (): Ligne[] =>
  PERSONNEL_VEILLE.map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    fonction: p.fonction,
    regime: p.regime,
    sousTraitant: p.sousTraitant,
    present: p.presentVeille,
  }));

export function ListeReferent() {
  const [lignes, setLignes] = useState<Ligne[]>(initiales);
  const [statut, setStatut] = useState<Statut>('BROUILLON');
  const [apresLimite, setApresLimite] = useState(false);
  const [sheet, setSheet] = useState<'tournant' | 'exceptionnel' | null>(null);
  const [heureDepot, setHeureDepot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const depose = statut !== 'BROUILLON';
  const verrouille = depose; // après dépôt : lecture seule, sauf ajout exceptionnel
  const effectif = useMemo(() => lignes.filter((l) => l.present).length, [lignes]);
  let seq = lignes.length;

  function togglePresent(id: string) {
    if (verrouille) return;
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, present: !l.present } : l)));
  }
  function toggleSousTraitant(id: string) {
    if (verrouille) return;
    setLignes((ls) =>
      ls.map((l) =>
        l.id === id
          ? { ...l, sousTraitant: l.sousTraitant ? undefined : 'Élec-Plus' }
          : l,
      ),
    );
  }

  function ajouterLigne(l: Omit<Ligne, 'id' | 'present' | 'regime'> & { exceptionnelle?: boolean }) {
    seq += 1;
    setLignes((ls) => [
      ...ls,
      { ...l, id: `add-${seq}`, present: true, regime: 'TOURNANT', ajoutee: true },
    ]);
  }

  function deposer() {
    const horsDelai = apresLimite;
    setStatut(horsDelai ? 'HORS_DELAI' : 'DEPOSEE');
    setHeureDepot(apresLimite ? '07:41' : LISTE_CONFIG.heureCourante);
    setToast(
      horsDelai
        ? `Liste déposée hors délai · ${effectif} présents · tracée`
        : `Liste déposée · ${effectif} présents`,
    );
    setTimeout(() => setToast(null), 2600);
  }

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="relative flex h-full flex-col bg-sand-100">
      {/* En-tête */}
      <header className="border-b border-sand-300 bg-sand-50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-extrabold text-ink">{LISTE_CONFIG.entreprise}</p>
            <p className="text-xs text-muted">
              Liste journalière · {LISTE_CONFIG.dateLabel}
            </p>
          </div>
          <StatutChip statut={statut} apresLimite={apresLimite} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone="neutral">
            <Link2 className="h-3 w-3" /> Lien référent · sans compte
          </Badge>
          <button
            onClick={() => setApresLimite((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              apresLimite
                ? 'bg-danger-50 text-danger-600 ring-danger-100'
                : 'bg-forest-50 text-forest-600 ring-forest-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            {apresLimite ? 'Après 07:30' : 'Avant 07:30'}
          </button>
        </div>
      </header>

      {/* Bandeau heure limite */}
      {apresLimite && !depose && (
        <div className="flex items-center gap-2 bg-danger-500 px-4 py-1.5 text-xs font-semibold text-white">
          <ShieldAlert className="h-3.5 w-3.5" />
          Heure limite dépassée — dépôt possible mais marqué hors délai
        </div>
      )}

      {/* Effectif */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-500 text-white">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-none text-ink">{effectif}</p>
            <p className="text-xs text-muted">présents déclarés</p>
          </div>
        </div>
        <p className="text-right text-xs text-muted">
          Dépôt attendu
          <br />
          <span className="font-bold text-ink">avant {LISTE_CONFIG.heureLimite}</span>
        </p>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ul className="space-y-1.5">
          {lignes.map((l) => (
            <LigneItem
              key={l.id}
              ligne={l}
              verrouille={verrouille}
              onTogglePresent={() => togglePresent(l.id)}
              onToggleSousTraitant={() => toggleSousTraitant(l.id)}
            />
          ))}
        </ul>

        {!verrouille && (
          <button
            onClick={() => setSheet('tournant')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-forest-300 bg-forest-50 py-3 text-sm font-semibold text-forest-600"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter un tournant
          </button>
        )}

        {verrouille && (
          <button
            onClick={() => setSheet('exceptionnel')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 py-3 text-sm font-semibold text-amber-700"
          >
            <Lock className="h-4 w-4" />
            Ajout exceptionnel motivé
          </button>
        )}
      </div>

      {/* Deux boutons (R : écran d'une page, deux boutons) */}
      {!depose ? (
        <div className="flex gap-2 border-t border-sand-300 bg-white px-4 py-3">
          <Button
            variant="ghost"
            size="lg"
            className="flex-none px-4"
            icon={<Save className="h-5 w-5" />}
            onClick={() => flash('Brouillon enregistré')}
          >
            Enregistrer
          </Button>
          <Button
            variant={apresLimite ? 'accent' : 'primary'}
            size="lg"
            block
            icon={<Send className="h-5 w-5" />}
            onClick={deposer}
          >
            Déposer la liste
          </Button>
        </div>
      ) : (
        <div className="border-t border-sand-300 bg-white px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2.5 text-sm font-semibold text-forest-700">
            <Check className="h-4 w-4 text-forest-500" />
            {statut === 'HORS_DELAI' ? 'Déposée hors délai' : 'Déposée'} à {heureDepot} · {effectif}{' '}
            présents · badges temporaires préparables
          </div>
        </div>
      )}

      {/* Feuilles */}
      {sheet === 'tournant' && (
        <AjoutSheet
          titre="Ajouter un tournant"
          sousTitre="Personne non déclarée à la veille, ajoutée pour aujourd'hui."
          avecMotif={false}
          onAnnuler={() => setSheet(null)}
          onConfirmer={({ prenom, nom, fonction }) => {
            ajouterLigne({ prenom, nom, fonction: fonction || 'Manœuvre' });
            setSheet(null);
            flash('Tournant ajouté');
          }}
        />
      )}
      {sheet === 'exceptionnel' && (
        <AjoutSheet
          titre="Ajout exceptionnel"
          sousTitre="Après l'heure limite : motif obligatoire, ajout tracé et visible au tableau de bord."
          avecMotif
          onAnnuler={() => setSheet(null)}
          onConfirmer={({ prenom, nom, fonction, motif }) => {
            ajouterLigne({ prenom, nom, fonction: fonction || 'Manœuvre', exceptionnelle: true, motif });
            setSheet(null);
            flash('Ajout exceptionnel tracé');
          }}
        />
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

/* ---------- Ligne ---------- */
function LigneItem({
  ligne,
  verrouille,
  onTogglePresent,
  onToggleSousTraitant,
}: {
  ligne: Ligne;
  verrouille: boolean;
  onTogglePresent: () => void;
  onToggleSousTraitant: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-card ring-1 ring-sand-300/70 ${
        ligne.present ? '' : 'opacity-55'
      }`}
    >
      <button
        onClick={onTogglePresent}
        disabled={verrouille}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
          ligne.present
            ? 'border-forest-500 bg-forest-500 text-white'
            : 'border-sand-400 bg-white text-transparent'
        } ${verrouille ? 'cursor-default' : ''}`}
        aria-label={ligne.present ? 'Présent' : 'Absent'}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {ligne.prenom} {ligne.nom}
        </p>
        <p className="truncate text-xs text-muted">{ligne.fonction}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex gap-1">
          {ligne.regime === 'TOURNANT' && <Badge tone="amber">Tournant</Badge>}
          {ligne.exceptionnelle && <Badge tone="danger">Exceptionnel</Badge>}
        </div>
        <button
          onClick={onToggleSousTraitant}
          disabled={verrouille}
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition-colors ${
            ligne.sousTraitant
              ? 'bg-forest-100 text-forest-700 ring-forest-200'
              : 'bg-white text-muted ring-sand-300'
          } ${verrouille ? 'cursor-default' : ''}`}
        >
          {ligne.sousTraitant ? `S-T · ${ligne.sousTraitant}` : 'Marquer S-T'}
        </button>
      </div>
    </li>
  );
}

/* ---------- Statut ---------- */
function StatutChip({ statut, apresLimite }: { statut: Statut; apresLimite: boolean }) {
  if (statut === 'DEPOSEE') return <Badge tone="forest" dot>Déposée</Badge>;
  if (statut === 'HORS_DELAI') return <Badge tone="amber" dot>Hors délai</Badge>;
  return apresLimite ? (
    <Badge tone="danger" dot>À déposer</Badge>
  ) : (
    <Badge tone="neutral" dot>Brouillon</Badge>
  );
}

/* ---------- Feuille d'ajout ---------- */
function AjoutSheet({
  titre,
  sousTitre,
  avecMotif,
  onAnnuler,
  onConfirmer,
}: {
  titre: string;
  sousTitre: string;
  avecMotif: boolean;
  onAnnuler: () => void;
  onConfirmer: (v: { prenom: string; nom: string; fonction: string; motif?: string }) => void;
}) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [motif, setMotif] = useState('');
  const pret = prenom.trim() && nom.trim() && (!avecMotif || motif.trim().length >= 5);

  const champ = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
      />
    </label>
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/40">
      <div className="rounded-t-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">{titre}</h3>
          <button onClick={onAnnuler} className="text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">{sousTitre}</p>
        <div className="grid grid-cols-2 gap-3">
          {champ('Prénom', prenom, setPrenom, 'Prénom')}
          {champ('Nom', nom, setNom, 'Nom')}
        </div>
        <div className="mt-3">{champ('Fonction', fonction, setFonction, 'Ex. : manœuvre')}</div>
        {avecMotif && (
          <div className="mt-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Motif de l'ajout</span>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={2}
                placeholder="Ex. : renfort demandé par le chef de chantier à 08:10"
                className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
              />
            </label>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button
            variant={avecMotif ? 'accent' : 'primary'}
            size="lg"
            block
            disabled={!pret}
            onClick={() => onConfirmer({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim(), motif: motif.trim() })}
          >
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}
