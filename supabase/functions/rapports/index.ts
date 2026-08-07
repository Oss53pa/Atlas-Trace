/**
 * rapports — génère, dépose et transmet les documents officiels d'Atlas Trace.
 *
 *   { date, site_id? }   → Rapport journalier de poste  (cron, 21:00)
 *   { incident_id }      → Rapport d'incident majeur    (déclencheur, immédiat)
 *
 * Une seule fonction pour les deux : même charte, même mise en page, même
 * chaîne de dépôt et de transmission. Un incident majeur produit son rapport
 * dans la minute ET reste consolidé dans le rapport du soir.
 *
 * Secrets : RESEND_API_KEY, RESEND_FROM.
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Polices du projet, chargées à la volée (best-effort, repli Helvetica si le
// réseau échoue → jamais bloquant). Dosis = corps de texte de l'interface ;
// Grand Hotel = signature du wordmark de couverture.
const DOSIS_REGULAR_URL = 'https://unpkg.com/@expo-google-fonts/dosis@0.2.3/Dosis_400Regular.ttf';
const DOSIS_BOLD_URL = 'https://unpkg.com/@expo-google-fonts/dosis@0.2.3/Dosis_700Bold.ttf';
const GRAND_HOTEL_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/grandhotel/GrandHotel-Regular.ttf';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (c: unknown, s = 200) =>
  new Response(JSON.stringify(c), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/* ============================================================
 * Charte
 * ========================================================== */
// Charte « Vert Volt & Olive » (Atlas Studio). Noms conservés, valeurs re-routées.
const FOREST = rgb(0.361, 0.420, 0.071);      // Olive #5C6B12 — marque / en-têtes
const FOREST_FONCE = rgb(0.157, 0.173, 0.125); // Ink #282C20 — bandeau de couverture
const FOREST_CLAIR = rgb(0.894, 0.910, 0.780); // Teinte olive #E4E8C7
const OR = rgb(0.824, 1.0, 0.0);              // Volt #D2FF00 — filets d'accent
const ENCRE = rgb(0.086, 0.090, 0.059);       // Texte #16170F
const GRIS = rgb(0.416, 0.420, 0.373);        // Muted #6A6B5F
const GRIS_CLAIR = rgb(0.925, 0.925, 0.890);  // Surface alt #ECECE3
const ROUGE = rgb(0.72, 0.19, 0.14);          // Refus (signal conservé)
const ROUGE_CLAIR = rgb(0.976, 0.918, 0.906);
const BLANC = rgb(1, 1, 1);

const MARGE = 48;
const LARGEUR = 595;
const HAUTEUR = 842;
const UTILE = LARGEUR - MARGE * 2;

/** Les polices PDF standard ne codent que le latin-1 : on ramène le reste. */
const propre = (t: unknown): string =>
  String(t ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[   ]/g, ' ')
    .replace(/•/g, '-')
    .replace(/[^\x00-\xFF]/g, '');

/* ============================================================
 * Moteur de mise en page
 * ========================================================== */
class Document {
  doc!: PDFDocument;
  page!: PDFPage;
  normal!: PDFFont;
  gras!: PDFFont;
  italique!: PDFFont;
  wordmark!: PDFFont; // Grand Hotel si disponible, sinon la police grasse courante
  wordmarkEstGrandHotel = false;
  y = 0;
  pages: PDFPage[] = [];
  reference = '';
  entete = { titre: '', site: '' };
  logo?: PDFImage;

  static async creer(): Promise<Document> {
    const d = new Document();
    d.doc = await PDFDocument.create();
    d.doc.registerFontkit(fontkit);
    // Repli sûr : polices standard, jamais bloquant.
    d.normal = await d.doc.embedFont(StandardFonts.Helvetica);
    d.gras = await d.doc.embedFont(StandardFonts.HelveticaBold);
    d.italique = await d.doc.embedFont(StandardFonts.HelveticaOblique);

    // Polices du projet en parallèle, chacune best-effort.
    const charger = async (url: string): Promise<PDFFont | null> => {
      try {
        const b = await fetch(url, { signal: AbortSignal.timeout(4500) }).then((r) => (r.ok ? r.arrayBuffer() : null));
        return b ? await d.doc.embedFont(b) : null;
      } catch {
        return null;
      }
    };
    const [dosis, dosisGras, grandHotel] = await Promise.all([
      charger(DOSIS_REGULAR_URL), charger(DOSIS_BOLD_URL), charger(GRAND_HOTEL_URL),
    ]);
    // Dosis n'est adopté que si les DEUX graisses sont disponibles (sinon on
    // garderait un mélange Dosis/Helvetica incohérent).
    if (dosis && dosisGras) { d.normal = dosis; d.gras = dosisGras; }
    if (grandHotel) { d.wordmark = grandHotel; d.wordmarkEstGrandHotel = true; } else { d.wordmark = d.gras; }
    return d;
  }

