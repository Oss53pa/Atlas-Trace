import { useEffect, useState } from 'react';
import { UserPlus, X, Check, Loader2, LogIn, CreditCard, Users, Ban, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz } from '../../lib/authz';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface Entreprise { id: string; raison_sociale: string }
interface BadgeRow { numero: string; statut: string }
interface Personne {
  id: string; nom: string; prenom: string; fonction: string | null; statut: string;
  induction_statut: string | null; entreprise_id: string | null;
  at_entreprises: { raison_sociale: string } | null;
  at_badges: BadgeRow[];
}

const anneeFin = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

export function PersonnesLive() {
  const { connecte, chargement, portees, a } = useAuthz();
  const orgId = portees[0]?.organisationId ?? null;
  const siteId0 = portees.find((p) => p.siteId)?.siteId ?? null;
  const [gens, setGens] = useState<Personne[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [badgePour, setBadgePour] = useState<Personne | null>(null);
  const [suspendreCible, setSuspendreCible] = useState<Personne | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3200); }

  async function charger() {
    setErreur(null);
    const [p, e, po] = await Promise.all([
      supabase.from('at_personnes').select('id, nom, prenom, fonction, statut, induction_statut, entreprise_id, at_entreprises(raison_sociale), at_badges(numero, statut)').order('nom'),
      supabase.from('at_entreprises').select('id, raison_sociale').order('raison_sociale'),
      supabase.from('at_postes').select('zone_controlee'),
    ]);
    if (p.error) setErreur(p.error.message);
    else setGens((p.data as unknown as Personne[]) ?? []);
    setEntreprises((e.data as unknown as Entreprise[]) ?? []);
    const zs = Array.from(new Set(((po.data as { zone_controlee: string | null }[]) ?? []).map((r) => r.zone_controlee).filter(Boolean) as string[]));
    setZones(zs.length ? zs : ['circulation']);
    setPret(true);
  }

  useEffect(() => {
    if (connecte) charger(); else setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  async function declarer(nom: string, prenom: string, fonction: string, entrepriseId: string) {
    if (!orgId) return;
    const { error } = await supabase.from('at_personnes').insert({
      organisation_id: orgId, site_id: siteId0, entreprise_id: entrepriseId,
      nom, prenom, fonction, regime: 'ENTREPRISE', induction_statut: 'A_FAIRE', statut: 'ACTIF',
    });
    if (error) { flash('Refusé : ' + error.message); return; }
    setSheet(false); flash(`${prenom} ${nom} déclaré(e)`); charger();
  }

  async function delivrerBadge(p: Personne, zonesChoisies: string[]) {
    if (!orgId) return;
    const numero = 'BN-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const { error } = await supabase.from('at_badges').insert({
      organisation_id: orgId, site_id: siteId0, numero, type: 'NOMINATIF',
      personne_id: p.id, entreprise_id: p.entreprise_id,
      zones_autorisees: zonesChoisies, validite_debut: new Date().toISOString().slice(0, 10),
      validite_fin: anneeFin(), statut: 'ACTIF',
    });
    if (error) { flash('Refusé : ' + error.message); return; }
    setBadgePour(null); flash(`Badge ${numero} délivré (${zonesChoisies.join(', ')})`); charger();
  }

  // I4 : suspendre une personne suspend ses badges (le poste refuse alors
  // BADGE_SUSPENDU). Réactiver relève les badges non expirés. Vérifié serveur.
  async function suspendre(p: Personne, motif: string) {
    const { error } = await supabase.rpc('at_suspendre_personne', { p_id: p.id, p_suspendre: true, p_motif: motif });
    setSuspendreCible(null);
    if (error) { flash('Refusé : ' + error.message); return; }
    flash(`${p.prenom} ${p.nom} suspendu(e) · badge bloqué au poste`); charger();
  }
  async function reactiver(p: Personne) {
    const { error } = await supabase.rpc('at_suspendre_personne', { p_id: p.id, p_suspendre: false });
    if (error) { flash('Refusé : ' + error.message); return; }
    flash(`${p.prenom} ${p.nom} réactivé(e)`); charger();
  }

  if (chargement || !pret) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>;
  if (!connecte) return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><LogIn className="h-6 w-6" /></span>
      <h2 className="text-lg font-extrabold text-ink">Connexion requise</h2>
      <p className="mt-1 text-sm text-muted">Connectez-vous via le bouton en haut de l'écran.</p>
    </div>
  );

  const peutDeclarer = a('DECLARER_PERSONNEL');
  const peutBadger = a('DELIVRER_BADGE');
  const peutSuspendre = a('SUSPENDRE_ACCES');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Users className="h-3.5 w-3.5" /> Personnes & badges</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Personnes</h1>
            <p className="mt-1 text-sm text-muted">Déclarez une personne rattachée à une entreprise, puis délivrez son badge. Ces données alimentent directement le contrôle au poste (serveur).</p>
          </div>
          {peutDeclarer && <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setSheet(true)}>Déclarer une personne</Button>}
        </div>

        {erreur && <p className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        <ul className="space-y-2">
          {gens.map((p) => {
            const badge = p.at_badges.find((b) => b.statut === 'ACTIF') ?? p.at_badges[0];
            const suspendu = p.statut === 'SUSPENDU';
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/60">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${suspendu ? 'bg-danger-50 text-danger-600' : 'bg-forest-50 text-forest-700'}`}>{(p.prenom || p.nom || '?').slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.prenom} {p.nom}</p>
                  <p className="truncate text-xs text-muted">{p.fonction ?? '—'} · {p.at_entreprises?.raison_sociale ?? 'sans entreprise'}</p>
                </div>
                {suspendu && <Badge tone="danger" dot>Suspendu</Badge>}
                {badge ? <Badge tone={suspendu ? 'neutral' : 'forest'}><CreditCard className="h-3 w-3" /> {badge.numero}</Badge>
                  : peutBadger ? <Button size="sm" variant="outline" icon={<CreditCard className="h-4 w-4" />} onClick={() => setBadgePour(p)}>Délivrer un badge</Button>
                    : <Badge tone="neutral">Sans badge</Badge>}
                {peutSuspendre && (suspendu
                  ? <Button size="sm" variant="outline" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => reactiver(p)}>Réactiver</Button>
                  : <Button size="sm" variant="ghost" icon={<Ban className="h-4 w-4" />} onClick={() => setSuspendreCible(p)}>Suspendre</Button>)}
              </li>
            );
          })}
          {gens.length === 0 && <li className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-sand-300/60"><Users className="mx-auto h-8 w-8 text-sand-400" /><p className="mt-2 text-sm font-semibold text-ink">Aucune personne déclarée</p></li>}
        </ul>
      </div>

      {sheet && <PersonneSheet entreprises={entreprises} onAnnuler={() => setSheet(false)} onDeclarer={declarer} />}
      {badgePour && <BadgeSheet personne={badgePour} zones={zones} onAnnuler={() => setBadgePour(null)} onDelivrer={(zs) => delivrerBadge(badgePour, zs)} />}
      {suspendreCible && <SuspendreSheet personne={suspendreCible} onAnnuler={() => setSuspendreCible(null)} onConfirmer={(m) => suspendre(suspendreCible, m)} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function SuspendreSheet({ personne, onAnnuler, onConfirmer }: { personne: Personne; onAnnuler: () => void; onConfirmer: (motif: string) => void }) {
  const [motif, setMotif] = useState('');
  const pret = motif.trim().length >= 3;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Suspendre · {personne.prenom} {personne.nom}</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-xs text-muted">Refus immédiat au poste : les badges actifs de la personne passent en « suspendu » (invariant I4). Motif tracé au journal d'audit.</p>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Motif (obligatoire)</span>
          <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="Ex. : habilitation retirée, incident de sécurité"
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="danger" size="lg" block disabled={!pret} onClick={() => onConfirmer(motif.trim())}>Suspendre l'accès</Button>
        </div>
      </div>
    </div>
  );
}

function PersonneSheet({ entreprises, onAnnuler, onDeclarer }: { entreprises: Entreprise[]; onAnnuler: () => void; onDeclarer: (nom: string, prenom: string, fonction: string, entrepriseId: string) => Promise<void> }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [fonction, setFonction] = useState('');
  const [entrepriseId, setEntrepriseId] = useState(entreprises[0]?.id ?? '');
  const [envoi, setEnvoi] = useState(false);
  const pret = nom.trim().length > 1 && prenom.trim().length > 1 && entrepriseId;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Déclarer une personne</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Elle sera rattachée à son entreprise et pourra recevoir un badge.</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Prénom</span>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Nom</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" /></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Fonction</span>
            <input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Ex. : électricien" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
            <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {entreprises.length === 0 && <option value="">— créez d'abord une entreprise —</option>}
              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raison_sociale}</option>)}
            </select></label>
        </div>
        <Button variant="primary" size="lg" block className="mt-4" disabled={!pret || envoi}
          onClick={async () => { setEnvoi(true); await onDeclarer(nom.trim(), prenom.trim(), fonction.trim(), entrepriseId); setEnvoi(false); }}>
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Déclarer
        </Button>
      </div>
    </div>
  );
}

