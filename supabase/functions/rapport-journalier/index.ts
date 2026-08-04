/**
 * rapport-journalier — construit le PDF du jour, le dépose et le transmet.
 *
 * Déclenchée par pg_cron chaque soir, ou à la demande via at_generer_rapport().
 * Dans les deux cas l'appel vient de la base et porte le secret partagé : la
 * fonction n'est pas ouverte au public.
 *
 * Secrets attendus : RESEND_API_KEY, RESEND_FROM (expéditeur d'un domaine
 * vérifié chez Resend, ex. "Atlas Trace <trace@votredomaine.ci>").
 */
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (c: unknown, s = 200) =>
  new Response(JSON.stringify(c), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Les polices PDF standard ne codent que le latin-1 : on ramène le reste. */
const propre = (t: unknown): string =>
  String(t ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ | /g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, '');

const MOTIFS: Record<string, string> = {
  BADGE_INCONNU: 'Badge inconnu', BADGE_EXPIRE: 'Badge expiré', BADGE_SUSPENDU: 'Badge suspendu',
  ENTREPRISE_SUSPENDUE: 'Entreprise suspendue', DONNEUR_ORDRE_BLOQUE: 'Preneur bloqué',
  HORS_LISTE: 'Hors liste du jour', HORS_ZONE: 'Hors zone', HORS_EMPRISE: 'Hors emprise',
  HORS_PLAGE: 'Hors plage horaire', DEJA_ENTRE: 'Déjà entré', INDUCTION_EXPIREE: 'Induction expirée',
  NON_PRECISE: 'Non précisé',
};

type Rapport = {
  site: string; date: string; organisation_id: string;
  acces: { entrees: number; sorties: number; refus: number; forcages: number; total: number };
  refus_par_motif: { motif: string; nombre: number }[];
  sorties_matiere: { autorisees: number; refusees: number; par_autorisation: number; non_couvertes: number };
  incidents: { numero: string; titre: string; gravite: string; statut: string; agent: string; heure: string }[];
  incidents_ouverts: number; evenements: number;
};

async function construirePdf(
  r: Rapport,
  marque: { logoBytes: Uint8Array | null; logoJpg: boolean; raisonSociale: string },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  const VERT = rgb(0.05, 0.26, 0.22);
  const GRIS = rgb(0.45, 0.45, 0.45);
  const ROUGE = rgb(0.72, 0.19, 0.14);
  let y = 790;

  const saut = (h: number) => {
    y -= h;
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 790;
    }
  };
  const ecrire = (t: string, opts: { taille?: number; police?: typeof normal; couleur?: typeof VERT; x?: number } = {}) => {
    page.drawText(propre(t), {
      x: opts.x ?? 50, y,
      size: opts.taille ?? 10,
      font: opts.police ?? normal,
      color: opts.couleur ?? rgb(0.1, 0.1, 0.1),
    });
  };
  const titre = (t: string) => { saut(26); ecrire(t, { taille: 13, police: gras, couleur: VERT }); saut(6); };
  const ligne = (g: string, d: string) => {
    saut(15);
    ecrire(g);
    page.drawText(propre(d), { x: 480, y, size: 10, font: gras });
  };

  // En-tête — logo du site (haut droite) si défini, sans jamais bloquer le rapport.
  if (marque.logoBytes) {
    try {
      const img = marque.logoJpg ? await doc.embedJpg(marque.logoBytes) : await doc.embedPng(marque.logoBytes);
      const hLogo = 40;
      const wLogo = Math.min(150, (img.width / img.height) * hLogo);
      page.drawImage(img, { x: 545 - wLogo, y: y - 22, width: wLogo, height: hLogo });
    } catch {
      // Logo illisible : le rapport est produit sans logo.
    }
  }

  ecrire('Atlas Trace', { taille: 20, police: gras, couleur: VERT });
  saut(18);
  if (marque.raisonSociale) {
    ecrire(marque.raisonSociale, { taille: 10, police: gras, couleur: GRIS });
    saut(14);
  }
  ecrire('Rapport journalier de poste', { taille: 12, police: gras });
  saut(15);
  ecrire(`${r.site} — ${new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`, { couleur: GRIS });
  saut(10);
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: VERT });

  titre('Contrôle d’accès');
  ligne('Entrées enregistrées', String(r.acces.entrees));
  ligne('Sorties enregistrées', String(r.acces.sorties));
  ligne('Refus consignés', String(r.acces.refus));
  ligne('Forçages (motivés, photo obligatoire)', String(r.acces.forcages));

  if (r.refus_par_motif.length) {
    titre('Motifs de refus');
    for (const m of r.refus_par_motif) ligne(MOTIFS[m.motif] ?? m.motif, String(m.nombre));
  }

  titre('Sorties matière');
  ligne('Sorties autorisées', String(r.sorties_matiere.autorisees));
  ligne('  dont sur autorisation approuvée', String(r.sorties_matiere.par_autorisation));
  ligne('Sorties refusées', String(r.sorties_matiere.refusees));
  ligne('Présentations non couvertes (R1)', String(r.sorties_matiere.non_couvertes));

  titre('Main courante');
  ligne('Événements consignés', String(r.evenements));
  ligne('Incidents du jour', String(r.incidents.length));
  ligne('Incidents ouverts (tous jours)', String(r.incidents_ouverts));

  if (r.incidents.length) {
    titre('Détail des incidents');
    for (const i of r.incidents) {
      saut(15);
      const majeur = i.gravite === 'MAJEUR';
      ecrire(`${i.heure}  ${i.numero ?? ''}  ${i.titre}`, { couleur: majeur ? ROUGE : undefined });
      page.drawText(propre(`${majeur ? 'MAJEUR' : 'mineur'} · ${i.statut}`), {
        x: 440, y, size: 9, font: gras, color: majeur ? ROUGE : GRIS,
      });
    }
  }

  saut(30);
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: GRIS });
  saut(14);
  ecrire(
    `Document généré automatiquement le ${new Date().toLocaleString('fr-FR')} — les chiffres proviennent des registres, non d’une saisie.`,
    { taille: 8, couleur: GRIS },
  );

  return doc.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'Méthode non supportée' }, 405);

  const { data: reglages } = await admin.from('at_reglages_push').select('hook_secret').maybeSingle();
  if (!reglages?.hook_secret || req.headers.get('x-hook-secret') !== reglages.hook_secret) {
    return json({ erreur: 'Non autorisé' }, 401);
  }

  const corps = await req.json().catch(() => ({}));
  const dateRapport: string = corps.date ?? new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  // Sans site précisé : tous les sites actifs (usage cron).
  let sites: { id: string }[] = [];
  if (corps.site_id) sites = [{ id: corps.site_id }];
  else {
    const { data } = await admin.from('at_sites').select('id').eq('statut', 'ACTIF');
    sites = data ?? [];
  }

  const bilan: unknown[] = [];

  for (const s of sites) {
    const { data: donnees, error } = await admin.rpc('at_rapport_journalier', {
      p_site_id: s.id, p_date: dateRapport,
    });
    if (error || !donnees) { bilan.push({ site: s.id, erreur: error?.message ?? 'sans données' }); continue; }
    const r = donnees as Rapport;

    // Logo + raison sociale pour l'en-tête (défensif : jamais bloquant).
    const [siteRow, orgRow] = await Promise.all([
      admin.from('at_sites').select('logo_url').eq('id', s.id).maybeSingle(),
      admin.from('at_organisations').select('raison_sociale').eq('id', r.organisation_id).maybeSingle(),
    ]);
    let logoBytes: Uint8Array | null = null;
    let logoJpg = false;
    const dataUrl: string | null = (siteRow.data as { logo_url: string | null } | null)?.logo_url ?? null;
    const mm = dataUrl ? /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl) : null;
    if (mm) {
      try {
        logoBytes = Uint8Array.from(atob(mm[2]), (c) => c.charCodeAt(0));
        logoJpg = /jpe?g/i.test(mm[1]);
      } catch {
        logoBytes = null;
      }
    }
    const raisonSociale = (orgRow.data as { raison_sociale: string } | null)?.raison_sociale ?? '';

    const pdf = await construirePdf(r, { logoBytes, logoJpg, raisonSociale });
    const chemin = `${r.organisation_id}/${s.id}/${dateRapport}.pdf`;
    const { error: eUp } = await admin.storage
      .from('at-rapports')
      .upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
    if (eUp) { bilan.push({ site: s.id, erreur: `dépôt : ${eUp.message}` }); continue; }

    const { data: cibles } = await admin.rpc('at__destinataires_rapport', { p_organisation_id: r.organisation_id });
    const adresses = ((cibles ?? []) as { courriel: string }[]).map((c) => c.courriel);

    let envoyeAt: string | null = null;
    let erreurEnvoi: string | null = null;
    const cle = Deno.env.get('RESEND_API_KEY');
    const expediteur = Deno.env.get('RESEND_FROM');

    if (!cle || !expediteur) {
      erreurEnvoi = 'RESEND_API_KEY ou RESEND_FROM absent — rapport déposé mais non transmis';
    } else if (adresses.length === 0) {
      erreurEnvoi = 'Aucun destinataire avec adresse e-mail';
    } else {
      const base64 = btoa(String.fromCharCode(...pdf));
      const rep = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: expediteur,
          to: adresses,
          subject: `Rapport de poste — ${r.site} — ${dateRapport}`,
          html: `<p>Bonjour,</p>
<p>Le rapport de poste du <b>${dateRapport}</b> pour <b>${r.site}</b> est en pièce jointe.</p>
<ul>
  <li>${r.acces.entrees} entrées, ${r.acces.sorties} sorties, <b>${r.acces.refus} refus</b></li>
  <li>${r.incidents.length} incident(s) du jour, <b>${r.incidents_ouverts} encore ouvert(s)</b></li>
  <li>${r.sorties_matiere.non_couvertes} présentation(s) non couverte(s) à la sortie matière</li>
</ul>
<p style="color:#666;font-size:12px">Message automatique d'Atlas Trace. Les chiffres proviennent des registres.</p>`,
          attachments: [{ filename: `rapport-${dateRapport}.pdf`, content: base64 }],
        }),
      });
      if (rep.ok) envoyeAt = new Date().toISOString();
      else erreurEnvoi = `Resend ${rep.status} : ${(await rep.text()).slice(0, 200)}`;
    }

    await admin.from('at_rapports').upsert(
      {
        organisation_id: r.organisation_id, site_id: s.id, type: 'JOURNALIER',
        periode: dateRapport, chemin, taille_octets: pdf.length, resume: r,
        destinataires: adresses, envoye_at: envoyeAt, erreur_envoi: erreurEnvoi,
        genere_par: corps.demandeur ?? 'automatique',
      },
      { onConflict: 'site_id,type,periode' },
    );

    bilan.push({ site: r.site, chemin, destinataires: adresses.length, envoye: !!envoyeAt, erreurEnvoi });
  }

  return json({ date: dateRapport, rapports: bilan });
});