  /** Logo du site pour la couverture (défensif : ignoré si illisible). */
  async definirLogo(src: { bytes: Uint8Array; jpg: boolean } | null) {
    if (!src) return;
    try {
      this.logo = src.jpg ? await this.doc.embedJpg(src.bytes) : await this.doc.embedPng(src.bytes);
    } catch {
      this.logo = undefined;
    }
  }

  nouvellePage(avecEnteteCourant = true) {
    this.page = this.doc.addPage([LARGEUR, HAUTEUR]);
    this.pages.push(this.page);
    this.y = HAUTEUR - MARGE;
    if (avecEnteteCourant && this.pages.length > 1) {
      this.page.drawText(propre(this.entete.titre), {
        x: MARGE, y: this.y, size: 8, font: this.gras, color: GRIS,
      });
      this.page.drawText(propre(this.entete.site), {
        x: LARGEUR - MARGE - this.normal.widthOfTextAtSize(propre(this.entete.site), 8),
        y: this.y, size: 8, font: this.normal, color: GRIS,
      });
      this.y -= 8;
      this.page.drawLine({
        start: { x: MARGE, y: this.y }, end: { x: LARGEUR - MARGE, y: this.y },
        thickness: 0.5, color: GRIS_CLAIR,
      });
      this.y -= 20;
    }
  }

  /** Réserve `hauteur` points ; bascule de page si le bloc ne tient pas. */
  place(hauteur: number) {
    if (this.y - hauteur < MARGE + 40) this.nouvellePage();
  }

  texte(t: string, o: { x?: number; taille?: number; police?: PDFFont; couleur?: typeof ENCRE } = {}) {
    this.page.drawText(propre(t), {
      x: o.x ?? MARGE, y: this.y,
      size: o.taille ?? 9.5,
      font: o.police ?? this.normal,
      color: o.couleur ?? ENCRE,
    });
  }

  /** Découpe un texte long en lignes qui tiennent dans `largeur`. */
  decouper(t: string, largeur: number, police: PDFFont, taille: number): string[] {
    const sortie: string[] = [];
    for (const paragraphe of propre(t).split('\n')) {
      let ligne = '';
      for (const mot of paragraphe.split(/\s+/)) {
        const essai = ligne ? `${ligne} ${mot}` : mot;
        if (police.widthOfTextAtSize(essai, taille) > largeur && ligne) {
          sortie.push(ligne);
          ligne = mot;
        } else ligne = essai;
      }
      sortie.push(ligne);
    }
    return sortie;
  }

  /* ---------- Blocs ---------- */

  couverture(o: { titre: string; site: string; sousTitre: string; reference: string; urgent?: boolean }) {
    this.nouvellePage(false);
    this.reference = o.reference;
    this.entete = { titre: o.titre, site: o.site };
    const teinte = o.urgent ? ROUGE : FOREST_FONCE;

    this.page.drawRectangle({ x: 0, y: HAUTEUR - 132, width: LARGEUR, height: 132, color: teinte });
    // Filet Volt sous le bandeau (signature électrique Atlas Studio).
    this.page.drawRectangle({ x: 0, y: HAUTEUR - 136, width: LARGEUR, height: 4, color: OR });

    // Wordmark en Grand Hotel (« Atlas Trace ») ; retombe en gras standard sinon.
    const grandHotel = this.wordmarkEstGrandHotel;
    this.page.drawText(grandHotel ? 'Atlas Trace' : 'ATLAS TRACE', {
      x: MARGE, y: HAUTEUR - 58, size: grandHotel ? 30 : 22, font: this.wordmark, color: BLANC,
    });
    this.page.drawText(propre('Controle d acces et de flux'), {
      x: MARGE, y: HAUTEUR - 74, size: 8.5, font: this.normal, color: rgb(0.9, 0.93, 0.85),
    });
    this.page.drawText(propre(o.titre.toUpperCase()), {
      x: MARGE, y: HAUTEUR - 102, size: 15, font: this.gras, color: BLANC,
    });
    this.page.drawText(propre(o.sousTitre), {
      x: MARGE, y: HAUTEUR - 120, size: 10, font: this.normal, color: rgb(0.9, 0.93, 0.92),
    });

    const ref = propre(o.reference);
    this.page.drawText(ref, {
      x: LARGEUR - MARGE - this.gras.widthOfTextAtSize(ref, 10),
      y: HAUTEUR - 54, size: 10, font: this.gras, color: BLANC,
    });
    const diff = propre('DIFFUSION RESTREINTE');
    this.page.drawText(diff, {
      x: LARGEUR - MARGE - this.normal.widthOfTextAtSize(diff, 7.5),
      y: HAUTEUR - 68, size: 7.5, font: this.normal, color: rgb(0.85, 0.89, 0.87),
    });

    // Logo du site en bas droite du bandeau, sur un cartouche blanc pour rester
    // lisible quelle que soit l'image. Défensif : rien si pas de logo.
    if (this.logo) {
      const h = 30;
      const w = Math.min(120, (this.logo.width / this.logo.height) * h);
      const lx = LARGEUR - MARGE - w;
      const ly = HAUTEUR - 128;
      this.page.drawRectangle({ x: lx - 6, y: ly - 5, width: w + 12, height: h + 10, color: BLANC });
      this.page.drawImage(this.logo, { x: lx, y: ly, width: w, height: h });
    }

    this.y = HAUTEUR - 168;
  }

