import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'forest' | 'amber' | 'danger' | 'neutral';

interface BadgeProps {
  tone?: Tone;
  /** Point coloré devant le libellé (état) */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  forest: 'bg-forest-50 text-forest-700 ring-forest-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-danger-50 text-danger-600 ring-danger-100',
  neutral: 'bg-sand-200 text-forest-700 ring-sand-300',
};

const dotColor: Record<Tone, string> = {
  forest: 'bg-forest-500',
  amber: 'bg-amber-500',
  danger: 'bg-danger-500',
  neutral: 'bg-forest-400',
};

export function Badge({ tone = 'neutral', dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[tone])} />}
      {children}
    </span>
  );
}
