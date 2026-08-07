import { LogIn, ShieldAlert } from 'lucide-react';
import { useAuthz } from '../../lib/authz';
import { RegistreLive } from './RegistreLive';

/**
 * M4 — registre de présence vivant, données réelles uniquement. Réservé aux
 * comptes connectés disposant de DEPOSER_LISTE (référent d'entreprise). Aucun
 * aperçu de démonstration : hors périmètre, on affiche un état d'accès.
 */
export function ListeReferent() {
  const { connecte, a } = useAuthz();
  if (connecte && a('DEPOSER_LISTE')) return <RegistreLive />;
  return <AccesRestreint connecte={connecte} />;
}

function AccesRestreint({ connecte }: { connecte: boolean }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60">
        {connecte ? <ShieldAlert className="h-7 w-7" /> : <LogIn className="h-7 w-7" />}
      </span>
      <p className="text-base font-bold text-ink">{connecte ? 'Accès réservé' : 'Connexion requise'}</p>
      <p className="text-sm">
        {connecte
          ? 'Le registre de présence relève du pouvoir DEPOSER_LISTE (référent d’entreprise).'
          : 'Le registre de présence est une donnée réelle du site : connectez-vous pour y accéder.'}
      </p>
    </div>
  );
}