  section(titre: string) {
    this.place(46);
    this.y -= 12;
    this.page.drawRectangle({ x: MARGE, y: this.y - 3, width: 3, height: 13, color: OR });
    this.texte(titre.toUpperCase(), { x: MARGE + 10, taille: 10.5, police: this.gras, couleur: FOREST });
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGE, y: this.y }, end: { x: LARGEUR - MARGE, y: this.y },
      thickness: 0.75, color: FOREST_CLAIR,
    });
    this.y -= 16;
  }

  /** Bandeau de chiffres clés, 2 à 4 par ligne. */
  indicateurs(items: { libelle: string; valeur: string | number; alerte?: boolean }[]) {
    const parLigne = Math.min(items.length, 4);
    const largeur = (UTILE - (parLigne - 1) * 8) / parLigne;
    for (let i = 0; i < items.length; i += parLigne) {
      const tranche = items.slice(i, i + parLigne);
      this.place(58);
      const haut = this.y;
      tranche.forEach((it, j) => {
        const x = MARGE + j * (largeur + 8);
        this.page.drawRectangle({
          x, y: haut - 46, width: largeur, height: 46,
          color: it.alerte ? ROUGE_CLAIR : GRIS_CLAIR,
          borderColor: it.alerte ? ROUGE : GRIS_CLAIR, borderWidth: it.alerte ? 0.75 : 0,
        });
        const v = propre(String(it.valeur));
        this.page.drawText(v, {
          x: x + (largeur - this.gras.widthOfTextAtSize(v, 20)) / 2,
          y: haut - 27, size: 20, font: this.gras, color: it.alerte ? ROUGE : FOREST,
        });
        const l = propre(it.libelle);
        const taille = this.normal.widthOfTextAtSize(l, 7.5) > largeur - 8 ? 6.5 : 7.5;
        this.page.drawText(l, {
          x: x + (largeur - this.normal.widthOfTextAtSize(l, taille)) / 2,
          y: haut - 40, size: taille, font: this.normal, color: GRIS,
        });
      });
      this.y = haut - 56;
    }
  }

  tableau(colonnes: { libelle: string; largeur: number; droite?: boolean }[], lignes: (string | number)[][],
          o: { surligne?: (l: (string | number)[]) => boolean } = {}) {
    const total = colonnes.reduce((s, c) => s + c.largeur, 0);
    const echelle = UTILE / total;
    const larg = colonnes.map((c) => c.largeur * echelle);

    const enTete = () => {
      this.place(24);
      this.page.drawRectangle({ x: MARGE, y: this.y - 5, width: UTILE, height: 18, color: FOREST });
      let x = MARGE + 6;
      colonnes.forEach((c, i) => {
        const t = propre(c.libelle);
        this.page.drawText(t, {
          x: c.droite ? x + larg[i] - 12 - this.gras.widthOfTextAtSize(t, 8) : x,
          y: this.y, size: 8, font: this.gras, color: BLANC,
        });
        x += larg[i];
      });
      this.y -= 22;
    };

    enTete();
    lignes.forEach((ligne, n) => {
      if (this.y - 16 < MARGE + 40) { this.nouvellePage(); enTete(); }
      const alerte = o.surligne?.(ligne) ?? false;
      if (alerte || n % 2 === 1) {
        this.page.drawRectangle({
          x: MARGE, y: this.y - 4, width: UTILE, height: 15,
          color: alerte ? ROUGE_CLAIR : rgb(0.98, 0.976, 0.965),
        });
      }
      let x = MARGE + 6;
      ligne.forEach((cel, i) => {
        const t = propre(String(cel));
        const police = i === 0 || colonnes[i].droite ? this.gras : this.normal;
        const coupe = this.decouper(t, larg[i] - 12, police, 8.5)[0];
        this.page.drawText(coupe, {
          x: colonnes[i].droite ? x + larg[i] - 12 - police.widthOfTextAtSize(coupe, 8.5) : x,
          y: this.y, size: 8.5, font: police, color: alerte ? ROUGE : ENCRE,
        });
        x += larg[i];
      });
      this.y -= 15;
    });
    this.y -= 6;
  }

  /** Bloc de texte long, avec un intitulé au-dessus. */
  bloc(intitule: string, contenu: string | null | undefined, o: { vide?: string } = {}) {
    const texte = (contenu ?? '').trim() || o.vide || 'Non renseigné.';
    const lignes = this.decouper(texte, UTILE - 16, this.normal, 9.5);
    this.place(20 + lignes.length * 12);
    this.texte(intitule, { taille: 8, police: this.gras, couleur: GRIS });
    this.y -= 13;
    const haut = this.y;
    this.page.drawRectangle({
      x: MARGE, y: haut - lignes.length * 12 + 1, width: UTILE, height: lignes.length * 12 + 8,
      color: rgb(0.985, 0.98, 0.965),
    });
    this.page.drawRectangle({
      x: MARGE, y: haut - lignes.length * 12 + 1, width: 2, height: lignes.length * 12 + 8, color: FOREST_CLAIR,
    });
    this.y -= 2;
    for (const l of lignes) {
      this.texte(l, { x: MARGE + 10 });
      this.y -= 12;
    }
    this.y -= 8;
  }

  encadre(texte: string, ton: 'alerte' | 'info' = 'info') {
    const lignes = this.decouper(texte, UTILE - 24, this.gras, 9);
    this.place(lignes.length * 12 + 18);
    const haut = this.y;
    const h = lignes.length * 12 + 12;
    this.page.drawRectangle({
      x: MARGE, y: haut - h + 8, width: UTILE, height: h,
      color: ton === 'alerte' ? ROUGE_CLAIR : FOREST_CLAIR,
      borderColor: ton === 'alerte' ? ROUGE : FOREST, borderWidth: 0.75,
    });
    this.y -= 4;
    for (const l of lignes) {
      this.texte(l, { x: MARGE + 12, police: this.gras, couleur: ton === 'alerte' ? ROUGE : FOREST });
      this.y -= 12;
    }
    this.y -= 10;
  }

  signature(gauche: string, droite: string) {
    this.place(64);
    this.y -= 16;
    const larg = (UTILE - 20) / 2;
    [[MARGE, gauche], [MARGE + larg + 20, droite]].forEach(([x, intitule]) => {
      this.page.drawLine({
        start: { x: x as number, y: this.y }, end: { x: (x as number) + larg, y: this.y },
        thickness: 0.75, color: GRIS,
      });
      this.page.drawText(propre(intitule as string), {
        x: x as number, y: this.y - 11, size: 7.5, font: this.normal, color: GRIS,
      });
    });
    this.y -= 34;
  }

  /** Pieds de page numérotés : posés à la fin, quand le total est connu. */
  async finaliser(mentions: string): Promise<Uint8Array> {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      p.drawLine({
        start: { x: MARGE, y: MARGE + 22 }, end: { x: LARGEUR - MARGE, y: MARGE + 22 },
        thickness: 0.5, color: GRIS_CLAIR,
      });
      p.drawText(propre(mentions), { x: MARGE, y: MARGE + 12, size: 6.8, font: this.normal, color: GRIS });
      p.drawText(propre(this.reference), { x: MARGE, y: MARGE + 3, size: 6.8, font: this.gras, color: GRIS });
      const pag = `Page ${i + 1} / ${total}`;
      p.drawText(pag, {
        x: LARGEUR - MARGE - this.normal.widthOfTextAtSize(pag, 7.5),
        y: MARGE + 8, size: 7.5, font: this.normal, color: GRIS,
      });
    });
    return this.doc.save();
  }
}

