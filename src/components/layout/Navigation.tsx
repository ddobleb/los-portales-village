'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, DoorClosed, ListChecks, Wallet,
  ShoppingCart, Users, CalendarDays, Settings, Hammer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export const navItems = [
  { href: '/dashboard',     label: 'Inicio',        icon: LayoutDashboard },
  { href: '/habitaciones',  label: 'Habitaciones',  icon: DoorClosed },
  { href: '/tareas',        label: 'Tareas',        icon: ListChecks },
  { href: '/presupuesto',   label: 'Presupuesto',   icon: Wallet },
  { href: '/compras',       label: 'Compras',       icon: ShoppingCart },
  { href: '/contratistas',  label: 'Contratistas',  icon: Users },
  { href: '/calendario',    label: 'Calendario',    icon: CalendarDays },
  { href: '/ajustes',       label: 'Ajustes',       icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r bg-card shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-terracota)] text-white">
          <Hammer className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-sm text-[var(--brand-terracota)]">Los Portales</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Village</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/'
              ? pathname === '/'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[var(--brand-terracota)] text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const mainItems = navItems.slice(0, 5)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-card px-1 pb-safe">
      {mainItems.map(({ href, label, icon: Icon }) => {
        const active = href === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-2 min-w-[52px]',
              active ? 'text-[var(--brand-terracota)]' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'flex items-center justify-center w-7 h-7 rounded',
              active ? 'bg-[var(--brand-terracota)] text-white' : ''
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span className={cn('text-[10px] font-semibold', active ? 'text-[var(--brand-terracota)]' : 'text-muted-foreground')}>
              {label.length > 6 ? label.slice(0, 5) + '.' : label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
