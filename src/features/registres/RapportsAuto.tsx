import { useCallback, useEffect, useState } from 'react';
import { FileText, Download, Mail, MailX, Loader2, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz } from '../../lib/authz';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface RapportLigne {
  id: string;
  type: 'JOURNALIER' | 'INCIDENT';
  periode: string | null;
  resume: { numero?: string; titre?: string; gravite?: string } | null;
  chemin: string;
  tailleOctets: number | null;
  destinataires: string[];
  envoyeAt: string | null;
  erreurEnvoi: string | null;
  genereAt: string;
  generePar: string | null;
}

const ko = (o: number | null) => (o ? `${Math.round(o / 1024)} Ko` : '—');
const jour = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

/** Un rapport journalier porte une date ; un rapport d'incident porte sa référence. */
function intitule(r: RapportLigne): string {
  if (r.type === 'INCIDENT') return `Incident ${r.resume?.numero ?? ''} — ${r.resume?.titre ?? 'rapport'}`.trim();
  return `Rapport du ${r.periode ? jour(r.periode) : '—'}`;
}

/**
 * Rapports PDF quotidiens : générés par le serveur chaque soir, déposés dans
 * Supabase Storage et transmis par e-mail à la chaîne de commandement. Ici on
 * les consulte et on peut en redemander un.
 */
export function RapportsAuto() {
  const { connecte, a } = useAuthz();
  const peutGenerer = a('EXPORTER') || a('CONSULTER_TABLEAU');

  const [rapports, setRapports] = useState<RapportLigne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    const { data, error } = await supabase
      .from('at_rapports')
      .select('id, type, periode, resume, chemin, taille_octets, destinataires, envoye_at, erreur_envoi, genere_at, genere_par')
      .order('genere_at', { ascending: false })
      .limit(30);
    if (error) setErreur(error.message);
    else {
      setRapports(
        (data ?? []).map((r) => ({
          id: r.id, type: r.type, periode: r.periode,
          resume: r.resume as RapportLigne['resume'],
          chemin: r.chemin,
          tailleOctets: r.taille_octets, destinataires: r.destinataires ?? [],
          envoyeAt: r.envoye_at, erreurEnvoi: r.erreur_envoi,
          genereAt: r.genere_at, generePar: r.genere_par,
        })),
      );
      setErreur(null);
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    if (!connecte) {
      setChargement(false);
      return;
    }
    recharger();
  }, [connecte, recharger]);

  async function telecharger(chemin: string) {
    const { data, error } = await supabase.storage.from('at-rapports').createSignedUrl(chemin, 120);
    if (error || !data) {
      setErreur(error?.message ?? 'Lien indisponible');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function generer() {
    setOccupe(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc('at_generer_rapport', { p_date: null });
      if (error) throw new Error(error.message);
      setMessage('Génération demandée — le rapport apparaît dans quelques secondes.');
      setTimeout(recharger, 4000);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  if (!connecte) return null;

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-extrabold text-ink">
            <FileText className="h-4 w-4 text-forest-600" /> Rapports automatiques
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Rapport de poste chaque soir à 21:00, et rapport d'incident émis dès la consignation d'un majeur.
            Transmis par e-mail au HSE Officer et au Directeur de la Construction.
          </p>
        </div>
        {peutGenerer && (
          <Button
            variant="outline"
            size="sm"
            icon={occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            disabled={occupe}
            onClick={generer}
          >
            Générer celui du jour
          </Button>
        )}
      </div>

      {message && (
        <p className="mb-3 rounded-xl bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700 ring-1 ring-forest-100">
          {message}
        </p>
      )}
      {erreur && (
        <p className="mb-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
          {erreur}
        </p>
      )}

      {chargement ? (
        <div className="flex justify-center py-6 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rapports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-muted">
          Aucun rapport encore généré. Le rapport de poste partira ce soir à 21:00.
        </p>
      ) : (
        <ul className="space-y-2">
          {rapports.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-sand-50 px-3 py-2.5 ring-1 ring-sand-200"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${
                  r.type === 'INCIDENT'
                    ? 'bg-danger-50 text-danger-600 ring-danger-100'
                    : 'bg-white text-forest-600 ring-sand-200'
                }`}
              >
                {r.type === 'INCIDENT' ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{intitule(r)}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(r.genereAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span>· {ko(r.tailleOctets)}</span>
                  {r.generePar && r.generePar !== 'automatique' && <span>· demandé par {r.generePar}</span>}
                </p>
              </div>
              {r.envoyeAt ? (
                <Badge tone="forest">
                  <Mail className="mr-1 inline h-3 w-3" /> Transmis à {r.destinataires.length}
                </Badge>
              ) : (
                <Badge tone="amber" dot>
                  <MailX className="mr-1 inline h-3 w-3" /> Non transmis
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<Download className="h-4 w-4" />}
                onClick={() => telecharger(r.chemin)}
              >
                PDF
              </Button>
            </li>
          ))}
        </ul>
      )}

      {rapports.some((r) => !r.envoyeAt && r.erreurEnvoi) && (
        <p className="mt-3 text-[11px] text-amber-700">
          {rapports.find((r) => r.erreurEnvoi)?.erreurEnvoi}
        </p>
      )}
    </section>
  );
}
