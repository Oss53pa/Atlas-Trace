import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Trash2, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz } from '../../lib/authz';
import { Button } from '../../components/ui/Button';

/**
 * Logo de l'entreprise/site, utilisé en en-tête des rapports et exports PDF.
 * L'image est redimensionnée et compressée côté client en data URL, puis posée
 * en base via at_definir_logo_site (pouvoir ADMINISTRER_ORGANISATION). Elle est
 * ensuite embarquée telle quelle dans les documents imprimés.
 */

const MAX_PX = 320;
const LIMITE = 280_000; // marge sous la borne serveur (300 Ko encodés)

/** Redimensionne et encode une image en data URL compacte (PNG, repli JPEG). */
function compresser(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Image illisible'));
      img.onload = () => {
        const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponible'));
        ctx.drawImage(img, 0, 0, w, h);
        let url = canvas.toDataURL('image/png');
        if (url.length > LIMITE) url = canvas.toDataURL('image/jpeg', 0.85);
        resolve(url);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function LogoSite() {
  const { a } = useAuthz();
  const peutModifier = a('ADMINISTRER_ORGANISATION');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [libelle, setLibelle] = useState('');
  const [pret, setPret] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('at_sites').select('id, libelle, logo_url').limit(1).maybeSingle();
      if (data) { setSiteId(data.id); setLibelle(data.libelle); setLogo(data.logo_url ?? null); }
      setPret(true);
    })();
  }, []);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function definir(dataUrl: string | null) {
    if (!siteId) return;
    setOccupe(true); setErr(null);
    const { error } = await supabase.rpc('at_definir_logo_site', { p_site_id: siteId, p_data_url: dataUrl });
    setOccupe(false);
    if (error) { setErr('Refusé : ' + error.message); return; }
    setLogo(dataUrl);
    flash(dataUrl ? 'Logo enregistré' : 'Logo retiré');
  }

  async function choisir(file?: File) {
    if (!file) return;
    setErr(null);
    if (!/^image\//.test(file.type)) { setErr('Choisissez un fichier image (PNG, JPG, SVG…).'); return; }
    try {
      const url = await compresser(file);
      await definir(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!pret) return <div className="flex items-center gap-2 py-8 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> …</div>;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70">
      <div className="mb-1 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-forest-600" />
        <h3 className="text-base font-extrabold text-ink">Logo de l’entreprise</h3>
      </div>
      <p className="mb-4 text-xs text-muted">Affiché en en-tête des rapports et exports PDF (« {libelle || 'ce site'} »). Image nette, fond transparent de préférence. Redimensionnée automatiquement.</p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-sand-300 bg-sand-50">
          {logo ? <img src={logo} alt="Logo du site" className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-muted">Aucun logo</span>}
        </div>

        {peutModifier ? (
          <div className="flex flex-col gap-2">
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => choisir(e.target.files?.[0])} />
            <Button variant="primary" size="sm" disabled={occupe}
              icon={occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              onClick={() => input.current?.click()}>
              {logo ? 'Remplacer' : 'Choisir un logo'}
            </Button>
            {logo && (
              <Button variant="ghost" size="sm" disabled={occupe} icon={<Trash2 className="h-4 w-4" />} onClick={() => definir(null)}>
                Retirer
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">Seule l’administration peut modifier le logo.</p>
        )}
      </div>

      {msg && <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-2.5 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-forest-100"><Check className="h-3.5 w-3.5" /> {msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}
    </div>
  );
}
