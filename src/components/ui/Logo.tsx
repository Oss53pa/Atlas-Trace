import { cn } from '../../lib/cn';

interface LogoProps {
  /** Taille du bloc logo */
  size?: 'sm' | 'md' | 'lg';
  /** Affiche uniquement la marque (pictogramme) sans le nom */
  markOnly?: boolean;
  className?: string;
}

const wordmarkSize: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-5xl',
};

const markSize: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

/**
 * Marque Atlas Trace : pictogramme (point de passage / cible) + nom en Grand Hotel.
 */
export function Logo({ size = 'md', markOnly = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-2xl bg-forest-500 text-white shadow-card',
          markSize[size],
        )}
        aria-hidden
      >
        <AtlasMark />
      </span>
      {!markOnly && (
        <span className={cn('brand-wordmark', wordmarkSize[size])}>Atlas&nbsp;Trace</span>
      )}
    </div>
  );
}

/** Pictogramme : cible / point de contrôle avec une trace de passage. */
function AtlasMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3/5 w-3/5" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path
        d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
