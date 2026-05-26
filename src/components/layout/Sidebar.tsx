'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Target, ClipboardList, Users, BarChart3,
  Settings, BookOpen, Building2, ChevronLeft, LogOut,
  Bell, Sparkles,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { getInitials } from '@/lib/utils'
import { useState } from 'react'
import { trpc } from '@/components/providers/TRPCProvider'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mes évaluations', href: '/evaluations', icon: ClipboardList },
  { label: 'Mes objectifs', href: '/objectives', icon: Target },
  { label: 'Mon équipe', href: '/team', icon: Users, roles: ['MANAGER', 'RH', 'ADMIN'] },
  { label: 'Campagnes', href: '/campaigns', icon: Sparkles, roles: ['RH', 'ADMIN'] },
  { label: 'Développement', href: '/development', icon: BookOpen },
  { label: 'Reporting', href: '/reporting', icon: BarChart3, roles: ['RH', 'ADMIN', 'MANAGER'] },
  { label: 'Administration', href: '/admin/users', icon: Building2, roles: ['ADMIN'] },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role ?? 'COLLABORATEUR'

  const { data: unreadCount } = trpc.report.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  })

  const visibleItems = navItems.filter(
    item => !item.roles || item.roles.includes(role)
  )

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">PerformIQ</p>
              <p className="truncate text-xs text-muted-foreground">
                {session?.user?.organizationId ? 'Entreprise' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const showBadge = item.href === '/notifications' && unreadCount && unreadCount > 0

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="relative">
                    <Icon className="h-4 w-4 shrink-0" />
                    {showBadge && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t p-2">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {session?.user
                ? getInitials(session.user.firstName ?? '', session.user.lastName ?? '')
                : '?'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {session?.user?.firstName} {session?.user?.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{session?.user?.role}</p>
            </div>
          )}
        </Link>

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'mt-1 text-muted-foreground hover:text-foreground',
            collapsed ? 'w-full' : 'w-full justify-start gap-3'
          )}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Déconnexion'}
        </Button>
      </div>

      {/* Collapse toggle */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
        >
          <ChevronLeft className={cn('h-3 w-3 transition-transform', collapsed && 'rotate-180')} />
        </button>
      )}
    </aside>
  )
}
