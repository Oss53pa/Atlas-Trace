import { User } from 'lucide-react';
import { cn } from '../../lib/cn';

interface AvatarProps {
  nom: string;
  prenom: string;
  photoUrl?: string;
  size?: 'md' | 'xl';
  className?: string;
}

/**
 * Photo du porteur — support du contrôle visuel humain (R2, R10 : jamais de biométrie).
 * À défaut de photo branchée, affiche les initiales sur fond neutre.
 */
export function Avatar({ nom, prenom, photoUrl, size = 'xl', className }: AvatarProps) {
  const initials = `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase();
  const dims = size === 'xl' ? 'h-44 w-44 text-5xl' : 'h-12 w-12 text-base';
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-3xl bg-forest-100 font-bold text-forest-700 ring-4 ring-white shadow-card-lg',
        dims,
        className,
      )}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={`${prenom} ${nom}`} className="h-full w-full object-cover" />
      ) : (
        <>
          <User className="absolute h-1/2 w-1/2 text-forest-200" strokeWidth={1.5} />
          <span className="relative">{initials}</span>
        </>
      )}
    </div>
  );
}
