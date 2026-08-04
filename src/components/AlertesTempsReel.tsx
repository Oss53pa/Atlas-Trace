import { useEffect, useState } from 'react';
import { AlertTriangle, X, ArrowRight, BellRing } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthz } from '../lib/authz';
import { jouerAlerte, debloquerAudio } from '../lib/son';

interface AlerteVive {
  id: string;
  titre: string;
  gravite: string;
  agent: string | null;
  urgent: boolean;
}

/**
 * Écoute en continu les nouveaux évènements de la main courante (temps réel) et,
 * application ouverte, joue une alerte sonore + affiche un bandeau qui attire
 * l'utilisateur. Application fermée, c'est la notification push (service worker)
 * qui réveille le téléphone. Monté à la racine — actif sur tous les écrans.
 */
export function AlertesTempsReel({ onVoir }: { onVoir: () => void }) {
  const { connecte } = useAuthz();
  const [alerte, setAlerte] = useState<AlerteVive | null>(null);

  // Débloque le son au premier geste (politique d'autoplay).
  useEffect(() => {
    const armer = () => debloquerAudio();
    window.addEventListener('pointerdown', armer, { once: true });
    window.addEventListener('keydown', armer, { once: true });
    return () => {
      window.removeEventListener('pointerdown', armer);
      window.removeEventListener('keydown', armer);
    };
  }, []);

  useEffect(() => {
    if (!connecte) return;
    const canal = supabase
      .channel('main-courante-alertes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'at_main_courante' },
        (payload) => {
          const r = payload.new as { id: string; titre?: string; gravite?: string; agent?: string | null };
          const g = (r.gravite ?? '').toLowerCase();
          const urgent = g.includes('majeur') || g.includes('critique') || g.includes('grave');
          jouerAlerte(urgent);
          setAlerte({ id: r.id, titre: r.titre ?? 'Nouvel évènement', gravite: r.gravite ?? '', agent: r.agent ?? null, urgent });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [connecte]);

  if (!alerte) return null;

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] flex justify-center px-4">
      <div
        role="alert"
        className={`flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 shadow-card-lg ring-1 ${
          alerte.urgent ? 'animate-pulse bg-danger-500 text-white ring-danger-600' : 'bg-white text-ink ring-sand-300'
        }`}
      >
        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${alerte.urgent ? 'bg-white/20' : 'bg-amber-50 text-amber-600'}`}>
          {alerte.urgent ? <AlertTriangle className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${alerte.urgent ? 'text-white/80' : 'text-amber-600'}`}>
            {alerte.urgent ? 'Incident majeur' : 'Nouvel évènement'}{alerte.gravite ? ` · ${alerte.gravite}` : ''}
          </p>
          <p className="truncate text-sm font-bold">{alerte.titre}</p>
          {alerte.agent && <p className={`truncate text-xs ${alerte.urgent ? 'text-white/75' : 'text-muted'}`}>signalé par {alerte.agent}</p>}
          <button
            onClick={() => { onVoir(); setAlerte(null); }}
            className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${alerte.urgent ? 'bg-white text-danger-600' : 'bg-forest-500 text-white'}`}
          >
            Voir la main courante <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button onClick={() => setAlerte(null)} aria-label="Ignorer" className={alerte.urgent ? 'text-white/80 hover:text-white' : 'text-muted hover:text-ink'}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
