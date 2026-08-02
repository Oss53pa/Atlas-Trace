import { useMemo, useState } from 'react';
import { Link2, Clock, UserPlus, Check, Users, Send, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthz } from '../../lib/authz';
import { LISTE_CONFIG, PERSONNEL_VEILLE } from '../../data/listes';
import { RegistreLive } from './RegistreLive';

/** Registre réel (connecté + DEPOSER_LISTE) ; sinon démonstration réaménagée. */
export function ListeReferent() {
  const { connecte, a } = useAuthz();
  return connecte && a('DEPOSER_LISTE') ? <RegistreLive /> : <RegistreDemo />;
}

/**
 * M4 — registre de présence vivant. Remplace la liste journalière figée :
 * le référent ajoute, retire ou remplace à tout moment, avant, pendant ou après
 * l'ouverture. AUCUN verrouillage horaire — un ajout à 14 h est un ajout normal,
 * sans qualification d'exception. L'heure de dépôt n'est qu'indicative.
 */
interface Ligne {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  regime: 'STABLE' | 'TOURNANT';
  sousTraitant?: string;
  present: boolean;
  ajoutee?: boolean;
  /** Source de la ligne : référent (déclarée) ou portail (inscrite au poste). */
  source: 'REFERENT' | 'PORTAIL';
}

type StatutIndicatif = 'NON_DEPOSE' | 'DEPOSE' | 'HORS_DELAI';

const initiales = (): Ligne[] =>
  PERSONNEL_VEILLE.map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    fonction: p.fonction,
    regime: p.regime,
    sousTraitant: p.sousTraitant,
    present: p.presentVeille,
    source: 'REFERENT',
  }));

