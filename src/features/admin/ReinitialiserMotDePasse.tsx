import { useEffect, useState } from 'react';
import { KeyRound, Loader2, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

/**
 * Réinitialisation du mot de passe.
 *
 * Atterrissage du lien reçu par courriel (redirectTo → ?reset=1#type=recovery).
 * Supabase établit une session de récupération à l'ouverture ; la personne
 * choisit ici un nouveau mot de passe. Il n'est connu de personne d'autre.
 */
export function ReinitialiserMotDePasse({ onFini }: { onFini: () => void }) {
  // État de la session de récupération : null = on ne sait pas encore.
  const [session, setSession] = useState<boolean | null>(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    let vivant = true;
    // La session de récupération peut déjà être posée (hash consommé au boot)
    // ou arriver via l'évènement PASSWORD_RECOVERY.
    supabase.auth.getSession().then(({ data }) => {
      if (vivant && data.session) setSession(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (!vivant) return;
      if (e === 'PASSWORD_RECOVERY' || s) setSession(true);
    });
    // Si rien n'établit de session dans un délai raisonnable, le lien est invalide/expiré.
    const t = setTimeout(() => {
      if (vivant) setSession((v) => (v === null ? false : v));
    }, 3000);
    return () => {
      vivant = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const assezLong = motDePasse.length >= 10;
  const identiques = motDePasse.length > 0 && motDePasse === confirmation;
  const pret = assezLong && identiques && !envoi;

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: motDePasse });
      if (error) throw new Error(error.message);
      setFait(true);
      // Le lien a servi : on nettoie la barre d'adresse puis on ouvre l'appli connectée.
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(onFini, 1400);
    } catch (e) {
      const m = (e as Error).message;
      setErreur(
        /session|missing|expired|invalid/i.test(m)
          ? 'Lien expiré ou déjà utilisé. Redemandez une réinitialisation depuis l’écran de connexion.'
          : m,
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand-100 px-5 py-10">
      <Logo size="md" className="mb-6" />

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card-lg ring-1 ring-sand-300/60">
        {session === null ? (
          <div className="flex justify-center py-10 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : fait ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
              <Check className="h-7 w-7" strokeWidth={3} />
            </span>
            <p className="text-base font-extrabold text-ink">Mot de passe modifié</p>
            <p className="text-sm text-muted">Ouverture de l’application…</p>
          </div>
        ) : session === false ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <p className="text-base font-extrabold text-ink">Lien invalide ou expiré</p>
            <p className="text-sm text-muted">
              Ce lien de réinitialisation n’est plus valable. Redemandez-en un depuis l’écran de connexion.
            </p>
            <Button variant="outline" size="md" className="mt-2" onClick={onFini}>
              Retour à l’application
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
                <KeyRound className="h-6 w-6" />
              </span>
              <h1 className="text-lg font-extrabold text-ink">Nouveau mot de passe</h1>
              <p className="mt-1 text-sm text-muted">
                Choisissez un nouveau mot de passe pour votre compte Atlas Trace.
              </p>
            </div>

            <label className="block">
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
              icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              onClick={enregistrer}
            >
              Enregistrer le mot de passe
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
