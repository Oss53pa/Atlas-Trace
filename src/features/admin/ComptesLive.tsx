import { useEffect, useState } from 'react';
import { Users, X, Check, Loader2, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz, Gate } from '../../lib/authz';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface Membre { role_id: string; site_id: string | null; at_roles: { libelle: string } | null }
interface Utilisateur { id: string; nom: string; contact: string | null; statut: string; at_membres: Membre[] }
interface Role { id: string; libelle: string }
interface Site { id: string; libelle: string }

export function ComptesLive() {
  const { connecte, chargement } = useAuthz();
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3600); }

  async function charger() {
    setErreur(null);
    const [u, r, s] = await Promise.all([
      supabase.from('at_utilisateurs').select('id, nom, contact, statut, at_membres(role_id, site_id, at_roles(libelle))').order('nom'),
      supabase.from('at_roles').select('id, libelle').order('libelle'),
      supabase.from('at_sites').select('id, libelle').order('libelle'),
    ]);
    if (u.error) setErreur(u.error.message);
    else setUsers((u.data as unknown as Utilisateur[]) ?? []);
    setRoles((r.data as unknown as Role[]) ?? []);
    setSites((s.data as unknown as Site[]) ?? []);
    setPret(true);
  }

  useEffect(() => {
    if (connecte) charger(); else setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  // L'administrateur choisit le rôle ; la personne choisira son mot de passe
  // depuis le QR reçu par courriel. Aucun identifiant n'est fabriqué ici.
  async function inviter(nom: string, email: string, roleId: string, siteId: string | null) {
    const { data, error } = await supabase.rpc('at_creer_invitation', {
      p_nom: nom, p_contact: email, p_role_id: roleId, p_site_id: siteId, p_validite_heures: 72,
    });
    if (error) { flash('Refusé : ' + error.message); return; }
    setSheet(false);
    const echeance = new Date((data as { expire_at: string }).expire_at)
      .toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    flash(`Invitation envoyée à ${email} · valable jusqu'au ${echeance}`);
    charger();
  }

  if (chargement || !pret) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>;
  if (!connecte) return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><LogIn className="h-6 w-6" /></span>
      <h2 className="text-lg font-extrabold text-ink">Connexion requise</h2>
      <p className="mt-1 text-sm text-muted">Connectez-vous via le bouton en haut de l'écran.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Users className="h-3.5 w-3.5" /> Comptes & rôles</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Comptes internes</h1>
            <p className="mt-1 text-sm text-muted">Créez un compte et attribuez-lui un rôle : il ne verra que ce que ce rôle autorise. Création réelle côté serveur (edge function), refusée sans le pouvoir.</p>
          </div>
          <Gate pouvoir="ADMINISTRER_ORGANISATION">
            <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setSheet(true)}>Nouvel utilisateur</Button>
          </Gate>
        </div>

        {erreur && <p className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        <ul className="space-y-2">
          {users.map((u) => {
            const m = u.at_membres[0];
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-sm font-bold text-forest-700">{(u.nom || '?').slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{u.nom}</p>
                  <p className="truncate text-xs text-muted">{u.contact}</p>
                </div>
                {m?.at_roles?.libelle ? <Badge tone="forest">{m.at_roles.libelle}</Badge> : <Badge tone="neutral">Sans rôle</Badge>}
                <Badge tone={u.statut === 'ACTIF' ? 'forest' : 'neutral'} dot>{u.statut}</Badge>
              </li>
            );
          })}
          {users.length === 0 && <li className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-sand-300/60"><Users className="mx-auto h-8 w-8 text-sand-400" /><p className="mt-2 text-sm font-semibold text-ink">Aucun compte</p></li>}
        </ul>
      </div>

      {sheet && <CompteSheet roles={roles} sites={sites} onAnnuler={() => setSheet(false)} onInviter={inviter} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function CompteSheet({ roles, sites, onAnnuler, onInviter }: {
  roles: Role[]; sites: Site[];
  onAnnuler: () => void; onInviter: (nom: string, email: string, roleId: string, siteId: string | null) => Promise<void>;
}) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [envoi, setEnvoi] = useState(false);
  const pret = nom.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !!roleId;

  async function go() {
    setEnvoi(true);
    await onInviter(nom.trim(), email.trim(), roleId, siteId || null);
    setEnvoi(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
          <h3 className="text-lg font-extrabold text-ink">Inviter un utilisateur</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Nom</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : M. Diby" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@newheaven.ci" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" /></label>
          <p className="rounded-xl bg-forest-50 px-3 py-2.5 text-[11px] leading-relaxed text-forest-800 ring-1 ring-forest-100">
            <b>Aucun mot de passe à saisir ici.</b> La personne reçoit un courriel avec un QR code
            personnel, valable 72 h et utilisable une seule fois. Elle installe l'application, scanne,
            et choisit elle-même son mot de passe — avec les droits du rôle que vous sélectionnez.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Rôle</span>
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {roles.map((r) => <option key={r.id} value={r.id}>{r.libelle}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Site</span>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {sites.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select></label>
          </div>
        </div>
        <div className="border-t border-sand-200 px-5 py-4">
          <Button variant="primary" size="lg" block disabled={!pret || envoi} onClick={go}>
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Envoyer l'invitation
          </Button>
        </div>
      </div>
    </div>
  );
}
