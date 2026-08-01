import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

/** Une portée de pouvoir détenue par l'utilisateur courant (org / site). */
export interface Portee {
  pouvoir: string;
  organisationId: string | null;
  siteId: string | null;
}

export interface Autorisation {
  /** Ensemble des pouvoirs détenus (tous périmètres confondus). */
  pouvoirs: Set<string>;
  /** Détail par portée (pour un filtrage fin org/site plus tard). */
  portees: Portee[];
  connecte: boolean;
  chargement: boolean;
  /** L'utilisateur détient-il ce pouvoir ? */
  a: (pouvoir: string) => boolean;
  /** L'un au moins des pouvoirs ? (undefined = pas d'exigence → true) */
  aUn: (pouvoirs?: string[]) => boolean;
}

const Ctx = createContext<Autorisation | null>(null);

/**
 * Charge une fois les pouvoirs de l'utilisateur courant via `at_mes_pouvoirs()`
 * (fonction serveur SECURITY DEFINER bornée à auth.uid()). Le front ne décide
 * jamais seul : il reflète ce que le serveur autorise.
 */
export function AuthzProvider({ children }: { children: ReactNode }) {
  const [portees, setPortees] = useState<Portee[]>([]);
  const [connecte, setConnecte] = useState(false);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;

    async function charger() {
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      } catch {
        /* réseau/stockage indisponible → traité comme non connecté */
      }
      if (annule) return;
      if (!session) {
        setConnecte(false);
        setPortees([]);
        setChargement(false);
        return;
      }
      setConnecte(true);
      const { data, error } = await supabase.rpc('at_mes_pouvoirs');
      if (annule) return;
      if (!error && Array.isArray(data)) {
        setPortees(
          (data as { pouvoir: string; organisation_id: string | null; site_id: string | null }[]).map((r) => ({
            pouvoir: r.pouvoir,
            organisationId: r.organisation_id,
            siteId: r.site_id,
          })),
        );
      }
      setChargement(false);
    }

    charger();
    const { data: sub } = supabase.auth.onAuthStateChange(() => charger());
    return () => {
      annule = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const pouvoirs = new Set(portees.map((p) => p.pouvoir));
  const valeur: Autorisation = {
    pouvoirs,
    portees,
    connecte,
    chargement,
    a: (p) => pouvoirs.has(p),
    aUn: (ps) => !ps || ps.length === 0 || ps.some((p) => pouvoirs.has(p)),
  };

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useAuthz(): Autorisation {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuthz doit être utilisé dans <AuthzProvider>');
  return ctx;
}

/** Masque son contenu si le pouvoir n'est pas détenu (utilisateur connecté). */
export function Gate({ pouvoir, children, sinon = null }: { pouvoir: string; children: ReactNode; sinon?: ReactNode }) {
  const { a, chargement, connecte } = useAuthz();
  if (chargement) return null;
  // Hors session (mode démo/exploration), on n'entrave pas : le gating par rôle
  // s'applique dès qu'un utilisateur est réellement connecté.
  if (!connecte) return <>{children}</>;
  return a(pouvoir) ? <>{children}</> : <>{sinon}</>;
}