/* ============================================================
 * Documents
 * ========================================================== */
const MOTIFS: Record<string, string> = {
  BADGE_INCONNU: 'Badge non identifiable', BADGE_EXPIRE: 'Badge expire', BADGE_SUSPENDU: 'Badge suspendu',
  ENTREPRISE_SUSPENDUE: 'Entreprise suspendue', DONNEUR_ORDRE_BLOQUE: 'Preneur bloque',
  HORS_LISTE: 'Absent du registre de presence', HORS_ZONE: 'Zone non autorisee',
  HORS_EMPRISE: 'Emprise non autorisee', HORS_PLAGE: 'Hors plage horaire',
  DEJA_ENTRE: 'Entree deja enregistree', INDUCTION_EXPIREE: 'Induction HSE expiree',
  NON_PRECISE: 'Non precise',
};
const CATEGORIES: Record<string, string> = {
  PRISE_POSTE: 'Prise de poste', RONDE: 'Ronde', FORCAGE: "Forcage d acces",
  REFUS: 'Refus consigne', RETENUE: 'Retenue de materiel', VISITEUR: 'Visiteur',
  CLE: 'Cle', AUTRE: 'Autre',
};

const dateLongue = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

type Journalier = {
  site: string; date: string; organisation_id: string;
  acces: { entrees: number; sorties: number; refus: number; forcages: number; total: number };
  refus_par_motif: { motif: string; nombre: number }[];
  sorties_matiere: { autorisees: number; refusees: number; par_autorisation: number; non_couvertes: number };
  incidents: { numero: string; titre: string; gravite: string; statut: string; agent: string; heure: string }[];
  incidents_ouverts: number; evenements: number;
};

