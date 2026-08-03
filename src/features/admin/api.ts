import { supabase } from '../../lib/supabase';

/** Journal d'audit (M18). Lecture seule : le journal est écrit par les RPC
 *  serveur et reste inaltérable (aucune écriture directe possible). */
export interface EvenementAudit {
  id: number;
  horodatage: string;
  utilisateur: string;
  action: string;
  entite: string;
  avant?: string | null;
  apres?: string | null;
  appareil?: string | null;
}

export async function chargerAudit(limite = 200): Promise<EvenementAudit[]> {
  const { data, error } = await supabase
    .from('at_audit')
    .select('id, utilisateur, action, entite, avant, apres, appareil, created_at')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    horodatage: e.created_at,
    utilisateur: e.utilisateur,
    action: e.action,
    entite: e.entite,
    avant: e.avant,
    apres: e.apres,
    appareil: e.appareil,
  }));
}
