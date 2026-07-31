import { useState } from 'react';
import { Link2, RefreshCw, Copy, ShieldAlert, Check, QrCode, X, KeyRound, Clock, ScanLine } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { QRCode } from '../../components/device/QRCode';
import { jetonActivation } from '../../lib/token';
import { LIENS_EXTERNES, type LienExterne } from '../../data/admin';

const EXP_ACTIVATION = '2026-08-03'; // 72 h après la date du jour (démo)

const url = (jeton: string) => `trace.at/r/${jeton}`;

/** Nouveau jeton déterministe dérivé de l'ancien (maquette). */
function regenerer(jeton: string): string {
  let h = 0;
  for (let i = 0; i < jeton.length; i++) h = (h * 33 + jeton.charCodeAt(i) + 7) & 0xffffffff;
  return Math.abs(h).toString(36).padStart(10, 'x').slice(0, 10);
}

export function LiensExternes() {
  const [liens, setLiens] = useState<LienExterne[]>(LIENS_EXTERNES);
  const [ancien, setAncien] = useState<Record<string, string>>({});
  const [qrPour, setQrPour] = useState<LienExterne | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }

  function revoquer(id: string) {
    setLiens((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        setAncien((a) => ({ ...a, [id]: l.jeton }));
        return { ...l, jeton: regenerer(l.jeton) };
      }),
    );
    flash('Lien révoqué et régénéré · ancien lien désormais inopérant · tracé au journal');
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Link2 className="h-3.5 w-3.5" /> M18 · Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Liens externes des référents</h1>
        <p className="mt-1 text-sm text-muted">
          Aucun compte ni mot de passe pour les référents (R5). Lien unique permanent, révocable et régénérable en un geste.
        </p>
      </div>

      <ul className="space-y-2">
        {liens.map((l) => (
          <li key={l.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{l.entreprise} <span className="font-normal text-muted">· {l.referent}</span></p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-forest-700">
                  <Link2 className="h-3 w-3" /> {url(l.jeton)}
                </p>
                {ancien[l.id] && (
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-danger-500 line-through">
                    <ShieldAlert className="h-3 w-3" /> {url(ancien[l.id])} — inopérant
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted">Créé le {l.cree}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge tone="forest" dot>Actif</Badge>
                <Button variant="primary" size="sm" icon={<QrCode className="h-4 w-4" />} onClick={() => setQrPour(l)}>QR d'activation</Button>
                <Button variant="outline" size="sm" icon={<Copy className="h-4 w-4" />} onClick={() => flash('Lien copié')}>Copier</Button>
                <Button variant="accent" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => revoquer(l.id)}>Révoquer &amp; régénérer</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {qrPour && (
        <QRActivationSheet
          lien={qrPour}
          onFermer={() => setQrPour(null)}
          onRegenerer={() => { revoquer(qrPour.id); setQrPour(null); flash('Activation régénérée · ancien QR inopérant'); }}
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

/* ---------- QR d'activation (invitation référent, inviolable) ---------- */
function QRActivationSheet({ lien, onFermer, onRegenerer }: { lien: LienExterne; onFermer: () => void; onRegenerer: () => void }) {
  const token = jetonActivation({ ent: lien.entreprise, ref: lien.referent, jeton: lien.jeton, exp: EXP_ACTIVATION });
  const lienActiv = `https://atlas-trace.vercel.app/activer#${token}`;
  const chips = [
    { icon: <ScanLine className="h-3.5 w-3.5" />, txt: 'Usage unique' },
    { icon: <Clock className="h-3.5 w-3.5" />, txt: 'Expire le 03/08 · 72 h' },
    { icon: <KeyRound className="h-3.5 w-3.5" />, txt: 'Signé (serveur)' },
    { icon: <ShieldAlert className="h-3.5 w-3.5" />, txt: 'Révocable' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFermer}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              <QrCode className="h-3.5 w-3.5" /> QR d'activation
            </p>
            <h3 className="mt-0.5 text-lg font-extrabold text-ink">{lien.entreprise}</h3>
            <p className="text-xs text-muted">{lien.referent} · à scanner pour activer l'accès</p>
          </div>
          <button onClick={onFermer} className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-4 flex justify-center">
          <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-sand-300/70">
            <QRCode value={lienActiv} size={200} />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {chips.map((c) => (
            <span key={c.txt} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-100">
              {c.icon} {c.txt}
            </span>
          ))}
        </div>

        <p className="mt-4 rounded-xl bg-sand-50 px-3 py-2.5 text-[11px] leading-relaxed text-muted ring-1 ring-sand-200">
          Le QR porte un jeton <b className="text-ink">signé</b> lié à cette entité. À l'activation, le serveur vérifie la
          signature, le <b className="text-ink">consomme une seule fois</b> et lie l'accès à l'appareil. Un QR photographié
          et rejoué est refusé ; après expiration ou révocation, il est inopérant.
        </p>

        <p className="mt-2 break-all font-mono text-[10px] text-muted">{token}</p>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onFermer}>Fermer</Button>
          <Button variant="accent" size="lg" block icon={<RefreshCw className="h-4 w-4" />} onClick={onRegenerer}>
            Régénérer (invalide l'ancien)
          </Button>
        </div>
      </div>
    </div>
  );
}
