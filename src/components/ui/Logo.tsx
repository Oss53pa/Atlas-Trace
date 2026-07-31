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
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
};

/**
 * Marque Atlas Trace : logo « AT » fourni par la cliente (image, non redessinée)
 * + nom de l'application en Grand Hotel.
 */
export function Logo({ size = 'md', markOnly = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src="/logo-at.png" alt="Atlas Trace" className={cn('w-auto object-contain', markSize[size])} />
      {!markOnly && (
        <span className={cn('brand-wordmark', wordmarkSize[size])}>Atlas&nbsp;Trace</span>
      )}
    </div>
  );
}
