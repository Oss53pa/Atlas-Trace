import { X, Check, Compass, ArrowRight } from 'lucide-react';
import { useAuthz } from '../../lib/authz';
import { familleDe, type Famille } from '../../lib/roles';
import { POUVOIRS } from '../../data/parametrage';

/** Feuille « Comment ça marche » adaptée au rôle connecté. Le contenu est
 * dérivé des pouvoirs réels (via at_mes_pouvoirs), donc toujours à jour : il
 * suit ce que le rôle autorise, sans documentation à maintenir à part. */

const FAMILLE_INTRO: Record<Famille, { titre: string; texte: string }> = {
  TERRAIN: {
    titre: 'Poste & terrain',
    texte: 'Vous tenez le poste : vous contrôlez les accès au badge et vous tracez ce qui se passe, au fil de la journée.',
  },
  VALIDATION: {
    titre: 'Instruction & validation',
    texte: 'Vous instruisez les dossiers et vous les validez à votre étape : habilitations, sorties, livraisons.',
  },
  DIRECTION: {
    titre: 'Pilotage & administration',
    texte: 'Vous pilotez et administrez le site : supervision temps réel, registres, comptes, rôles et paramétrage.',
  },
  REFERENT: {
    titre: 'Référent d’entreprise',
    texte: 'Vous représentez votre entreprise : vous déclarez vos intervenants et votre matériel, et vous faites vos demandes.',
  },
  BASE: {
    titre: 'Bienvenue sur Atlas Trace',
    texte: 'Votre rôle ne comporte pas encore d’action dédiée. Rapprochez-vous de l’administration du site.',
  },
};

/** Phrase « vous pouvez… » par pouvoir. Repli sur le libellé du catalogue si absent. */
const POUVOIR_AIDE: Record<string, string> = {
  CONTROLER_AU_POSTE: 'Scanner les badges au poste, autoriser ou refuser un accès, enregistrer chaque contrôle.',
  FORCER_ACCES: 'Forcer un accès malgré un refus du système — motif et photo tracés.',
  CLOTURER_JOURNEE: 'Clôturer la journée et régulariser les présences prolongées.',
  RECEPTIONNER: 'Accuser la prise en charge des livraisons (oui/non, avec photo).',
  SUIVRE_INCIDENTS: 'Compléter et clôturer les rapports d’incident de la main courante.',
  DELIVRER_BADGE: 'Imprimer un badge nominatif, remettre un badge temporaire, gérer les clés.',
  DECLARER_PERSONNEL: 'Déclarer des personnes et leur photo, les rattacher à une entreprise.',
  DEPOSER_LISTE: 'Alimenter le registre de présence du jour.',
  DECLARER_ENTREPRISE: 'Créer et tenir à jour les fiches d’entreprise.',
  DECLARER_MATERIEL: 'Déclarer le matériel entrant (dotation par famille).',
  DEMANDER_SORTIE: 'Créer une demande de sortie de matériel.',
  DEMANDER_LIVRAISON: 'Déposer un préavis de livraison et réserver un créneau.',
  VISER_HABILITATION: 'Viser les dossiers d’habilitation d’entreprise.',
  APPROUVER_HABILITATION: 'Approuver définitivement une habilitation (après le visa d’un autre agent).',
  VISER_SORTIE: 'Viser les demandes de sortie de matériel.',
  APPROUVER_SORTIE: 'Approuver une sortie — cela génère le code de sortie.',
  VALIDER_CRENEAU: 'Attribuer ou refuser les créneaux de livraison, gérer les conditions des preneurs.',
  AUTORISER_EVACUATION: 'Autoriser les évacuations de déblais.',
  GERER_CONDITIONS_BLOQUANTES: 'Gérer les conditions préalables des preneurs.',
  SUSPENDRE_ACCES: 'Suspendre l’accès d’une personne ou d’une entreprise (elle est refusée au poste).',
  CONSULTER_TABLEAU: 'Suivre le tableau de bord temps réel du site et ses alertes.',
  EXPORTER: 'Produire les registres et exports.',
  CONSULTER_AUDIT: 'Consulter le journal d’audit.',
  ADMINISTRER_ORGANISATION: 'Administrer le site : rôles, comptes, référentiels et paramétrage.',
};

export function CommentCaMarche({ primaires, onClose }: { primaires: { court: string }[]; onClose: () => void }) {
  const { pouvoirs, connecte } = useAuthz();
  const intro = connecte
    ? FAMILLE_INTRO[familleDe(pouvoirs)]
    : { titre: 'Découverte', texte: 'Vous explorez Atlas Trace en démonstration : toutes les interfaces sont visibles.' };
  // Ordonné selon le catalogue ; repli sur le libellé « effet » si pas de phrase dédiée.
  const lignes = POUVOIRS.filter((p) => pouvoirs.has(p.code)).map((p) => POUVOIR_AIDE[p.code] ?? p.effet);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-md animate-fade-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sand-300 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Comment ça marche</p>
              <h2 className="text-lg font-extrabold leading-tight text-ink">{intro.titre}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-2xl bg-sand-50 px-4 py-3 text-sm leading-relaxed text-ink ring-1 ring-sand-200">{intro.texte}</p>

        {!connecte && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            Mode démonstration : vous voyez toutes les interfaces. Une fois connecté, l’application n’affiche que ce que votre rôle autorise.
          </p>
        )}

        {primaires.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Votre barre du bas</h3>
            <div className="flex flex-wrap gap-1.5">
              {primaires.map((d) => (
                <span key={d.court} className="rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700 ring-1 ring-inset ring-forest-200">{d.court}</span>
              ))}
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">Le reste de vos accès est dans <span className="font-semibold text-ink">Plus</span> <ArrowRight className="h-3 w-3" /></p>
          </section>
        )}

        {lignes.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Ce que vous pouvez faire</h3>
            <ul className="space-y-1.5">
              {lignes.map((l) => (
                <li key={l} className="flex items-start gap-2.5 rounded-xl bg-white px-3 py-2 text-sm text-ink ring-1 ring-sand-200">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                  {l}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-5 text-center text-[11px] text-muted">Un bouton absent ou grisé = l’action ne relève pas de votre rôle. Rien n’est perdu : un autre rôle s’en charge dans le circuit.</p>
      </div>
    </div>
  );
}
