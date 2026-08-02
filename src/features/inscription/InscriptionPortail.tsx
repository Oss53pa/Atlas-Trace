import { useEffect, useState } from 'react';
import { UserPlus, Check, Loader2, LogIn, ShieldAlert, Clock, Camera } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { useAuthz } from '../../lib/authz';
import { useEntreprises } from '../materiel/referentiel';
import { chargerPoste, type Poste } from '../poste/api';
import { inscrirePortail, type InscriptionResultat } from './api';

const PIECES = ['', 'CNI', 'Passeport', 'Permis', 'Carte consulaire', 'Attestation'];

export function InscriptionPortail() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutInscrire = a('CONTROLER_AU_POSTE');
  const entreprises = useEntreprises();

  const [poste, setPoste] = useState<Poste | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [fonction, setFonction] = useState('');
  const [pieceType, setPieceType] = useState('');
  const [pieceNumero, setPieceNumero] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<InscriptionResultat | null>(null);

  useEffect(() => {
    if (!connecte || !peutInscrire) return;
    let annule = false;
    chargerPoste().then((p) => { if (!annule) setPoste(p); }).catch((e) => { if (!annule) setErreur((e as Error).message); });
    return () => { annule = true; };
  }, [connecte, peutInscrire]);

  useEffect(() => {
    if (!entrepriseId && entreprises.length > 0) setEntrepriseId(entreprises[0].id);
  }, [entreprises, entrepriseId]);

  const pret = !!poste && !!entrepriseId && nom.trim() && prenom.trim() && !!photoUrl && !envoi;

  function reset() {
    setNom(''); setPrenom(''); setFonction(''); setPieceType(''); setPieceNumero(''); setPhotoUrl('');
    setResultat(null);
  }

  async function inscrire() {
    if (!poste) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await inscrirePortail({
        posteId: poste.id, entrepriseId, nom: nom.trim(), prenom: prenom.trim(),
        fonction: fonction.trim() || undefined, photoUrl,
        pieceType: pieceType || undefined, pieceNumero: pieceNumero.trim() || undefined,
      });
      setResultat(r);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (authEnCours) return <Etat icone={<Loader2 className="h-6 w-6 animate-spin" />} titre="Chargement…" />;
  if (!connecte) return <Etat icone={<LogIn className="h-7 w-7" />} titre="Connexion requise" detail="L'inscription au poste écrit au registre : il faut un compte." />;
  if (!peutInscrire) return <Etat icone={<ShieldAlert className="h-7 w-7" />} titre="Accès non autorisé" detail="Le pouvoir CONTROLER_AU_POSTE est requis." />;

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <UserPlus className="h-3.5 w-3.5" /> M23 · Lot 1
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Inscription au poste</h1>
        <p className="mt-1 text-sm text-muted">
          Personne inconnue au portail : identité + photo, <b className="text-ink">accès accordé immédiatement</b>.
          La ligne part en attente de confirmation du référent. {poste ? `Poste : ${poste.libelle}.` : ''}
        </p>
      </div>

      {erreur && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

      {resultat ? (
        <ResultatCard resultat={resultat} onNouveau={reset} />
      ) : (
        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Entité déclarée</span>
            <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
            </select>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Prénom</span>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom"
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Nom</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom"
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Fonction (optionnel)</span>
            <input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Ex. : manœuvre"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
          </label>

          <div className="mt-3 grid grid-cols-[1fr_1.2fr] gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Pièce (optionnel)</span>
              <select value={pieceType} onChange={(e) => setPieceType(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {PIECES.map((p) => <option key={p} value={p}>{p || '— aucune —'}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">N° de pièce</span>
              <input value={pieceNumero} onChange={(e) => setPieceNumero(e.target.value)} placeholder="—" disabled={!pieceType}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 disabled:opacity-50" />
            </label>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Camera className="h-3.5 w-3.5" /> Photographie (obligatoire — prise au poste)
            </div>
            <PhotoCapture label={photoUrl ? 'Reprendre la photo' : 'Photographier la personne'} onCapture={(url) => setPhotoUrl(url)} />
            {photoUrl && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-forest-600"><Check className="h-3.5 w-3.5" /> Photo capturée</p>}
          </div>

          <Button variant="primary" size="lg" block className="mt-4" disabled={!pret}
            icon={envoi ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            onClick={inscrire}>
            Inscrire &amp; accorder l'accès
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted">
            L'accès n'est jamais suspendu à la confirmation. Refus possibles uniquement : personne suspendue, photo absente.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultatCard({ resultat, onNouveau }: { resultat: InscriptionResultat; onNouveau: () => void }) {
  if (resultat.resultat === 'AUTORISE') {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-forest-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-forest-50 text-forest-600 ring-4 ring-white">
          <Check className="h-9 w-9" strokeWidth={3} />
        </div>
        <p className="mt-3 text-lg font-extrabold text-ink">Accès accordé</p>
        <p className="mt-1 text-sm text-muted">{resultat.label} · {resultat.entreprise}</p>
        <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          <Clock className="h-3.5 w-3.5" /> En attente de confirmation du référent
        </p>
        <Button variant="primary" size="lg" block className="mt-5" icon={<UserPlus className="h-5 w-5" />} onClick={onNouveau}>
          Nouvelle inscription
        </Button>
      </div>
    );
  }
  const suspendu = resultat.motif === 'PERSONNE_SUSPENDUE';
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-danger-100">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-danger-50 text-danger-600 ring-4 ring-white">
        <ShieldAlert className="h-9 w-9" />
      </div>
      <p className="mt-3 text-lg font-extrabold text-ink">{suspendu ? 'Personne suspendue' : 'Photographie manquante'}</p>
      <p className="mt-1 text-sm text-muted">
        {suspendu ? 'Cette identité est suspendue au niveau du site — accès refusé, quelle que soit l’entité déclarée.' : 'La photographie est obligatoire pour toute inscription.'}
      </p>
      <Button variant="ghost" size="lg" block className="mt-5" onClick={onNouveau}>Retour</Button>
    </div>
  );
}

function Etat({ icone, titre, detail }: { icone: React.ReactNode; titre: string; detail?: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60">{icone}</span>
      <p className="text-base font-bold text-ink">{titre}</p>
      {detail && <p className="text-sm">{detail}</p>}
    </div>
  );
}
