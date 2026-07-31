import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Result = 'AUTORISE' | 'REFUSE';

interface StatusBannerProps {
  result: Result;
  /** Motif affiché en clair (obligatoire sur un refus, R2 / M5) */
  reason?: string;
  /** Consigne d'une ligne pour l'agent */
  instruction?: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * Bandeau de décision d'accès au poste de contrôle.
 * Vert = autorisé, rouge = refusé. Lisible en plein soleil, plein écran (R2, R3).
 */
export function StatusBanner({ result, reason, instruction, icon, className }: StatusBannerProps) {
  const authorized = result === 'AUTORISE';
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-4 rounded-2xl px-6 py-5 text-white shadow-card-lg',
        authorized ? 'bg-forest-500' : 'bg-danger-500',
        className,
      )}
    >
      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tracking-tight">
          {authorized ? 'ACCÈS AUTORISÉ' : 'ACCÈS REFUSÉ'}
        </p>
        {reason && <p className="text-base font-semibold text-white/90">{reason}</p>}
        {instruction && <p className="text-sm text-white/80">{instruction}</p>}
      </div>
    </div>
  );
}
