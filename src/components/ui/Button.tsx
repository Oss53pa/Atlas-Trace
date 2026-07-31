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
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-forest-400 ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-forest-500 text-white hover:bg-forest-600 active:bg-forest-700 shadow-card',
  accent: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-card',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-card',
  outline: 'border border-forest-200 text-forest-700 bg-white hover:bg-forest-50',
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
