// Atlas Trace — portail référent (R5) : résolution du lien + dépôt de liste journalière (M4).
// Le référent n'a aucun compte : le jeton du lien EST le justificatif.
// Validation + écritures en service_role côté serveur ; le navigateur n'a jamais de droit privilégié.
// Déployée avec verify_jwt=false (authentification portée par la fonction).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const DATE_JOUR = '2026-07-31' // date de démo du produit

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

    const action = body?.action ?? 'resoudre'

    // ---- Dépôt de la liste journalière ----
    if (action === 'deposer') {
      const lignes = Array.isArray(body?.lignes) ? body.lignes : []
      const dateListe = body?.date ?? DATE_JOUR
      const horsDelai = !!body?.horsDelai
      const presents = lignes.filter((l: any) => l?.present)

      // Re-dépôt : on repart propre pour (site, entreprise, date)
      await admin.from('at_listes_journalieres')
        .delete().eq('site_id', lien.site_id).eq('entreprise', lien.entreprise).eq('date_liste', dateListe)

      const { data: liste, error: e1 } = await admin.from('at_listes_journalieres').insert({
        organisation_id: lien.organisation_id, site_id: lien.site_id, entreprise: lien.entreprise,
        date_liste: dateListe, statut: horsDelai ? 'HORS_DELAI' : 'DEPOSEE',
        effectif: presents.length, depose_par: lien.referent_nom,
      }).select('id, statut, effectif, deposee_at').single()
      if (e1) return json({ error: e1.message }, 500)

      if (lignes.length) {
        const rows = lignes.map((l: any) => ({
          liste_id: liste.id, organisation_id: lien.organisation_id,
          personne_id: l.personne_id ?? null, nom: l.nom ?? '', prenom: l.prenom ?? '',
          present: !!l.present, tournant: !!l.tournant, sous_traitant: l.sous_traitant ?? null,
        }))
        const { error: e2 } = await admin.from('at_lignes_liste').insert(rows)
        if (e2) return json({ error: e2.message }, 500)
      }
      return json({ ok: true, listeId: liste.id, effectif: liste.effectif, statut: liste.statut, date: dateListe })
    }

    // ---- Résolution : contexte + personnel + liste du jour existante ----
    const [siteRes, orgRes, entRes] = await Promise.all([
      admin.from('at_sites').select('libelle').eq('id', lien.site_id).maybeSingle(),
      admin.from('at_organisations').select('raison_sociale').eq('id', lien.organisation_id).maybeSingle(),
      admin.from('at_entreprises').select('id').eq('site_id', lien.site_id).eq('raison_sociale', lien.entreprise).maybeSingle(),
    ])

    let personnes: unknown[] = []
    if (entRes.data?.id) {
      const { data: p } = await admin.from('at_personnes')
        .select('id, nom, prenom, fonction, regime, induction_statut')
        .eq('entreprise_id', entRes.data.id).order('nom')
      personnes = p ?? []
    }

    const { data: listeJour } = await admin.from('at_listes_journalieres')
      .select('id, statut, effectif, deposee_at')
      .eq('site_id', lien.site_id).eq('entreprise', lien.entreprise).eq('date_liste', DATE_JOUR)
      .maybeSingle()

    return json({
      statut: 'ACTIF', referent: lien.referent_nom, entreprise: lien.entreprise,
      site: siteRes.data?.libelle ?? null, organisation: orgRes.data?.raison_sociale ?? null,
      dateJour: DATE_JOUR, personnes, listeJour: listeJour ?? null,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
