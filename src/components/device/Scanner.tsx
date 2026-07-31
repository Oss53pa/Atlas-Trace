import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff, Loader2, ScanLine } from 'lucide-react';

type Etat = 'demarrage' | 'actif' | 'refus' | 'indispo';

interface ScannerProps {
  /** Appelé une fois avec le texte décodé du premier QR détecté. */
  onDetect: (texte: string) => void;
  /** Rendu de repli quand la caméra est indisponible / refusée (ex. simulation). */
  fallback?: (etat: Etat) => React.ReactNode;
}

/** Lecteur de QR réel : caméra arrière via BarcodeDetector (natif) ou repli jsQR. */
export function Scanner({ onDetect, fallback }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const luRef = useRef(false);
  const [etat, setEtat] = useState<Etat>('demarrage');

  useEffect(() => {
    let annule = false;
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    const detecteur = BD ? new BD({ formats: ['qr_code'] }) : null;

    async function boucle() {
      if (annule || luRef.current) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c && v.readyState >= 2 && v.videoWidth) {
        let texte: string | null = null;
        if (detecteur) {
          try {
            const codes = await detecteur.detect(v);
            if (codes[0]?.rawValue) texte = codes[0].rawValue;
          } catch { /* frame non prête */ }
        } else {
          const ctx = c.getContext('2d', { willReadFrequently: true })!;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const res = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (res?.data) texte = res.data;
        }
        if (texte) {
          luRef.current = true;
          onDetect(texte);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(boucle);
    }

    async function demarrer() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEtat('indispo');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (annule) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        await v.play();
        setEtat('actif');
        rafRef.current = requestAnimationFrame(boucle);
      } catch (e) {
        setEtat((e as DOMException)?.name === 'NotAllowedError' ? 'refus' : 'indispo');
      }
    }

    demarrer();
    return () => {
      annule = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  if (etat === 'refus' || etat === 'indispo') {
    return (
      <div className="w-full">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          <CameraOff className="h-4 w-4 shrink-0" />
          {etat === 'refus'
            ? 'Accès caméra refusé — autorisez-le dans le navigateur, ou utilisez la simulation.'
            : 'Caméra indisponible ici — utilisez la simulation ci-dessous.'}
        </div>
        {fallback?.(etat)}
      </div>
    );
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-3xl bg-forest-900">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      {/* Cadre de visée */}
      {['left-5 top-5 border-l-4 border-t-4', 'right-5 top-5 border-r-4 border-t-4', 'left-5 bottom-5 border-l-4 border-b-4', 'right-5 bottom-5 border-r-4 border-b-4'].map((c) => (
        <span key={c} className={`absolute h-10 w-10 rounded-md border-white/90 ${c}`} />
      ))}
      <span className="absolute inset-x-10 top-1/2 h-0.5 animate-pulse bg-forest-200/90 shadow-[0_0_12px_2px_rgba(175,209,184,0.8)]" />
      {etat === 'demarrage' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-forest-900/80 text-white/90">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-semibold">Démarrage de la caméra…</p>
        </div>
      )}
      {etat === 'actif' && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/80">
          <ScanLine className="h-3.5 w-3.5" /> Cadrez le QR du badge
        </div>
      )}
    </div>
  );
}
