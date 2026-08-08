import { useEffect, useMemo, useState } from 'react';
import { Truck, Plus, X, Loader2, LogIn, Search, ShieldCheck, ShieldOff, Check, Upload } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthz } from '../../lib/authz';
import {
  chargerVehiculesAutorises, chargerEntreprisesSimple, declarerVehiculeAutorise, suspendreVehiculeAutorise,
  importerVehiculesAutorises, analyserCsvFlotte,
  type VehiculeAutorise, type EntrepriseSimple, type EtatVehicule,
} from './api';

const TYPES = ['Poids lourd', 'Utilitaire', 'Voiture', 'Engin', 'Bus'];

const ETAT_CFG: Record<EtatVehicule, { tone: 'forest' | 'amber' | 'neutral'; label: string }> = {
  VALIDE: { tone: 'forest', label: 'Autorisé' },
  SUSPENDU: { tone: 'amber', label: 'Suspendu' },
  EXPIRE: { tone: 'neutral', label: 'Expiré' },
};

export function VehiculesAutorises() {
  const { connecte, a } = useAuthz();
  const peutGerer = a('DELIVRER_BADGE');
  const [liste, setListe] = useState<VehiculeAutorise[]>([]);
  const [entreprises, setEntreprises] = useState<EntrepriseSimple[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [sheet, setSheet] = useState(false);
  const [sheetImport, setSheetImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }

  async function recharger() {
    setChargement(true);
    try {
      const [v, e] = await Promise.all([chargerVehiculesAutorises(), chargerEntreprisesSimple()]);
      setListe(v);
      setEntreprises(e);
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    if (!connecte) { setChargement(false); return; }
    recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  const filtree = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return liste;
    return liste.filter((v) =>
      v.immatriculation.toLowerCase().includes(q) || (v.entreprise ?? '').toLowerCase().includes(q));
  }, [liste, recherche]);

  async function basculer(v: VehiculeAutorise) {
    try {
      await suspendreVehiculeAutorise(v.id, v.statut !== 'SUSPENDU');
      flash(v.statut === 'SUSPENDU' ? 'Autorisation réactivée' : 'Autorisation suspendue');
      recharger();
    } catch (e) {
      flash((e as Error).message);
    }
  }

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60"><LogIn className="h-7 w-7" /></span>
        <p className="text-base font-bold text-ink">Connexion requise</p>
        <p className="text-sm">La gestion des véhicules autorisés est réservée à la délivrance des titres d’accès.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Truck className="h-3.5 w-3.5" /> Contrôle d’accès</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Véhicules autorisés</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Véhicules pré-déclarés, reconnus au poste par leur immatriculation. La reconnaissance accélère le contrôle —
            elle n’ouvre jamais l’accès : chaque passage reste contrôlé.
          </p>
        </div>
        {peutGerer && (
          <div className="flex gap-2">
            <Button variant="outline" size="md" icon={<Upload className="h-4 w-4" />} onClick={() => setSheetImport(true)}>
              Importer (CSV)
            </Button>
            <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
              Déclarer un véhicule
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-card ring-1 ring-sand-300/70">
        <Search className="h-4 w-4 text-muted" />
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (immatriculation, entreprise)…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
        <span className="shrink-0 text-xs text-muted">{filtree.length} véhicule(s)</span>
      </div>

      {erreur && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

      {chargement ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtree.length === 0 ? (
        <div className="rounded-2xl bg-sand-50 px-4 py-12 text-center text-sm text-muted ring-1 ring-sand-200">
          {liste.length === 0 ? 'Aucun véhicule autorisé déclaré pour l’instant.' : 'Aucun résultat pour cette recherche.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-semibold">Immatriculation</th>
                  <th className="px-4 py-2.5 font-semibold">Entreprise</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Chauffeur</th>
                  <th className="px-4 py-2.5 font-semibold">Validité</th>
                  <th className="px-4 py-2.5 font-semibold">Statut</th>
                  {peutGerer && <th className="px-4 py-2.5 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtree.map((v) => {
                  const c = ETAT_CFG[v.etat];
                  return (
                    <tr key={v.id} className="border-b border-sand-200 last:border-0 hover:bg-sand-50">
                      <td className="px-4 py-3 font-mono font-bold tracking-wide text-ink">{v.immatriculation}</td>
                      <td className="px-4 py-3 text-ink">{v.entreprise ?? <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-muted">{v.type ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{v.chauffeur ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{v.validiteFin ? `jusqu’au ${v.validiteFin}` : 'sans limite'}</td>
                      <td className="px-4 py-3"><Badge tone={c.tone} dot>{c.label}</Badge></td>
                      {peutGerer && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={v.statut === 'SUSPENDU' ? 'outline' : 'ghost'} size="sm"
                            icon={v.statut === 'SUSPENDU' ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                            onClick={() => basculer(v)}
                          >
                            {v.statut === 'SUSPENDU' ? 'Réactiver' : 'Suspendre'}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Un véhicule <b>suspendu</b> ou <b>expiré</b> reste signalé au poste, mais le contrôle du passage n’est jamais
        automatique — l’agent décide (forçage = photo + pouvoir requis).
      </p>

      {sheet && (
        <DeclarerSheet
          entreprises={entreprises}
          onClose={() => setSheet(false)}
          onFait={(imm) => { setSheet(false); flash(`Véhicule ${imm} autorisé`); recharger(); }}
        />
      )}

      {sheetImport && (
        <ImportSheet
          entreprises={entreprises}
          onClose={() => setSheetImport(false)}
          onFait={(n, ign) => { setSheetImport(false); flash(`${n} véhicule(s) importé(s)${ign ? ` · ${ign} ignoré(s)` : ''}`); recharger(); }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function DeclarerSheet({ entreprises, onClose, onFait }: { entreprises: EntrepriseSimple[]; onClose: () => void; onFait: (imm: string) => void }) {
  const [immatriculation, setImmatriculation] = useState('');
  const [entrepriseId, setEntrepriseId] = useState('');
  const [type, setType] = useState('');
  const [chauffeur, setChauffeur] = useState('');
  const [validiteFin, setValiditeFin] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pret = immatriculation.trim().replace(/[^A-Za-z0-9]/g, '').length >= 3 && !envoi;

  async function valider() {
    setEnvoi(true);
    setErr(null);
    try {
      const r = await declarerVehiculeAutorise({
        immatriculation,
        entrepriseId: entrepriseId || null,
        type: type || null,
        chauffeur: chauffeur.trim() || null,
        validiteFin: validiteFin || null,
      });
      onFait(r.immatriculation);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const champ = 'w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Déclarer un véhicule autorisé</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Immatriculation</span>
          <input value={immatriculation} onChange={(e) => setImmatriculation(e.target.value.toUpperCase())} placeholder="Ex. : 1234 AB 01" autoFocus
            className={`${champ} font-mono tracking-wide`} />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
          <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className={champ}>
            <option value="">— Aucune / à préciser —</option>
            {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={champ}>
              <option value="">—</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Valide jusqu’au</span>
            <input type="date" value={validiteFin} onChange={(e) => setValiditeFin(e.target.value)} className={champ} />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Chauffeur habituel (optionnel)</span>
          <input value={chauffeur} onChange={(e) => setChauffeur(e.target.value)} placeholder="Nom du chauffeur" className={champ} />
        </label>

        {err && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onClose}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} onClick={valider}>
            Autoriser ce véhicule
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImportSheet({ entreprises, onClose, onFait }: { entreprises: EntrepriseSimple[]; onClose: () => void; onFait: (importes: number, ignores: number) => void }) {
  const [entrepriseId, setEntrepriseId] = useState('');
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lignes = useMemo(() => analyserCsvFlotte(texte), [texte]);

  function fichier(f: File | undefined) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setTexte(String(r.result ?? ''));
    r.readAsText(f);
  }

  async function importer() {
    setEnvoi(true);
    setErr(null);
    try {
      const r = await importerVehiculesAutorises(entrepriseId || null, lignes);
      onFait(r.importes, r.ignores);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const champ = 'w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Importer une flotte</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Une immatriculation par ligne. Colonnes optionnelles séparées par « ; » ou « , » :
          <span className="font-mono"> immatriculation ; type ; chauffeur</span>. Les doublons actifs sont ignorés.
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Entreprise (appliquée à toutes les lignes)</span>
          <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className={champ}>
            <option value="">— Aucune / à préciser —</option>
            {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Coller le CSV</span>
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={6} placeholder={'1234 AB 01 ; Poids lourd ; M. Koffi\n5678 CD 02 ; Utilitaire'}
            className={`${champ} resize-none font-mono text-[13px]`} />
        </label>

        <div className="mt-2 flex items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-forest-600 hover:underline">
            <Upload className="h-3.5 w-3.5" /> Charger un fichier .csv
            <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => fichier(e.target.files?.[0])} />
          </label>
          <span className="text-xs text-muted">{lignes.length} ligne(s) valide(s)</span>
        </div>

        {err && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onClose}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={lignes.length === 0 || envoi} icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} onClick={importer}>
            Importer {lignes.length > 0 ? `${lignes.length} véhicule(s)` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
