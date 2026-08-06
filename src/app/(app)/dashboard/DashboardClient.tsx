'use client'

import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Plus } from 'lucide-react'
import { formatCurrency, roomTypeLabel, cn } from '@/lib/utils'
import type { Room, Task } from '@/lib/database.types'
import { format, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  rooms: Pick<Room, 'id' | 'name' | 'type' | 'status' | 'color'>[]
  pendingTasks: Pick<Task, 'id' | 'title' | 'priority' | 'status' | 'due_date' | 'room_id'>[]
  totalBudget: number
  totalSpent: number
  roomsDone: number
  roomsInProgress: number
  tasksDueThisWeek: number
  shoppingPending: number
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  const days = differenceInDays(d, new Date())
  if (days > 0 && days <= 14) return `En ${days} d`
  return format(d, 'd MMM', { locale: es })
}

const STATUS_BADGE: Record<string, string> = {
  done:        'bg-[var(--brand-terracota)] text-white border-transparent',
  in_progress: 'border-[var(--brand-terracota)] text-[var(--brand-terracota)] bg-transparent',
  pending:     'border-border text-muted-foreground bg-transparent',
}
const STATUS_LABEL: Record<string, string> = {
  done: 'Terminada', in_progress: 'En obra', pending: 'Pendiente',
}

export function DashboardClient({
  rooms, pendingTasks, totalBudget, totalSpent,
  roomsDone, roomsInProgress, tasksDueThisWeek, shoppingPending,
}: Props) {
  const budgetPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const roomsPct = rooms.length > 0 ? Math.round((roomsDone / rooms.length) * 100) : 0
  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Saludo + fecha */}
      <div>
        <h2 className="text-2xl font-extrabold leading-tight">Buenas, tu reforma</h2>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{today}</p>
      </div>

      {/* KPI grid 2×2 con divisores finos */}
      <div className="grid grid-cols-2 bg-card rounded-xl overflow-hidden border border-border">
        <KpiCell
          label="PROGRESO GLOBAL"
          value={`${roomsPct}%`}
          sub={`${roomsDone} de ${rooms.length} habitaciones listas`}
          progress={roomsPct}
          href="/habitaciones"
          className="border-r border-b"
        />
        <KpiCell
          label="TAREAS PENDIENTES"
          value={String(pendingTasks.length)}
          sub={`de ${pendingTasks.length} · ${tasksDueThisWeek} urgentes`}
          href="/tareas"
          className="border-b"
        />
        <KpiCell
          label="PRESUPUESTO"
          value={totalBudget > 0 ? `${Math.round(budgetPct)}%` : '—'}
          sub={totalBudget > 0 ? `${formatCurrency(totalSpent)} de ${formatCurrency(totalBudget)}` : 'Sin límite fijado'}
          progress={totalBudget > 0 ? budgetPct : undefined}
          href="/presupuesto"
          className="border-r"
        />
        <KpiCell
          label="COMPRAS"
          value={String(shoppingPending)}
          sub="por comprar"
          href="/compras"
        />
      </div>

      {/* Próximas tareas */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm">Próximas tareas</h3>
          <Link href="/tareas" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Ver todas
          </Link>
        </div>

        {pendingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">¡Sin tareas pendientes! 🎉</p>
        ) : (
          <div>
            {pendingTasks.slice(0, 6).map((task, i) => {
              const dueLabel = formatDueDate(task.due_date)
              return (
                <Link
                  key={task.id}
                  href={`/tareas`}
                  className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                    i < pendingTasks.slice(0, 6).length - 1 && 'border-b border-border'
                  )}
                >
                  {/* Checkbox decorativo */}
                  <div className="w-4 h-4 rounded border border-border shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{task.title}</p>
                    {task.room_id && (
                      <p className="text-xs text-muted-foreground truncate">
                        {rooms.find(r => r.id === task.room_id)?.name ?? ''}
                      </p>
                    )}
                  </div>
                  {dueLabel && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                      {dueLabel}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Habitaciones */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm">Habitaciones</h3>
          <Link href="/habitaciones" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Gestionar
          </Link>
        </div>

        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aún no hay habitaciones</p>
        ) : (
          <div>
            {rooms.slice(0, 7).map((room, i) => (
              <Link
                key={room.id}
                href="/habitaciones"
                className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                  i < rooms.slice(0, 7).length - 1 && 'border-b border-border'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{room.name}</p>
                  <p className="text-xs text-muted-foreground">{roomTypeLabel(room.type)}</p>
                </div>
                <span className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded border shrink-0',
                  STATUS_BADGE[room.status] ?? STATUS_BADGE.pending
                )}>
                  {STATUS_LABEL[room.status] ?? 'Pendiente'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/habitaciones/nuevo"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[var(--brand-terracota)] text-white shadow-lg hover:opacity-90 transition-opacity"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}

function KpiCell({ label, value, sub, progress, href, className }: {
  label: string; value: string; sub: string
  progress?: number; href: string; className?: string
}) {
  return (
    <Link href={href} className={cn('block p-4 hover:bg-muted/30 transition-colors', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-black leading-none mb-1">{value}</p>
      {progress !== undefined && (
        <Progress value={progress} className="h-1 my-2" />
      )}
      <p className="text-xs text-muted-foreground leading-tight">{sub}</p>
    </Link>
  )
}
