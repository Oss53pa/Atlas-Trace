import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'accent' | 'danger' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Icône optionnelle placée avant le libellé */
  icon?: ReactNode;
  /** Occupe toute la largeur disponible (utile au poste, gros boutons) */
  block?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 ease-premium ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-forest-400 ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none active:translate-y-px';

// Liseré interne clair en haut = matière premium sur les boutons pleins.
const gloss = 'shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]';

const variants: Record<Variant, string> = {
  primary: `bg-forest-500 text-white hover:bg-forest-600 active:bg-forest-700 shadow-soft hover:shadow-card ${gloss}`,
  accent: 'bg-amber-400 text-ink hover:bg-amber-300 active:bg-amber-500 shadow-soft hover:shadow-card',
  danger: `bg-danger-500 text-white hover:bg-danger-600 shadow-soft hover:shadow-card ${gloss}`,
  outline: 'border border-sand-300 text-forest-700 bg-white hover:border-forest-300 hover:bg-forest-50 shadow-xs',
  ghost: 'text-forest-700 hover:bg-forest-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-7 text-lg', // grande surface : usage au poste avec gants
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  block,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
