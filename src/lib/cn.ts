/**
 * Concatène des classes conditionnelles. Léger, sans dépendance.
 * Ex : cn('base', condition && 'actif', undefined)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
