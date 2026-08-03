import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

const URL_FONCTION = 'https://easoqoswtmvtkdwwkqtc.supabase.co/functions/v1/invitation';

interface Apercu {
  valide: boolean;
  motif?: string;
  nom?: string;
  contact?: string;
  role?: string;
  site?: string;
  organisation?: string;
  expire_at?: string;
}

const MOTIFS: Record<string, string> = {
  INVITATION_INCONNUE: "Ce lien d'invitation n'existe pas.",
  INVITATION_REVOQUEE: "Cette invitation a été révoquée par l'administrateur.",
  INVITATION_DEJA_UTILISEE: 'Cette invitation a déjà servi à créer un compte.',
  INVITATION_EXPIREE: 'Cette invitation a expiré. Demandez-en une nouvelle.',
  INVITATION_INVALIDE: "Ce lien n'est plus valable.",
};

/**
 * Activation d'un compte depuis le QR reçu par courriel.
 *
 * L'administrateur MOA a choisi le rôle ; la personne choisit ici son mot de
 * passe. Il n'est connu de personne d'autre — l'application ne fait que le
 * transmettre au service qui crée le compte.
 */
export function ActivationCompte({ jeton }: { jeton: string }) {
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    supabase
      .rpc('at_invitation_apercu', { p_jeton: jeton })
      .then(({ data, error }) =>
        setApercu(error ? { valide: false, motif: 'INVITATION_INVALIDE' } : (data as Apercu)),
      );
  }, [jeton]);

  const assezLong = motDePasse.length >= 10;
  const identiques = motDePasse.length > 0 && motDePasse === confirmation;
  const pret = assezLong && identiques && !envoi;

  async function activer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch(URL_FONCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activer', jeton, mot_de_passe: motDePasse }),
      });
      const d = await rep.json();
      if (!rep.ok) throw new Error(MOTIFS[d.erreur] ?? d.erreur ?? 'Activation impossible');

      // Le compte existe : on ouvre la session directement.
      await supabase.auth.signInWithPassword({ email: d.courriel, password: motDePasse });
      setFait(true);
      // On retire le jeton de la barre d'adresse : il a servi.
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => window.location.reload(), 1400);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand-100 px-5 py-10">
      <Logo size="md" className="mb-6" />

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card-lg ring-1 ring-sand-300/60">
        {apercu === null ? (
          <div className="flex justify-center py-10 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : fait ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
              <Check className="h-7 w-7" strokeWidth={3} />
            </span>
            <p className="text-base font-extrabold text-ink">Compte créé</p>
            <p className="text-sm text-muted">Ouverture de votre session…</p>
          </div>
        ) : !apercu.valide ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <p className="text-base font-extrabold text-ink">Invitation inutilisable</p>
            <p className="text-sm text-muted">{MOTIFS[apercu.motif ?? ''] ?? "Ce lien n'est pas valable."}</p>
          </div>
        ) : (
          <>
            <div className="mb-5 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <h1 className="text-lg font-extrabold text-ink">Bienvenue {apercu.nom}</h1>
              <p className="mt-1 text-sm text-muted">
                Accès ouvert sur <b className="text-ink">{apercu.site}</b> avec le rôle{' '}
                <b className="text-ink">{apercu.role}</b>.
              </p>
              <p className="mt-2 rounded-xl bg-sand-100 px-3 py-2 text-xs text-muted">
                Choisissez votre mot de passe. <b className="text-ink">Personne d'autre ne le connaîtra</b>,
                pas même l'administrateur qui vous a invité.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Identifiant</span>
              <input
                value={apercu.contact ?? ''}
                readOnly
                className="w-full rounded-xl border border-sand-300 bg-sand-100 px-3 py-2 text-sm text-muted outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted">Mot de passe</span>
              <div className="relative">
                <input
                  type={visible ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 pr-10 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-ink"
                  aria-label={visible ? 'Masquer' : 'Afficher'}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className={`mt-1 block text-[11px] ${assezLong ? 'text-forest-600' : 'text-muted'}`}>
                {assezLong ? '✓ Longueur suffisante' : 'Au moins 10 caractères'}
              </span>
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted">Confirmation</span>
              <input
                type={visible ? 'text' : 'password'}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
              />
              {confirmation.length > 0 && !identiques && (
                <span className="mt-1 block text-[11px] text-danger-600">Les deux saisies diffèrent</span>
              )}
            </label>

            {erreur && (
              <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
                {erreur}
              </p>
            )}

            <Button
              variant="primary"
              size="lg"
              block
              className="mt-5"
              disabled={!pret}
              icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              onClick={activer}
            >
              Créer mon compte
            </Button>

            {apercu.expire_at && (
              <p className="mt-3 text-center text-[11px] text-muted">
                Lien à usage unique, valable jusqu'au{' '}
                {new Date(apercu.expire_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
