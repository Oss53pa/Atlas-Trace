import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, ScanLine, Power, Pencil, Loader2, DoorOpen } from 'lucide-react';
import { useAuthz } from '../../lib/authz';
import { chargerPostes, creerPoste, modifierPoste, definirPorteActive, type PosteItem } from './api';

/**
 * Sélecteur de porte d'accès : l'agent déclare la porte qu'il tient (mémorisée
 * sur l'appareil). Les administrateurs y gèrent aussi les portes du site
 * (création, renommage, activation) — chaque geste est tracé côté serveur.
 */
export function PorteSelecteur({
  posteActifId,
  onChoisir,
  onClose,
}: {
  posteActifId: string;
  onChoisir: (id: string) => void;
  onClose: () => void;
}) {
  const { a } = useAuthz();
  const admin = a('ADMINISTRER_ORGANISATION');
  const [postes, setPostes] = useState<PosteItem[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [nouveau, setNouveau] = useState('');
  const [edition, setEdition] = useState<{ id: string; libelle: string } | null>(null);

  async function recharger() {
    try {
      setPostes(await chargerPostes(admin)); // admin : inclut les portes inactives
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => {
    recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ajouter() {
    const lib = nouveau.trim();
    if (!lib || occupe) return;
    setOccupe(true);
    try {
      const cree = await creerPoste(lib);
      setNouveau('');
      await recharger();
      onChoisir(cree.id); // on bascule directement sur la nouvelle porte
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  async function renommer() {
    if (!edition || occupe) return;
    const lib = edition.libelle.trim();
    if (!lib) return;
    setOccupe(true);
    try {
      await modifierPoste(edition.id, { libelle: lib });
      setEdition(null);
      await recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  async function basculer(p: PosteItem) {
    if (occupe) return;
    setOccupe(true);
    try {
      await modifierPoste(p.id, { statut: p.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF' });
      await recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  function choisir(id: string) {
    definirPorteActive(id);
    onChoisir(id);
    onClose();
  }

  const actives = postes.filter((p) => p.statut === 'ACTIF');

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand-300 sm:hidden" />
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-ink"><DoorOpen className="h-5 w-5 text-forest-600" /> Porte d'accès</h2>
            <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
          </div>
          <p className="mb-3 text-xs text-muted">Déclarez la porte que vous tenez : chaque passage sera rattaché à cette porte.</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {erreur && <p className="rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}
          {chargement ? (
            <div className="flex justify-center py-8 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <>
              {/* Choix de la porte tenue (portes actives) */}
              <ul className="space-y-2">
                {actives.map((p) => {
                  const actif = p.id === posteActifId;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => choisir(p.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 transition-colors ${
                          actif ? 'bg-forest-50 ring-forest-300' : 'bg-sand-50 ring-sand-300/60 hover:bg-sand-100'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${actif ? 'bg-forest-500 text-white' : 'bg-white text-forest-600 ring-1 ring-sand-300/60'}`}>
                          <ScanLine className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{p.libelle}</span>
                          {p.zoneControlee && <span className="block truncate text-xs text-muted">Zone : {p.zoneControlee}</span>}
                        </span>
                        {actif && <Check className="h-5 w-5 shrink-0 text-forest-600" />}
                      </button>
                    </li>
                  );
                })}
                {actives.length === 0 && <li className="rounded-xl bg-sand-50 px-3 py-3 text-center text-xs text-muted">Aucune porte active.</li>}
              </ul>

              {/* Gestion (administrateurs) */}
              {admin && (
                <div className="rounded-2xl bg-sand-50 p-3 ring-1 ring-sand-300/50">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Gérer les portes du site</p>

                  <div className="mb-2 flex gap-2">
                    <input
                      value={nouveau}
                      onChange={(e) => setNouveau(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') ajouter(); }}
                      placeholder="Nouvelle porte (ex. Entrée Nord)"
                      className="min-w-0 flex-1 rounded-lg border border-sand-300 bg-white px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400"
                    />
                    <button onClick={ajouter} disabled={occupe || !nouveau.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-forest-500 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-50">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <ul className="space-y-1.5">
                    {postes.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-sand-300/60">
                        {edition?.id === p.id ? (
                          <>
                            <input
                              value={edition.libelle}
                              onChange={(e) => setEdition({ id: p.id, libelle: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') renommer(); }}
                              autoFocus
                              className="min-w-0 flex-1 rounded border border-sand-300 bg-sand-50 px-2 py-1 text-sm text-ink outline-none focus:border-forest-400"
                            />
                            <button onClick={renommer} disabled={occupe} className="rounded p-1 text-forest-600 hover:bg-forest-50" aria-label="Valider"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEdition(null)} className="rounded p-1 text-muted hover:bg-sand-100" aria-label="Annuler"><X className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm font-medium ${p.statut === 'ACTIF' ? 'text-ink' : 'text-muted line-through'}`}>{p.libelle}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.statut === 'ACTIF' ? 'bg-forest-50 text-forest-700' : 'bg-sand-200 text-muted'}`}>{p.statut === 'ACTIF' ? 'Active' : 'Inactive'}</span>
                            <button onClick={() => setEdition({ id: p.id, libelle: p.libelle })} className="shrink-0 rounded p-1 text-muted hover:bg-sand-100 hover:text-ink" aria-label="Renommer"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => basculer(p)} disabled={occupe} className={`shrink-0 rounded p-1 hover:bg-sand-100 ${p.statut === 'ACTIF' ? 'text-muted hover:text-danger-500' : 'text-forest-600'}`} aria-label={p.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}><Power className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted">Créations et modifications tracées à votre nom.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
