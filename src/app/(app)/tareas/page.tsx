'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Task, TaskStatus, TaskPriority, Zone, Room, Measurement } from '@/lib/database.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2, Plus, Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low',    label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high',   label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'text-green-600', medium: 'text-amber-600', high: 'text-orange-600', urgent: 'text-red-600',
}

const STATUS_FILTERS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'Todas' },
  { value: 'pending',     label: 'Pendientes' },
  { value: 'in_progress', label: 'En obra' },
  { value: 'done',        label: 'Hechas' },
]

function formatDue(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  const days = differenceInDays(d, new Date())
  if (days > 0 && days <= 14) return `En ${days} d`
  if (days < 0) return `Hace ${Math.abs(days)} d`
  return format(d, 'd MMM', { locale: es })
}

// ── Contexto legible ─────────────────────────────────────────────────────────
function buildContext(task: Task, zones: Zone[], rooms: Room[], measurements: Measurement[]): string {
  const parts: string[] = []
  if (task.zone_id) {
    const z = zones.find(z => z.id === task.zone_id)
    if (z) parts.push(z.name)
  }
  if (task.room_id) {
    const r = rooms.find(r => r.id === task.room_id)
    if (r) parts.push(r.name)
  }
  if (task.measurement_id) {
    const m = measurements.find(m => m.id === task.measurement_id)
    if (m) parts.push(m.label)
  }
  return parts.join(' › ')
}

const emptyForm = {
  title: '', priority: 'medium' as TaskPriority, due_date: '',
  zone_id: '', room_id: '', measurement_id: '',
}

export default function TareasPage() {
  const { household } = useAuth()
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  // Rooms filtered by selected zone
  const filteredRooms = form.zone_id
    ? rooms.filter(r => r.zone_id === form.zone_id)
    : rooms
  // Measurements filtered by selected room
  const filteredMeasurements = form.room_id
    ? measurements.filter(m => m.room_id === form.room_id)
    : []

  useEffect(() => { if (household) load() }, [household])

  async function load() {
    setLoading(true)
    const [tasksRes, zonesRes, roomsRes, measRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('household_id', household!.id).order('created_at', { ascending: false }),
      supabase.from('zones').select('*').eq('household_id', household!.id).order('sort_order'),
      supabase.from('rooms').select('*').eq('household_id', household!.id).order('name'),
      supabase.from('measurements').select('id, room_id, label, category').eq('room_id', supabase.from('rooms').select('id').eq('household_id', household!.id) as any),
    ])
    setTasks((tasksRes.data ?? []) as Task[])
    setZones((zonesRes.data ?? []) as Zone[])
    setRooms((roomsRes.data ?? []) as Room[])
    setLoading(false)
  }

  // Load measurements separately since the join above doesn't work well
  useEffect(() => {
    if (!rooms.length) return
    const roomIds = rooms.map(r => r.id)
    supabase.from('measurements').select('id, room_id, label, category').in('room_id', roomIds).then(({ data }) => {
      setMeasurements((data ?? []) as Measurement[])
    })
  }, [rooms])

  async function addTask() {
    if (!form.title.trim()) return
    const { error } = await supabase.from('tasks').insert({
      household_id: household!.id,
      title: form.title.trim(),
      status: 'pending',
      priority: form.priority,
      due_date: form.due_date || null,
      zone_id: form.zone_id || null,
      room_id: form.room_id || null,
      measurement_id: form.measurement_id || null,
    })
    if (error) { toast.error('Error al añadir'); return }
    setDialog(false)
    setForm({ ...emptyForm })
    load()
  }

  async function toggleDone(task: Task) {
    const newStatus: TaskStatus = task.status === 'done' ? 'pending' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  async function updatePriority(id: string, priority: TaskPriority) {
    await supabase.from('tasks').update({ priority }).eq('id', id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, priority } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter)

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Filtros + añadir */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 flex-1 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter(value)} className={cn(
              'px-3 py-1.5 text-xs font-semibold border transition-colors',
              filter === value ? 'bg-[var(--brand-terracota)] text-white border-transparent' : 'border-border text-muted-foreground hover:border-foreground/30'
            )}>{label}</button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Tarea</Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          {filter === 'all' ? 'Sin tareas. ¡Añade la primera!' : 'Sin tareas en este estado.'}
        </p>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {filtered.map(task => {
            const done = task.status === 'done'
            const ctx = buildContext(task, zones, rooms, measurements)
            return (
              <div key={task.id} className={cn('flex items-start gap-3 px-4 py-3', done && 'opacity-60')}>
                {/* Checkbox */}
                <button onClick={() => toggleDone(task)} className={cn(
                  'w-5 h-5 border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  done ? 'bg-[var(--brand-terracota)] border-[var(--brand-terracota)]' : 'border-border'
                )}>
                  {done && <Check className="h-3 w-3 text-white" />}
                </button>

                {/* Título + contexto */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold leading-snug', done && 'line-through')}>{task.title}</p>
                  {ctx && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                      {ctx.split(' › ').map((part, i, arr) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                          <span>{part}</span>
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {/* Prioridad + fecha + borrar */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.priority}
                    onChange={e => updatePriority(task.id, e.target.value as TaskPriority)}
                    disabled={done}
                    className={cn('text-xs border border-border px-1.5 py-1 bg-card font-semibold', PRIORITY_COLOR[task.priority])}
                  >
                    {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground w-14 text-right whitespace-nowrap">{formatDue(task.due_date)}</span>
                  )}
                  <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setDialog(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[var(--brand-terracota)] text-white shadow-lg hover:opacity-90 transition-opacity"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Dialog nueva tarea */}
      <Dialog open={dialog} onOpenChange={open => { setDialog(open); if (!open) setForm({ ...emptyForm }) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">

            {/* Título */}
            <div className="space-y-1">
              <Label>Tarea *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="¿Qué hay que hacer?"
                onKeyDown={e => e.key === 'Enter' && addTask()}
                autoFocus
              />
            </div>

            {/* Vinculación jerárquica */}
            <div className="space-y-2 border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vincular a</p>

              {/* Zona */}
              <div className="space-y-1">
                <Label className="text-xs">Zona / Planta</Label>
                <Select
                  value={form.zone_id || '__none'}
                  onValueChange={v => setForm(f => ({ ...f, zone_id: v === '__none' ? '' : (v ?? ''), room_id: '', measurement_id: '' }))}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin zona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin zona</SelectItem>
                    {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Habitación */}
              <div className="space-y-1">
                <Label className="text-xs">Habitación</Label>
                <Select
                  value={form.room_id || '__none'}
                  onValueChange={v => setForm(f => ({ ...f, room_id: v === '__none' ? '' : (v ?? ''), measurement_id: '' }))}
                  disabled={filteredRooms.length === 0}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin habitación" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin habitación</SelectItem>
                    {filteredRooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Elemento */}
              {form.room_id && filteredMeasurements.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Elemento específico</Label>
                  <Select
                    value={form.measurement_id || '__none'}
                    onValueChange={v => setForm(f => ({ ...f, measurement_id: v === '__none' ? '' : (v ?? '') }))}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin elemento" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Sin elemento</SelectItem>
                      {filteredMeasurements.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Prioridad + fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha límite</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={addTask} disabled={!form.title.trim()}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
