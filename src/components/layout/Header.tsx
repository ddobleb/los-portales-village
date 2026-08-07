'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { LogOut, Settings, Menu } from 'lucide-react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { navItems } from './Navigation'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Header({ title }: { title?: string }) {
  const { profile, household, signOut } = useAuth()
  const pathname = usePathname()
  const initials = profile?.full_name ? getInitials(profile.full_name) : '??'

  // Label de la página activa
  const activeNav = navItems.find(({ href }) =>
    href === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : pathname.startsWith(href)
  )
  const pageTitle = title ?? activeNav?.label ?? ''

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      {/* Hamburguesa — abre drawer lateral */}
      <Sheet>
        <SheetTrigger className="inline-flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden shrink-0">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center gap-3 px-4 py-5 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-terracota)] text-white font-bold text-sm">
              LP
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm">Los Portales</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Village</p>
            </div>
          </div>
          <nav className="space-y-0.5 p-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[var(--brand-terracota)] text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Título + subtítulo */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-bold leading-tight truncate">{pageTitle}</h1>
        <p className="text-[11px] text-muted-foreground leading-tight truncate">
          {household?.name ?? ''} <span className="opacity-40">· v0.2.0</span>
        </p>
      </div>

      {/* Avatar cuadrado con dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--brand-terracota)] text-white text-xs font-bold hover:opacity-90 transition-opacity">
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" align="end">
          <DropdownMenuLabel>
            <p className="font-medium">{profile?.full_name ?? 'Mi cuenta'}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/ajustes" />} className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" /> Ajustes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
