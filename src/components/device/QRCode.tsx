import { useEffect, useRef } from 'react';
import QR from 'qrcode';

interface QRCodeProps {
  /** Charge encodée (jeton signé, référence de formulaire, URL de liste…). */
  value: string;
  size?: number;
  className?: string;
  dark?: string;
  light?: string;
}

/** Vrai QR code (lib qrcode), rendu sur canvas. Remplace l'ancien faux QR SVG. */
export function QRCode({ value, size = 160, className, dark = '#0A2E28', light = '#FFFFFF' }: QRCodeProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    QR.toCanvas(el, value || ' ', {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark, light },
    }).catch(() => {});
  }, [value, size, dark, light]);
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-label="QR code" />;
}
