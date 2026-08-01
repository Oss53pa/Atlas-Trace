import { useEffect, useState } from 'react';
import { Link2, UserPlus, X, Check, Loader2, LogIn, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz } from '../../lib/authz';
import { QRCode } from '../../components/device/QRCode';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface Entreprise { id: string; raison_sociale: string }
interface Site { id: string; libelle: string }
interface Lien {
  id: string; referent_nom: string; entreprise: string; jeton: string; statut: string;
  fonction_acces: string | null; entite_id: string | null; created_at: string;
}

const FONCTIONS = [
  { code: 'REFERENT', label: 'Référent (quotidien)' },
  { code: 'REPRESENTANT', label: 'Représentant (signataire)' },
  { code: 'ADJOINT', label: 'Adjoint (suppléant)' },
];

const lienUrl = (jeton: string) => `${window.location.origin}/?r=${jeton}`;

export function InvitationsLive() {
  const { connecte, chargement, portees, a } = useAuthz();
  const orgId = portees[0]?.organisationId ?? null;
  const siteId0 = portees.find((p) => p.siteId)?.siteId ?? null;
  const [liens, setLiens] = useState<Lien[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [qr, setQr] = useState<Lien | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3200); }

  async function charger() {
    setErreur(null);
    const [l, e, s] = await Promise.all([
      supabase.from('at_liens_referents').select('id, referent_nom, entreprise, jeton, statut, fonction_acces, entite_id, created_at').order('created_at', { ascending: false }),
      supabase.from('at_entites').select('id, raison_sociale').eq('type', 'ENTREPRISE').order('raison_sociale'),
      supabase.from('at_sites').select('id, libelle').order('libelle'),
    ]);
    if (l.error) setErreur(l.error.message);
    else setLiens((l.data as unknown as Lien[]) ?? []);
    setEntreprises((e.data as unknown as Entreprise[]) ?? []);
    setSites((s.data as unknown as Site[]) ?? []);
    setPret(true);
  }

  useEffect(() => {
    if (connecte) charger(); else setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  async function inviter(entrepriseId: string, referent: string, fonction: string, siteId: string | null) {
    if (!orgId) return;
    const ent = entreprises.find((e) => e.id === entrepriseId);
    const jeton = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
    const { data, error } = await supabase.from('at_liens_referents').insert({
      organisation_id: orgId, site_id: siteId, entite_id: entrepriseId,
      referent_nom: referent, entreprise: ent?.raison_sociale ?? '', jeton, fonction_acces: fonction, statut: 'ACTIF',
    }).select('id, referent_nom, entreprise, jeton, statut, fonction_acces, entite_id, created_at').single();
    if (error) { flash('Refusé : ' + error.message); return; }
    setSheet(false);
    setQr(data as unknown as Lien);
    flash('Invitation créée · lien généré');
    charger();
  }

  async function revoquer(l: Lien) {
    const { error } = await supabase.from('at_liens_referents').update({ statut: 'REVOQUE', revoked_at: new Date().toISOString() }).eq('id', l.id);
    if (error) { flash('Refusé : ' + error.message); return; }
    flash('Lien révoqué — il est immédiatement inopérant'); charger();
  }

  if (chargement || !pret) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>;
  if (!connecte) return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><LogIn className="h-6 w-6" /></span>
      <h2 className="text-lg font-extrabold text-ink">Connexion requise</h2>
      <p className="mt-1 text-sm text-muted">Connectez-vous via le bouton en haut de l'écran.</p>
    </div>
  );

  const peutInviter = a('DECLARER_ENTREPRISE') || a('ADMINISTRER_ORGANISATION');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Link2 className="h-3.5 w-3.5" /> Invitations référents</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Inviter un référent</h1>
            <p className="mt-1 text-sm text-muted">La MOA invite le référent d'une entreprise — sans compte : le lien (ou son QR) est le justificatif. Révocable immédiatement côté serveur.</p>
          </div>
          {peutInviter && <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setSheet(true)}>Inviter un référent</Button>}
        </div>

        {erreur && <p className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        <ul className="space-y-2">
          {liens.map((l) => {
            const actif = l.statut === 'ACTIF';
            return (
              <li key={l.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/60">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{l.entreprise} <span className="font-normal text-muted">· {l.referent_nom}</span></p>
                    <p className="mt-0.5 text-xs text-muted">{FONCTIONS.find((f) => f.code === l.fonction_acces)?.label ?? 'Référent'}</p>
                    {actif && <p className="mt-1 truncate font-mono text-[11px] text-forest-700">{lienUrl(l.jeton)}</p>}
                  </div>
                  <Badge tone={actif ? 'forest' : 'danger'} dot>{actif ? 'Actif' : 'Révoqué'}</Badge>
                </div>
                {actif && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-sand-200 pt-3">
                    <Button size="sm" variant="outline" icon={<Link2 className="h-4 w-4" />} onClick={() => setQr(l)}>QR & lien</Button>
                    <Button size="sm" variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => { navigator.clipboard?.writeText(lienUrl(l.jeton)); flash('Lien copié'); }}>Copier</Button>
                    {peutInviter && <Button size="sm" variant="accent" icon={<RefreshCw className="h-4 w-4" />} onClick={() => revoquer(l)}>Révoquer</Button>}
                  </div>
                )}
              </li>
            );
          })}
          {liens.length === 0 && <li className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-sand-300/60"><Link2 className="mx-auto h-8 w-8 text-sand-400" /><p className="mt-2 text-sm font-semibold text-ink">Aucune invitation</p><p className="text-xs text-muted">Invitez le premier référent d'une entreprise.</p></li>}
        </ul>
      </div>

      {sheet && <InvitationSheet entreprises={entreprises} sites={sites} siteDefaut={siteId0} onAnnuler={() => setSheet(false)} onInviter={inviter} />}
      {qr && <QRSheet lien={qr} onFermer={() => setQr(null)} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function InvitationSheet({ entreprises, sites, siteDefaut, onAnnuler, onInviter }: {
  entreprises: Entreprise[]; sites: Site[]; siteDefaut: string | null;
  onAnnuler: () => void; onInviter: (entrepriseId: string, referent: string, fonction: string, siteId: string | null) => Promise<void>;
}) {
  const [entrepriseId, setEntrepriseId] = useState(entreprises[0]?.id ?? '');
  const [referent, setReferent] = useState('');
  const [fonction, setFonction] = useState('REFERENT');
  const [siteId, setSiteId] = useState(siteDefaut ?? sites[0]?.id ?? '');
  const [envoi, setEnvoi] = useState(false);
  const pret = entrepriseId && referent.trim().length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Inviter un référent</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Un lien unique est généré. Le référent y accède sans compte ; vous pouvez le révoquer à tout moment.</p>
        <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
            <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {entreprises.length === 0 && <option value="">— créez d'abord une entreprise —</option>}
              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raison_sociale}</option>)}
            </select></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Nom du référent</span>
            <input value={referent} onChange={(e) => setReferent(e.target.value)} placeholder="Ex. : M. Traoré" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Fonction</span>
              <select value={fonction} onChange={(e) => setFonction(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {FONCTIONS.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Site</span>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {sites.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select></label>
          </div>
        </div>
        <Button variant="primary" size="lg" block className="mt-4" disabled={!pret || envoi}
          onClick={async () => { setEnvoi(true); await onInviter(entrepriseId, referent.trim(), fonction, siteId || null); setEnvoi(false); }}>
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Générer l'invitation
        </Button>
      </div>
    </div>
  );
}

function QRSheet({ lien, onFermer }: { lien: Lien; onFermer: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFermer}>
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Lien du référent</h3>
          <button onClick={onFermer} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-xs text-muted">{lien.entreprise} · {lien.referent_nom}</p>
        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-soft ring-1 ring-sand-300/70"><QRCode value={lienUrl(lien.jeton)} size={200} /></div>
        <p className="mt-3 break-all font-mono text-[11px] text-forest-700">{lienUrl(lien.jeton)}</p>
        <Button variant="outline" size="sm" className="mt-3" icon={<Copy className="h-4 w-4" />} onClick={() => navigator.clipboard?.writeText(lienUrl(lien.jeton))}>Copier le lien</Button>
      </div>
    </div>
  );
}
