// Atlas Trace — invitation d'un compte interne (Phase 1).
// Crée un utilisateur auth + sa fiche at_utilisateurs + son rattachement at_membres
// (utilisateur ↔ rôle ↔ site). En service_role, MAIS avec vérification stricte :
// l'appelant doit être authentifié ET détenir ADMINISTRER_ORGANISATION ; le nouvel
// utilisateur est TOUJOURS rattaché à l'organisation de l'appelant (pas de cross-org).
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
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    // 1. Authentifier l'appelant via son JWT
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'non authentifié' }, 401)
    const { data: { user: caller }, error: eAuth } = await admin.auth.getUser(token)
    if (eAuth || !caller) return json({ error: 'session invalide' }, 401)

    // 2. Récupérer sa fiche + son organisation
    const { data: moi } = await admin.from('at_utilisateurs').select('id, organisation_id').eq('user_id', caller.id).maybeSingle()
    if (!moi) return json({ error: 'compte non rattaché à une organisation' }, 403)

    // 3. Vérifier le pouvoir ADMINISTRER_ORGANISATION
    const { data: mesRoles } = await admin.from('at_membres').select('at_roles(pouvoirs)').eq('utilisateur_id', moi.id)
    const pouvoirs = new Set((mesRoles ?? []).flatMap((r: any) => r.at_roles?.pouvoirs ?? []))
    if (!pouvoirs.has('ADMINISTRER_ORGANISATION')) return json({ error: 'pouvoir ADMINISTRER_ORGANISATION requis' }, 403)

    // 4. Valider l'entrée
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const nom = String(body?.nom ?? '').trim()
    const roleId = body?.role_id ?? null
    const siteId = body?.site_id ?? null
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'e-mail invalide' }, 400)
    if (password.length < 8) return json({ error: 'mot de passe trop court (8 min.)' }, 400)
    if (!nom) return json({ error: 'nom requis' }, 400)

    // Le rôle et le site doivent appartenir à l'organisation de l'appelant
    const { data: role } = await admin.from('at_roles').select('id').eq('id', roleId).eq('organisation_id', moi.organisation_id).maybeSingle()
    if (!role) return json({ error: 'rôle invalide pour cette organisation' }, 400)
    if (siteId) {
      const { data: site } = await admin.from('at_sites').select('id').eq('id', siteId).eq('organisation_id', moi.organisation_id).maybeSingle()
      if (!site) return json({ error: 'site invalide' }, 400)
    }

    // 5. Créer l'utilisateur auth
    const { data: created, error: eCreate } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (eCreate || !created?.user) return json({ error: eCreate?.message ?? 'création utilisateur échouée' }, 400)
    const newUserId = created.user.id

    // 6. Fiche at_utilisateurs + rattachement at_membres (org = celle de l'appelant)
    const { data: util, error: eUtil } = await admin.from('at_utilisateurs')
      .insert({ organisation_id: moi.organisation_id, user_id: newUserId, nom, contact: email, statut: 'ACTIF' })
      .select('id').single()
    if (eUtil) {
      await admin.auth.admin.deleteUser(newUserId) // rollback best-effort
      return json({ error: eUtil.message }, 500)
    }
    const { error: eMembre } = await admin.from('at_membres')
      .insert({ organisation_id: moi.organisation_id, utilisateur_id: util.id, role_id: roleId, site_id: siteId })
    if (eMembre) return json({ error: eMembre.message }, 500)

    return json({ ok: true, user_id: newUserId, email })
  } catch (e) {
    return json({ error: 'erreur interne' }, 500)
  }
})
