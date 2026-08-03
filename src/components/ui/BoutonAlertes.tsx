import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { activerPush, desactiverPush, etatPush, type EtatPush } from '../../lib/push';

const MESSAGE: Record<EtatPush, string> = {
  INDISPONIBLE:
    "Alertes indisponibles sur ce navigateur. Sur iPhone, ajoutez d'abord Trace à l'écran d'accueil.",
  NON_CONFIGURE: 'Alertes non configurées côté serveur (clés VAPID absentes).',
  REFUSE: 'Notifications refusées — réautorisez-les dans les réglages du navigateur.',
  INACTIF: 'Recevoir les incidents sur cet appareil, même application fermée.',
  ACTIF: 'Cet appareil est alerté des incidents, même application fermée.',
};

/**
 * Activation des alertes push sur l'appareil courant. Affiché à qui reçoit les
 * incidents (pouvoir SUIVRE_INCIDENTS) — l'abonnement est par appareil, pas par
 * compte : un même agent peut l'activer sur son téléphone et pas sur la tablette.
 */
export function BoutonAlertes() {
  const [etat, setEtat] = useState<EtatPush | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    etatPush().then(setEtat).catch(() => setEtat('INDISPONIBLE'));
  }, []);

  if (etat === null) return null;

  const basculer = async () => {
    setOccupe(true);
    setErreur(null);
    try {
      setEtat(etat === 'ACTIF' ? await desactiverPush() : await activerPush());
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  const actionnable = etat === 'INACTIF' || etat === 'ACTIF';
  const actif = etat === 'ACTIF';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={basculer}
        disabled={!actionnable || occupe}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors disabled:opacity-60 ${
          actif
            ? 'bg-forest-50 text-forest-700 ring-forest-200 hover:bg-forest-100'
            : 'bg-white text-muted ring-sand-300 hover:bg-sand-100 hover:text-ink'
        }`}
        title={MESSAGE[etat]}
      >
        {occupe ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : actif ? (
          <BellRing className="h-3.5 w-3.5" />
        ) : etat === 'REFUSE' || etat === 'INDISPONIBLE' ? (
          <BellOff className="h-3.5 w-3.5" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        {actif ? 'Alertes activées' : 'Activer les alertes'}
      </button>
      <span className="text-[11px] text-muted">{erreur ?? MESSAGE[etat]}</span>
    </div>
  );
}
