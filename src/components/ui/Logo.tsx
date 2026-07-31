import { cn } from '../../lib/cn';

interface LogoProps {
  /** Taille du nom */
  size?: 'sm' | 'md' | 'lg';
  /** Conservé pour compatibilité — sans effet (le logo est le nom seul). */
  markOnly?: boolean;
  className?: string;
}

const wordmarkSize: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-3xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

/**
 * Nom affiché dans l'application : « Trace » en Grand Hotel.
 * (L'application se nomme Atlas Trace ; l'icône d'accueil porte le logo AT.)
 */
export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span className={cn('brand-wordmark inline-block leading-none', wordmarkSize[size], className)}>Trace</span>
  );
}
