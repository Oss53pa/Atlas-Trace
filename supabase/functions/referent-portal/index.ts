// Atlas Trace — auth par lien référent (R5).
// Le référent n'a aucun compte : le jeton du lien EST le justificatif.
// Validation en service_role côté serveur ; le navigateur n'a jamais de droit privilégié.
// Déployée avec verify_jwt=false (authentification portée par la fonction).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const jeton = body?.jeton
    if (!jeton || typeof jeton !== 'string') return json({ error: 'jeton manquant' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: lien, error } = await admin
      .from('at_liens_referents')
      .select('id, referent_nom, entreprise, statut, site_id, organisation_id')
      .eq('jeton', jeton)
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!lien) return json({ statut: 'INCONNU' })
    if (lien.statut !== 'ACTIF') return json({ statut: 'REVOQUE' })

    const [siteRes, orgRes, entRes] = await Promise.all([
      admin.from('at_sites').select('libelle').eq('id', lien.site_id).maybeSingle(),
      admin.from('at_organisations').select('raison_sociale').eq('id', lien.organisation_id).maybeSingle(),
      admin.from('at_entreprises').select('id').eq('site_id', lien.site_id).eq('raison_sociale', lien.entreprise).maybeSingle(),
    ])

    let personnes: unknown[] = []
    if (entRes.data?.id) {
      const { data: p } = await admin
        .from('at_personnes')
        .select('nom, prenom, fonction, regime, induction_statut')
        .eq('entreprise_id', entRes.data.id)
        .order('nom')
      personnes = p ?? []
    }

    return json({
      statut: 'ACTIF',
      referent: lien.referent_nom,
      entreprise: lien.entreprise,
      site: siteRes.data?.libelle ?? null,
      organisation: orgRes.data?.raison_sociale ?? null,
      personnes,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
