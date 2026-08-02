// Atlas Trace — portail référent (R5) : résolution du lien + registre de présence vivant (M4).
// Le référent n'a aucun compte : le jeton du lien EST le justificatif.
// Modèle incrémental : resoudre renvoie le registre vivant ; ajouter / basculer / retirer /
// confirmer / contester / enregistrer agissent ligne à ligne (aucun verrouillage horaire).
// Validation + écritures en service_role côté serveur ; le navigateur n'a jamais de droit privilégié.
// Déployée avec verify_jwt=false (authentification portée par la fonction).
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Date de démo du produit (registre existant du pilote).
const DATE_JOUR = '2026-07-31'

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

    const date = body?.date ?? DATE_JOUR
    const action = body?.action ?? 'resoudre'

    // Registre du jour de l'entité du référent (créé s'il n'existe pas).
    async function assurerListe() {
      const { data: existante } = await admin.from('at_listes_journalieres')
        .select('id, statut, effectif, deposee_at')
        .eq('site_id', lien.site_id).eq('entreprise', lien.entreprise).eq('date_liste', date).maybeSingle()
      if (existante) return existante
      const { data, error: e } = await admin.from('at_listes_journalieres').insert({
        organisation_id: lien.organisation_id, site_id: lien.site_id, entreprise: lien.entreprise,
        date_liste: date, statut: 'NON_DEPOSE', effectif: 0,
      }).select('id, statut, effectif, deposee_at').single()
      if (e) throw new Error(e.message)
      return data
    }

    // Vérifie qu'une ligne appartient bien au registre de CE référent.
    async function ligneAutorisee(ligneId: string) {
      if (!ligneId) return null
      const { data } = await admin.from('at_lignes_liste')
        .select('id, liste:at_listes_journalieres!inner(site_id, entreprise)')
        .eq('id', ligneId)
        .eq('liste.site_id', lien.site_id)
        .eq('liste.entreprise', lien.entreprise)
        .maybeSingle()
      return data?.id ?? null
    }

    async function recompterEffectif(listeId: string) {
      const { count } = await admin.from('at_lignes_liste')
        .select('id', { count: 'exact', head: true })
        .eq('liste_id', listeId).eq('present', true)
        .neq('statut_confirmation', 'CONTESTEE').neq('statut_confirmation', 'REMPLACEE')
      return count ?? 0
    }

    // ---- Actions incrémentales (registre vivant) ----
    if (action === 'ajouter') {
      const { nom, prenom, fonction, tournant } = body
      if (!nom || !prenom) return json({ error: 'Nom et prénom requis' }, 400)
      const liste = await assurerListe()
      const { data, error: e } = await admin.from('at_lignes_liste').insert({
        liste_id: liste.id, organisation_id: lien.organisation_id,
        nom: String(nom).trim(), prenom: String(prenom).trim(), fonction: fonction ?? null,
        present: true, tournant: tournant ?? true, source: 'REFERENT',
        statut_confirmation: 'CONFIRMEE', ajout_par: lien.referent_nom,
      }).select('id').single()
      if (e) return json({ error: e.message }, 500)
      return json({ ok: true, id: data.id })
    }

    if (action === 'basculer') {
      const id = await ligneAutorisee(body?.ligneId)
      if (!id) return json({ error: 'Ligne hors périmètre' }, 403)
      const { error: e } = await admin.from('at_lignes_liste').update({ present: !!body?.present }).eq('id', id)
      if (e) return json({ error: e.message }, 500)
      return json({ ok: true })
    }

    if (action === 'retirer') {
      const id = await ligneAutorisee(body?.ligneId)
      if (!id) return json({ error: 'Ligne hors périmètre' }, 403)
      const { error: e } = await admin.from('at_lignes_liste').delete().eq('id', id)
      if (e) return json({ error: e.message }, 500)
      return json({ ok: true })
    }

    if (action === 'confirmer') {
      const id = await ligneAutorisee(body?.ligneId)
      if (!id) return json({ error: 'Ligne hors périmètre' }, 403)
      const { error: e } = await admin.from('at_lignes_liste')
        .update({ statut_confirmation: 'CONFIRMEE', confirmation_at: new Date().toISOString() })
        .eq('id', id).in('statut_confirmation', ['EN_ATTENTE', 'CONFIRMEE_PAR_SILENCE'])
      if (e) return json({ error: e.message }, 500)
      return json({ ok: true })
    }

    if (action === 'contester') {
      const id = await ligneAutorisee(body?.ligneId)
      if (!id) return json({ error: 'Ligne hors périmètre' }, 403)
      const motif = String(body?.motif ?? '').trim()
      if (motif.length < 5) return json({ error: 'Motif de contestation requis' }, 400)
      const { error: e } = await admin.from('at_lignes_liste')
        .update({ statut_confirmation: 'CONTESTEE', motif_contestation: motif, confirmation_at: new Date().toISOString() })
        .eq('id', id).in('statut_confirmation', ['EN_ATTENTE', 'CONFIRMEE_PAR_SILENCE'])
      if (e) return json({ error: e.message }, 500)
      return json({ ok: true })
    }

    if (action === 'remplacer') {
      const id = await ligneAutorisee(body?.ligneId)
      if (!id) return json({ error: 'Ligne hors périmètre' }, 403)
      const { nom, prenom, fonction, tournant } = body
      if (!nom || !prenom) return json({ error: 'Nom et prénom du remplaçant requis' }, 400)
      const { data: old } = await admin.from('at_lignes_liste')
        .select('id, liste_id, organisation_id, personne_id, statut_confirmation').eq('id', id).maybeSingle()
      if (!old || old.statut_confirmation === 'REMPLACEE') return json({ error: 'Ligne déjà remplacée' }, 400)
      // Garde « déjà entré » : dernier passage du jour = ENTREE -> refus.
      if (old.personne_id) {
        const { data: mv } = await admin.from('at_mouvements_acces')
          .select('sens').eq('personne_id', old.personne_id).eq('site_id', lien.site_id)
          .in('resultat', ['AUTORISE', 'FORCE']).order('horodatage', { ascending: false }).limit(1).maybeSingle()
        if (mv?.sens === 'ENTREE') return json({ resultat: 'REFUSE', motif: 'DEJA_ENTRE' })
      }
      await admin.from('at_lignes_liste').update({ statut_confirmation: 'REMPLACEE', present: false }).eq('id', id)
      const { data: ins, error: e } = await admin.from('at_lignes_liste').insert({
        liste_id: old.liste_id, organisation_id: old.organisation_id,
        nom: String(nom).trim(), prenom: String(prenom).trim(), fonction: fonction ?? null,
        present: true, tournant: tournant ?? true, source: 'REFERENT', statut_confirmation: 'CONFIRMEE',
        ajout_par: lien.referent_nom, remplace_ligne_id: id,
      }).select('id').single()
      if (e) return json({ error: e.message }, 500)
      return json({ resultat: 'OK', nouvelle_ligne_id: ins.id })
    }

    if (action === 'enregistrer') {
      const liste = await assurerListe()
      const horsDelai = !!body?.horsDelai
      const effectif = await recompterEffectif(liste.id)
      const { error: e } = await admin.from('at_listes_journalieres').update({
        statut: horsDelai ? 'HORS_DELAI' : 'DEPOSEE', effectif,
        depose_par: lien.referent_nom, deposee_at: new Date().toISOString(),
      }).eq('id', liste.id)
      if (e) return json({ error: e.message }, 500)
      return json({ ok: true, statut: horsDelai ? 'HORS_DELAI' : 'DEPOSEE', effectif })
    }

    // ---- Résolution : contexte + vivier + registre vivant ----
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

    const liste = await assurerListe()
    const { data: lignes } = await admin.from('at_lignes_liste')
      .select('id, nom, prenom, fonction, present, tournant, source, statut_confirmation, motif_contestation')
      .eq('liste_id', liste.id).order('ajout_at')

    return json({
      statut: 'ACTIF', referent: lien.referent_nom, entreprise: lien.entreprise,
      site: siteRes.data?.libelle ?? null, organisation: orgRes.data?.raison_sociale ?? null,
      dateJour: date, personnes,
      registre: { listeId: liste.id, statut: liste.statut, effectif: liste.effectif, deposeeAt: liste.deposee_at },
      lignes: lignes ?? [],
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
