import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuthz } from './authz';

/** Contexte du site connecté : rien n'est codé en dur, tout vient de la base. */
export interface ContexteSite {
  organisation: string | null;
  site: string | null;
  chargement: boolean;
}

export function useContexteSite(): ContexteSite {
  const { connecte } = useAuthz();
  const [ctx, setCtx] = useState<ContexteSite>({ organisation: null, site: null, chargement: true });

  useEffect(() => {
    if (!connecte) {
      setCtx({ organisation: null, site: null, chargement: false });
      return;
    }
    let annule = false;
    (async () => {
      const [org, site] = await Promise.all([
        supabase.from('at_organisations').select('raison_sociale').order('created_at').limit(1).maybeSingle(),
        supabase.from('at_sites').select('libelle').order('created_at').limit(1).maybeSingle(),
      ]);
      if (annule) return;
      setCtx({
        organisation: (org.data as { raison_sociale?: string } | null)?.raison_sociale ?? null,
        site: (site.data as { libelle?: string } | null)?.libelle ?? null,
        chargement: false,
      });
    })().catch(() => {
      if (!annule) setCtx({ organisation: null, site: null, chargement: false });
    });
    return () => {
      annule = true;
    };
  }, [connecte]);

  return ctx;
}
