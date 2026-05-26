import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  return format(new Date(date), fmt, { locale: fr })
}

export function formatDateRelative(date: Date | string | null): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

export function getInitials(firstOrFull: string, lastName?: string): string {
  if (lastName !== undefined) {
    return `${firstOrFull.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }
  const parts = firstOrFull.trim().split(/\s+/)
  return parts.length >= 2
    ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    : firstOrFull.charAt(0).toUpperCase()
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function scoreToLabel(score: number | null): string {
  if (score === null || score === undefined) return 'Non noté'
  if (score >= 4.5) return 'Exceptionnel'
  if (score >= 3.5) return 'Dépasse les attentes'
  if (score >= 2.5) return 'Répond aux attentes'
  if (score >= 1.5) return 'À améliorer'
  return 'Insuffisant'
}

export function scoreToColor(score: number | null): string {
  if (score === null || score === undefined) return 'text-muted-foreground'
  if (score >= 4.5) return 'text-emerald-600'
  if (score >= 3.5) return 'text-green-600'
  if (score >= 2.5) return 'text-yellow-600'
  if (score >= 1.5) return 'text-orange-600'
  return 'text-red-600'
}

export function formatScore(score: number | null, max = 5): string {
  if (score === null || score === undefined) return '—'
  return `${score.toFixed(1)}/${max}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}...`
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item)
    result[key] = result[key] ?? []
    result[key].push(item)
    return result
  }, {} as Record<string, T[]>)
}
