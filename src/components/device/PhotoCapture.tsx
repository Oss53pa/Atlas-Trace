import { useRef, useState } from 'react';
import { Camera, Check, RotateCcw } from 'lucide-react';

interface PhotoCaptureProps {
  /** Reçoit la photo capturée en data URL (JPEG/PNG). */
  onCapture: (dataUrl: string) => void;
  label?: string;
  /** Data URL déjà capturée (contrôle externe de l'état). */
  value?: string | null;
}

/**
 * Capture photo native : ouvre l'appareil arrière du téléphone (capture="environment"),
 * lit le fichier en data URL, affiche l'aperçu, et le remonte au parent.
 * Sur ordinateur, ouvre le sélecteur de fichier — le même flux d'enregistrement.
 */
export function PhotoCapture({ onCapture, label = 'Prendre la photo', value }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [apercu, setApercu] = useState<string | null>(value ?? null);

  function surFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setApercu(url);
      onCapture(url);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={surFichier} />

      {apercu ? (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-sand-300">
          <img src={apercu} alt="Photo capturée" className="max-h-56 w-full object-cover" />
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-forest-600/90 px-2.5 py-1 text-xs font-semibold text-white">
            <Check className="h-3.5 w-3.5" /> Enregistrée
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-soft"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reprendre
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 py-4 text-sm font-semibold text-forest-700 transition-colors hover:border-forest-300 hover:bg-forest-50"
        >
          <Camera className="h-5 w-5" /> {label}
        </button>
      )}
    </div>
  );
}
