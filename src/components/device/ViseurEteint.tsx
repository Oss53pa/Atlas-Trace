import { CameraOff } from 'lucide-react';

/**
 * Zone de visée au repos : la caméra n'est pas démarrée, et l'écran le dit.
 * (Pas de ligne de scan animée : rien n'est en train d'être lu.)
 */
export function ViseurEteint({ detail }: { detail: string }) {
  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-3xl bg-forest-900/95">
        {['left-5 top-5 border-l-4 border-t-4', 'right-5 top-5 border-r-4 border-t-4', 'left-5 bottom-5 border-l-4 border-b-4', 'right-5 bottom-5 border-r-4 border-b-4'].map((c) => (
          <span key={c} className={`absolute h-10 w-10 rounded-md border-white/35 ${c}`} />
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/75">
          <CameraOff className="h-9 w-9" />
          <p className="text-sm font-semibold">Caméra éteinte</p>
          <p className="text-xs text-white/50">{detail}</p>
        </div>
      </div>
    </div>
  );
}