async function pdfJournalier(r: Journalier, reference: string, logo: { bytes: Uint8Array; jpg: boolean } | null): Promise<Uint8Array> {
  const d = await Document.creer();
  await d.definirLogo(logo);
  d.couverture({
    titre: 'Rapport journalier de poste',
    site: r.site,
    sousTitre: `${r.site} — ${dateLongue(r.date)}`,
    reference,
  });

  const tauxRefus = r.acces.total ? Math.round((r.acces.refus / r.acces.total) * 100) : 0;
  const majeursOuverts = r.incidents.filter((i) => i.gravite === 'MAJEUR' && i.statut === 'OUVERT').length;

  d.section('Synthese de la journee');
  d.indicateurs([
    { libelle: 'Entrees', valeur: r.acces.entrees },
    { libelle: 'Sorties', valeur: r.acces.sorties },
    { libelle: 'Refus consignes', valeur: r.acces.refus, alerte: r.acces.refus > 0 },
    { libelle: 'Incidents ouverts', valeur: r.incidents_ouverts, alerte: r.incidents_ouverts > 0 },
  ]);

  if (majeursOuverts > 0 || r.sorties_matiere.non_couvertes > 0 || r.acces.forcages > 0) {
    const points: string[] = [];
    if (majeursOuverts) points.push(`${majeursOuverts} incident(s) majeur(s) non clos`);
    if (r.sorties_matiere.non_couvertes) points.push(`${r.sorties_matiere.non_couvertes} presentation(s) non couverte(s) a la sortie (regle R1)`);
    if (r.acces.forcages) points.push(`${r.acces.forcages} forcage(s) d acces, motives et photographies`);
    d.encadre(`Points d attention : ${points.join(' ; ')}.`, 'alerte');
  } else {
    d.encadre('Aucun point d attention : journee sans incident majeur ouvert ni presentation non couverte.', 'info');
  }

  d.section('Controle d acces');
  d.tableau(
    [{ libelle: 'Indicateur', largeur: 70 }, { libelle: 'Valeur', largeur: 20, droite: true }, { libelle: 'Part', largeur: 15, droite: true }],
    [
      ['Passages controles', r.acces.total, '100 %'],
      ['Entrees enregistrees', r.acces.entrees, r.acces.total ? `${Math.round((r.acces.entrees / r.acces.total) * 100)} %` : '-'],
      ['Sorties enregistrees', r.acces.sorties, r.acces.total ? `${Math.round((r.acces.sorties / r.acces.total) * 100)} %` : '-'],
      ['Refus consignes', r.acces.refus, `${tauxRefus} %`],
      ['Forcages (motif + photo obligatoires)', r.acces.forcages, r.acces.total ? `${Math.round((r.acces.forcages / r.acces.total) * 100)} %` : '-'],
    ],
    { surligne: (l) => String(l[0]).startsWith('Forcages') && Number(l[1]) > 0 },
  );

  d.section('Motifs de refus');
  if (r.refus_par_motif.length) {
    d.tableau(
      [{ libelle: 'Motif', largeur: 70 }, { libelle: 'Nombre', largeur: 15, droite: true }, { libelle: 'Part des refus', largeur: 20, droite: true }],
      r.refus_par_motif.map((m) => [
        MOTIFS[m.motif] ?? m.motif, m.nombre,
        r.acces.refus ? `${Math.round((m.nombre / r.acces.refus) * 100)} %` : '-',
      ]),
    );
  } else {
    d.bloc('Constat', 'Aucun refus consigne sur la periode.');
  }

  d.section('Sorties matiere');
  d.tableau(
    [{ libelle: 'Indicateur', largeur: 78 }, { libelle: 'Valeur', largeur: 22, droite: true }],
    [
      ['Sorties autorisees', r.sorties_matiere.autorisees],
      ['dont couvertes par une autorisation approuvee', r.sorties_matiere.par_autorisation],
      ['Sorties refusees', r.sorties_matiere.refusees],
      ['Presentations non couvertes (regle R1)', r.sorties_matiere.non_couvertes],
    ],
    { surligne: (l) => String(l[0]).includes('non couvertes') && Number(l[1]) > 0 },
  );

  d.section('Main courante et incidents');
  d.tableau(
    [{ libelle: 'Indicateur', largeur: 78 }, { libelle: 'Valeur', largeur: 22, droite: true }],
    [
      ['Evenements consignes', r.evenements],
      ['Incidents ouverts ce jour', r.incidents.length],
      ['Incidents ouverts, toutes dates', r.incidents_ouverts],
    ],
  );

  if (r.incidents.length) {
    d.section('Detail des incidents du jour');
    d.tableau(
      [
        { libelle: 'Heure', largeur: 10 }, { libelle: 'Reference', largeur: 20 },
        { libelle: 'Objet', largeur: 42 }, { libelle: 'Gravite', largeur: 14 },
        { libelle: 'Etat', largeur: 14, droite: true },
      ],
      r.incidents.map((i) => [
        i.heure, i.numero ?? '-', i.titre,
        i.gravite === 'MAJEUR' ? 'Majeur' : 'Mineur',
        i.statut === 'OUVERT' ? 'Ouvert' : 'Clos',
      ]),
      { surligne: (l) => l[3] === 'Majeur' },
    );
    d.bloc(
      'Rappel',
      'Chaque incident majeur fait l objet d un rapport distinct emis des sa consignation et transmis a la chaine de commandement. Le present document en consolide la liste.',
    );
  }

  d.signature('Etabli automatiquement par Atlas Trace', 'Vise par (nom, fonction, date)');

  return d.finaliser(
    "Document genere automatiquement a partir des registres. Aucune saisie manuelle n intervient dans les chiffres. Diffusion restreinte.",
  );
}

