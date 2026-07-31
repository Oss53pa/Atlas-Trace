import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Unité ou complément affiché après la valeur */
  unit?: string;
  icon?: ReactNode;
  /** Variation : positive (vert), négative (rouge), neutre */
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  tone?: 'forest' | 'amber' | 'plain';
  className?: string;
}

const toneStyles = {
  forest: 'bg-forest-500 text-white',
  amber: 'bg-amber-500 text-white',
  plain: 'bg-white text-ink',
};

const iconTone = {
  forest: 'bg-white/15 text-white',
  amber: 'bg-white/20 text-white',
  plain: 'bg-forest-50 text-forest-600',
};

export function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  tone = 'plain',
  className,
}: StatCardProps) {
  const inverted = tone !== 'plain';
  return (
    <div
      className={cn(
        'rounded-2xl p-5 shadow-card border border-sand-200/60',
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className={cn(
            'text-sm font-medium',
            inverted ? 'text-white/80' : 'text-muted',
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl',
              iconTone[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight">{value}</span>
        {unit && (
          <span className={cn('text-sm font-medium', inverted ? 'text-white/70' : 'text-muted')}>
            {unit}
          </span>
        )}
      </div>
      {trend && (
        <p
          className={cn(
            'mt-2 text-xs font-semibold',
            inverted
              ? 'text-white/80'
              : trend.direction === 'down'
                ? 'text-danger-500'
                : trend.direction === 'up'
                  ? 'text-forest-500' /* hausse = vert marque */
                  : 'text-amber-500', /* à traiter = ambre */
          )}
        >
          {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'} {trend.value}
        </p>
      )}
    </div>
  );
}