function RegistreDemo() {
  const [lignes, setLignes] = useState<Ligne[]>(initiales);
  const [statut, setStatut] = useState<StatutIndicatif>('NON_DEPOSE');
  const [apresHeure, setApresHeure] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [heureDepot, setHeureDepot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const effectif = useMemo(() => lignes.filter((l) => l.present).length, [lignes]);
  let seq = lignes.length;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  function togglePresent(id: string) {
    // Registre vivant : toujours modifiable, même après enregistrement.
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, present: !l.present } : l)));
  }
  function toggleSousTraitant(id: string) {
    setLignes((ls) =>
      ls.map((l) => (l.id === id ? { ...l, sousTraitant: l.sousTraitant ? undefined : 'Élec-Plus' } : l)),
    );
  }
  function ajouterLigne(l: { prenom: string; nom: string; fonction: string }) {
    seq += 1;
    setLignes((ls) => [
      ...ls,
      { ...l, id: `add-${seq}`, present: true, regime: 'TOURNANT', ajoutee: true, source: 'REFERENT' },
    ]);
  }

  function enregistrer() {
    // « Dépôt » indicatif : ne verrouille rien, le registre reste vivant.
    setStatut(apresHeure ? 'HORS_DELAI' : 'DEPOSE');
    setHeureDepot(apresHeure ? '08:12' : LISTE_CONFIG.heureCourante);
    flash(
      apresHeure
        ? `Registre enregistré (après l'heure indicative) · ${effectif} présents · toujours modifiable`
        : `Registre enregistré · ${effectif} présents · toujours modifiable`,
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-sand-100">
      <header className="border-b border-sand-300 bg-sand-50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-extrabold text-ink">{LISTE_CONFIG.entreprise}</p>
            <p className="text-xs text-muted">Registre de présence · {LISTE_CONFIG.dateLabel}</p>
          </div>
          <StatutChip statut={statut} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone="neutral">
            <Link2 className="h-3 w-3" /> Lien référent · sans compte
          </Badge>
          <button
            onClick={() => setApresHeure((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              apresHeure ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-forest-50 text-forest-600 ring-forest-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            {apresHeure ? `Après ${LISTE_CONFIG.heureLimite}` : `Avant ${LISTE_CONFIG.heureLimite}`}
          </button>
        </div>
      </header>

      {/* Registre vivant : aucun verrouillage horaire */}
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
        <p className="max-w-[9rem] text-right text-[11px] text-muted">
          Heure indicative de dépôt <span className="font-bold text-ink">{LISTE_CONFIG.heureLimite}</span> · sans effet bloquant
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ul className="space-y-1.5">
          {lignes.map((l) => (
            <LigneItem
              key={l.id}
              ligne={l}
              onTogglePresent={() => togglePresent(l.id)}
              onToggleSousTraitant={() => toggleSousTraitant(l.id)}
            />
          ))}
        </ul>

        <button
          onClick={() => setSheet(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-forest-300 bg-forest-50 py-3 text-sm font-semibold text-forest-600"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter une personne
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">
          Ajout, retrait ou remplacement possible à tout moment — avant, pendant ou après l'ouverture.
        </p>
      </div>

      <div className="border-t border-sand-300 bg-white px-4 py-3">
        <Button variant={apresHeure ? 'accent' : 'primary'} size="lg" block icon={<Send className="h-5 w-5" />} onClick={enregistrer}>
          {statut === 'NON_DEPOSE' ? 'Enregistrer le registre' : 'Mettre à jour le registre'}
        </Button>
        {statut !== 'NON_DEPOSE' && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700">
            <Check className="h-4 w-4 text-forest-500" />
            {statut === 'HORS_DELAI' ? 'Enregistré après l’heure indicative' : 'Enregistré'} à {heureDepot} · {effectif} présents · registre vivant
          </div>
        )}
      </div>

      {sheet && (
        <AjoutSheet
          onAnnuler={() => setSheet(false)}
          onConfirmer={({ prenom, nom, fonction }) => {
            ajouterLigne({ prenom, nom, fonction: fonction || 'Manœuvre' });
            setSheet(false);
            flash('Personne ajoutée au registre');
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
  onTogglePresent,
  onToggleSousTraitant,
}: {
  ligne: Ligne;
  onTogglePresent: () => void;
  onToggleSousTraitant: () => void;
}) {
  return (
    <li className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-card ring-1 ring-sand-300/70 ${ligne.present ? '' : 'opacity-55'}`}>
      <button
        onClick={onTogglePresent}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
          ligne.present ? 'border-forest-500 bg-forest-500 text-white' : 'border-sand-400 bg-white text-transparent'
        }`}
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
          {ligne.source === 'PORTAIL' && <Badge tone="neutral">Portail</Badge>}
        </div>
        <button
          onClick={onToggleSousTraitant}
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition-colors ${
            ligne.sousTraitant ? 'bg-forest-100 text-forest-700 ring-forest-200' : 'bg-white text-muted ring-sand-300'
          }`}
        >
          {ligne.sousTraitant ? `S-T · ${ligne.sousTraitant}` : 'Marquer S-T'}
        </button>
      </div>
    </li>
  );
}

/* ---------- Statut indicatif (jamais bloquant) ---------- */
function StatutChip({ statut }: { statut: StatutIndicatif }) {
  if (statut === 'DEPOSE') return <Badge tone="forest" dot>Enregistré</Badge>;
  if (statut === 'HORS_DELAI') return <Badge tone="amber" dot>Après l'heure</Badge>;
  return <Badge tone="neutral" dot>Registre vivant</Badge>;
}

/* ---------- Feuille d'ajout (aucun motif — un ajout est un ajout normal) ---------- */
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
  const pret = prenom.trim() && nom.trim();

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
          <h3 className="text-lg font-extrabold text-ink">Ajouter une personne</h3>
          <button onClick={onAnnuler} className="text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">Personne ajoutée au registre du jour — aucun motif requis.</p>
        <div className="grid grid-cols-2 gap-3">
          {champ('Prénom', prenom, setPrenom, 'Prénom')}
          {champ('Nom', nom, setNom, 'Nom')}
        </div>
        <div className="mt-3">{champ('Fonction', fonction, setFonction, 'Ex. : manœuvre')}</div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!pret}
            onClick={() => onConfirmer({ prenom: prenom.trim(), nom: nom.trim(), fonction: fonction.trim() })}
          >
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}