type Incident = {
  id: string; numero: string; organisation_id: string; site_id: string; site: string;
  categorie: string; titre: string; description: string; gravite: string; statut: string;
  circonstances: string | null; mesures: string | null; suites: string | null;
  agent: string; photo: boolean; horodatage: string; jour: string;
};

async function pdfIncident(i: Incident, reference: string, logo: { bytes: Uint8Array; jpg: boolean } | null): Promise<Uint8Array> {
  const d = await Document.creer();
  await d.definirLogo(logo);
  const majeur = i.gravite === 'MAJEUR';
  d.couverture({
    titre: `Rapport d incident ${majeur ? 'majeur' : ''}`.trim(),
    site: i.site,
    sousTitre: `${i.numero ?? ''} — ${i.site} — ${i.horodatage}`,
    reference,
    urgent: majeur,
  });

  d.encadre(
    majeur
      ? 'INCIDENT MAJEUR — transmission immediate a la chaine de commandement (HSE Officer, Directeur de la Construction).'
      : 'Incident mineur — consigne au registre et transmis pour information.',
    majeur ? 'alerte' : 'info',
  );

  d.section('Identification');
  d.tableau(
    [{ libelle: 'Rubrique', largeur: 32 }, { libelle: 'Valeur', largeur: 68 }],
    [
      ['Reference', i.numero ?? '-'],
      ['Site', i.site],
      ['Date et heure du constat', i.horodatage],
      ['Categorie', CATEGORIES[i.categorie] ?? i.categorie],
      ['Gravite', majeur ? 'Majeur' : 'Mineur'],
      ['Etat', i.statut === 'OUVERT' ? 'Ouvert' : 'Clos'],
      ['Agent ayant consigne', i.agent],
      ['Piece photographique', i.photo ? 'Jointe au dossier' : 'Aucune'],
    ],
    { surligne: (l) => l[0] === 'Gravite' && l[1] === 'Majeur' },
  );

  d.section('Objet');
  d.bloc('Intitule', i.titre);
  d.bloc('Faits constates', i.description);

  d.section('Analyse');
  d.bloc('Circonstances', i.circonstances, { vide: 'Circonstances non encore renseignees au moment de l emission.' });
  d.bloc('Mesures prises immediatement', i.mesures, { vide: 'Mesures non encore renseignees au moment de l emission.' });
  d.bloc('Suites donnees', i.suites, { vide: 'En attente : l incident est ouvert.' });

  if (i.statut === 'OUVERT') {
    d.encadre(
      'Incident ouvert. La cloture releve de la chaine de commandement et exige circonstances, mesures prises et suites renseignees.',
      'alerte',
    );
  }

  d.section('Diffusion');
  d.bloc(
    'Destinataires',
    'HSE Officer, Directeur de la Construction, direction du site. Ce rapport est emis automatiquement des la consignation ; l incident est egalement consolide dans le rapport journalier de poste.',
  );

  d.signature('Agent ayant consigne : ' + propre(i.agent), 'Visa de la chaine de commandement');

  return d.finaliser(
    'Rapport emis automatiquement par Atlas Trace des la consignation. Le registre est inalterable apres cloture. Diffusion restreinte.',
  );
}

/* ============================================================
 * Courriels de marque (HTML)
 * ========================================================== */
const ESC = (s: unknown) =>
  String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