function BadgeSheet({ personne, zones, onAnnuler, onDelivrer }: { personne: Personne; zones: string[]; onAnnuler: () => void; onDelivrer: (zones: string[]) => Promise<void> }) {
  const [sel, setSel] = useState<Set<string>>(new Set(zones));
  const [envoi, setEnvoi] = useState(false);
  const bascule = (z: string) => setSel((s) => { const n = new Set(s); if (n.has(z)) n.delete(z); else n.add(z); return n; });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Délivrer un badge</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">{personne.prenom} {personne.nom} · badge nominatif, valable 1 an. Le porteur ne sera autorisé au poste que sur ses zones.</p>
        <p className="mb-2 text-xs font-semibold text-muted">Zones autorisées</p>
        <div className="flex flex-wrap gap-2">
          {zones.map((z) => (
            <button key={z} onClick={() => bascule(z)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${sel.has(z) ? 'bg-forest-50 text-forest-700 ring-forest-200' : 'bg-sand-50 text-muted ring-sand-300'}`}>
              {sel.has(z) && <Check className="h-3 w-3" strokeWidth={3} />}{z}
            </button>
          ))}
        </div>
        {sel.size === 0 && <p className="mt-2 text-[11px] font-semibold text-danger-600">Sélectionnez au moins une zone.</p>}
        <Button variant="primary" size="lg" block className="mt-4" disabled={sel.size === 0 || envoi}
          onClick={async () => { setEnvoi(true); await onDelivrer([...sel]); setEnvoi(false); }}>
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Délivrer le badge
        </Button>
      </div>
    </div>
  );
}