/** Coquille commune : bandeau Ink→Olive, filet Volt, corps, pied de page. */
function coquilleEmail(o: { badge: string; corps: string; urgent?: boolean }): string {
  const bandeau = o.urgent
    ? 'linear-gradient(120deg,#5A1009,#8A1A12 70%,#C0392B)'
    : 'linear-gradient(120deg,#282C20,#3E4A0C 60%,#5C6B12)';
  const filet = o.urgent ? '#C0392B' : '#D2FF00';
  const surtitre = o.urgent ? '#FFD7D1' : '#D2FF00';
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#F4F4ED;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4ED;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:600px;max-width:94%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E4E4D6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:#282C20;background:${bandeau};padding:26px 32px;">
          <div style="font-size:27px;font-weight:800;color:#ffffff;letter-spacing:.3px;">Atlas Trace</div>
          <div style="margin-top:3px;font-size:11.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${surtitre};">${ESC(o.badge)}</div>
        </td></tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background:${filet};">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px;color:#16170F;font-size:14px;line-height:1.55;">${o.corps}</td></tr>
        <tr><td style="padding:16px 32px;background:#ECECE3;color:#6A6B5F;font-size:11px;line-height:1.5;">
          Message automatique d'Atlas Trace &middot; les chiffres proviennent des registres, sans saisie manuelle &middot; diffusion restreinte.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Carte de chiffre clé (pilule) pour la rangée de synthèse. */
function pilule(valeur: number | string, libelle: string, alerte = false): string {
  const couleur = alerte ? '#C0392B' : '#5C6B12';
  const fond = alerte ? '#F8E7E4' : '#F4F4ED';
  return `<td width="33.33%" style="padding:5px;"><div style="background:${fond};border-radius:12px;padding:16px 6px;text-align:center;">
    <div style="font-size:28px;line-height:1;font-weight:800;color:${couleur};">${ESC(valeur)}</div>
    <div style="margin-top:6px;font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:#6A6B5F;">${ESC(libelle)}</div>
  </div></td>`;
}

const ligneInfo = (k: string, v: unknown) =>
  `<tr><td style="padding:5px 14px 5px 0;color:#6A6B5F;white-space:nowrap;vertical-align:top;">${ESC(k)}</td><td style="padding:5px 0;color:#16170F;font-weight:700;">${ESC(v)}</td></tr>`;

/* ============================================================
 * Dépôt et transmission
 * ========================================================== */
async function transmettre(o: {
  sujet: string; html: string; fichier: string; pdf: Uint8Array; adresses: string[];
}): Promise<{ envoyeAt: string | null; erreur: string | null }> {
  const cle = Deno.env.get('RESEND_API_KEY');
  const expediteur = Deno.env.get('RESEND_FROM');
  if (!cle || !expediteur) return { envoyeAt: null, erreur: 'RESEND_API_KEY ou RESEND_FROM absent - document depose mais non transmis' };
  if (!o.adresses.length) return { envoyeAt: null, erreur: 'Aucun destinataire avec adresse e-mail' };

  let binaire = '';
  for (const octet of o.pdf) binaire += String.fromCharCode(octet);

  const rep = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: expediteur, to: o.adresses, subject: o.sujet, html: o.html,
      attachments: [{ filename: o.fichier, content: btoa(binaire) }],
    }),
  });
  if (rep.ok) return { envoyeAt: new Date().toISOString(), erreur: null };
  return { envoyeAt: null, erreur: `Resend ${rep.status} : ${(await rep.text()).slice(0, 200)}` };
}

async function adressesDe(organisationId: string): Promise<string[]> {
  const { data } = await admin.rpc('at__destinataires_rapport', { p_organisation_id: organisationId });
  return ((data ?? []) as { courriel: string }[]).map((c) => c.courriel);
}

/** Logo du site (data URL en base) décodé pour pdf-lib. Défensif : null si absent/illisible. */
async function chargerLogo(siteId: string): Promise<{ bytes: Uint8Array; jpg: boolean } | null> {
  const { data } = await admin.from('at_sites').select('logo_url').eq('id', siteId).maybeSingle();
  const url = (data as { logo_url: string | null } | null)?.logo_url ?? null;
  const m = url ? /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(url) : null;
  if (!m) return null;
  try {
    return { bytes: Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0)), jpg: /jpe?g/i.test(m[1]) };
  } catch {
    return null;
  }
}

/* ============================================================
 * Entrée
 * ========================================================== */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'Methode non supportee' }, 405);

  const { data: reglages } = await admin.from('at_reglages_push').select('hook_secret').maybeSingle();
  if (!reglages?.hook_secret || req.headers.get('x-hook-secret') !== reglages.hook_secret) {
    return json({ erreur: 'Non autorise' }, 401);
  }

  const corps = await req.json().catch(() => ({}));

  /* ---------- Rapport d'incident ---------- */
  if (corps.incident_id) {
    const { data, error } = await admin.rpc('at_detail_incident', { p_id: corps.incident_id });
    if (error || !data) return json({ erreur: 'Incident introuvable' }, 404);
    const i = data as Incident;

    const reference = `ATS-RI-${i.numero ?? i.id.slice(0, 8)}`;
    const pdf = await pdfIncident(i, reference, await chargerLogo(i.site_id));
    const chemin = `${i.organisation_id}/${i.site_id}/incidents/${i.numero ?? i.id}.pdf`;
    const { error: eUp } = await admin.storage
      .from('at-rapports').upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
    if (eUp) return json({ erreur: `depot : ${eUp.message}` }, 500);

    const adresses = await adressesDe(i.organisation_id);
    const majeur = i.gravite === 'MAJEUR';
    const corpsEmail = `<p style="margin:0 0 6px;">Bonjour,</p>
<p style="margin:0 0 18px;color:#6A6B5F;">Un incident <b style="color:${majeur ? '#C0392B' : '#16170F'};">${majeur ? 'majeur' : 'mineur'}</b> vient d'être consigné sur <b style="color:#16170F;">${ESC(i.site)}</b>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
${ligneInfo('Référence', i.numero ?? '-')}${ligneInfo('Constat', i.horodatage)}${ligneInfo('Objet', i.titre)}${ligneInfo('Agent', i.agent)}
</table>
${majeur ? `<div style="margin-top:18px;padding:12px 16px;border-radius:10px;background:#F8E7E4;border:1px solid #E9C4BE;color:#8A2A20;font-size:13px;"><b>Transmission immédiate</b> à la chaîne de commandement (HSE, Directeur de la Construction).</div>` : ''}
<p style="margin:18px 0 0;font-size:13px;color:#6A6B5F;">Rapport complet en pièce jointe. L'incident sera consolidé dans le rapport journalier de poste.</p>`;
    const { envoyeAt, erreur } = await transmettre({
      sujet: `${majeur ? '[MAJEUR] ' : ''}Incident ${i.numero ?? ''} - ${i.site}`,
      fichier: `incident-${i.numero ?? i.id}.pdf`,
      pdf, adresses,
      html: coquilleEmail({ badge: `Rapport d'incident ${majeur ? 'majeur' : ''}`.trim(), corps: corpsEmail, urgent: majeur }),
    });

    await admin.from('at_rapports').upsert(
      {
        organisation_id: i.organisation_id, site_id: i.site_id, type: 'INCIDENT',
        incident_id: i.id, periode: i.jour, chemin, taille_octets: pdf.length,
        resume: { numero: i.numero, titre: i.titre, gravite: i.gravite },
        destinataires: adresses, envoye_at: envoyeAt, erreur_envoi: erreur,
        genere_par: 'automatique',
      },
      { onConflict: 'incident_id' },
    );

    return json({ type: 'INCIDENT', reference, chemin, destinataires: adresses.length, envoye: !!envoyeAt, erreur });
  }

  /* ---------- Rapport journalier ---------- */
  const dateRapport: string = corps.date ?? new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  let sites: { id: string }[] = [];
  if (corps.site_id) sites = [{ id: corps.site_id }];
  else {
    const { data } = await admin.from('at_sites').select('id').eq('statut', 'ACTIF');
    sites = data ?? [];
  }

  const bilan: unknown[] = [];
  for (const s of sites) {
    const { data, error } = await admin.rpc('at_rapport_journalier', { p_site_id: s.id, p_date: dateRapport });
    if (error || !data) { bilan.push({ site: s.id, erreur: error?.message ?? 'sans donnees' }); continue; }
    const r = data as Journalier;

    const reference = `ATS-RJ-${dateRapport.replace(/-/g, '')}-${s.id.slice(0, 4).toUpperCase()}`;
    const pdf = await pdfJournalier(r, reference, await chargerLogo(s.id));
    const chemin = `${r.organisation_id}/${s.id}/${dateRapport}.pdf`;
    const { error: eUp } = await admin.storage
      .from('at-rapports').upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
    if (eUp) { bilan.push({ site: s.id, erreur: `depot : ${eUp.message}` }); continue; }

    const adresses = await adressesDe(r.organisation_id);
    const points: string[] = [];
    if (r.incidents_ouverts) points.push(`${r.incidents_ouverts} incident(s) encore ouvert(s)`);
    if (r.sorties_matiere.non_couvertes) points.push(`${r.sorties_matiere.non_couvertes} présentation(s) non couverte(s) à la sortie (R1)`);
    if (r.acces.forcages) points.push(`${r.acces.forcages} forçage(s) motivé(s)`);
    const callout = points.length
      ? `<div style="margin-top:18px;padding:12px 16px;border-radius:10px;background:#F8E7E4;border:1px solid #E9C4BE;color:#8A2A20;font-size:13px;"><b>À suivre :</b> ${ESC(points.join(' ; '))}.</div>`
      : `<div style="margin-top:18px;padding:12px 16px;border-radius:10px;background:#EFF3DC;border:1px solid #D6E08C;color:#4E5C10;font-size:13px;"><b>RAS :</b> journée sans incident majeur ouvert ni présentation non couverte.</div>`;
    const corpsEmail = `<p style="margin:0 0 6px;">Bonjour,</p>
<p style="margin:0 0 20px;color:#6A6B5F;">Rapport de poste du <b style="color:#16170F;">${ESC(dateLongue(dateRapport))}</b> pour <b style="color:#16170F;">${ESC(r.site)}</b>. Le document complet est en pièce jointe.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${pilule(r.acces.entrees, 'Entrées')}${pilule(r.acces.sorties, 'Sorties')}${pilule(r.acces.refus, 'Refus consignés', r.acces.refus > 0)}
</tr></table>
${callout}
<p style="margin:22px 0 0;font-size:13px;color:#6A6B5F;">Pièce jointe : <b style="color:#16170F;">rapport-${dateRapport}.pdf</b></p>`;
    const { envoyeAt, erreur } = await transmettre({
      sujet: `Rapport de poste - ${r.site} - ${dateRapport}`,
      fichier: `rapport-${dateRapport}.pdf`,
      pdf, adresses,
      html: coquilleEmail({ badge: 'Rapport journalier de poste', corps: corpsEmail }),
    });

    await admin.from('at_rapports').upsert(
      {
        organisation_id: r.organisation_id, site_id: s.id, type: 'JOURNALIER',
        periode: dateRapport, chemin, taille_octets: pdf.length, resume: r,
        destinataires: adresses, envoye_at: envoyeAt, erreur_envoi: erreur,
        genere_par: corps.demandeur ?? 'automatique',
      },
      { onConflict: 'site_id,periode' },
    );

    bilan.push({ site: r.site, reference, chemin, destinataires: adresses.length, envoye: !!envoyeAt, erreur });
  }

  return json({ type: 'JOURNALIER', date: dateRapport, rapports: bilan });
});
