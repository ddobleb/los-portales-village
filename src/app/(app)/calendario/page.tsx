'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { EventType } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface CalEvent {
  id: string; title: string; description: string | null
  start_date: string; end_date: string | null; all_day: boolean
  event_type: EventType; created_at: string
}

const EVENT_CONFIG: Record<EventType, { label: string; icon: string; color: string }> = {
  visit:     { label: 'Visita',    icon: '👷', color: '#3b6ea0' },
  delivery:  { label: 'Entrega',   icon: '📦', color: '#6b7c3b' },
  work:      { label: 'Obra',      icon: '🔨', color: '#1d3454' },
  milestone: { label: 'Hito',      icon: '🎯', color: '#9b6b3a' },
  meeting:   { label: 'Reunión',   icon: '🤝', color: '#6b3b7c' },
  other:     { label: 'Otro',      icon: '📌', color: '#6b6b6b' },
}

function formatEventDate(dateStr: string, allDay: boolean): string {
  const d = new Date(dateStr)
  if (isToday(d)) return allDay ? 'Hoy' : `Hoy, ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return allDay ? 'Mañana' : `Mañana, ${format(d, 'HH:mm')}`
  return format(d, allDay ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM · HH:mm", { locale: es })
}

function groupByMonth(events: CalEvent[]) {
  const groups: Record<string, CalEvent[]> = {}
  events.forEach(e => {
    const key = format(new Date(e.start_date), 'MMMM yyyy', { locale: es })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return groups
}

const emptyForm = { title: '', description: '', start_date: new Date().toISOString().slice(0, 10), start_time: '09:00', all_day: true, event_type: 'visit' as EventType }

export default function CalendarioPage() {
  const { household } = useAuth()
  const supabase = createClient()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => { if (household) load() }, [household])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('events').select('*').eq('household_id', household!.id)
      .order('start_date', { ascending: true })
    setEvents((data ?? []) as CalEvent[])
    setLoading(false)
  }

  async function addEvent() {
    if (!form.title.trim()) return
    const start = form.all_day
      ? new Date(form.start_date + 'T00:00:00').toISOString()
      : new Date(form.start_date + 'T' + form.start_time).toISOString()
    const { error } = await supabase.from('events').insert({
      household_id: household!.id,
      title: form.title.trim(),
      description: form.description || null,
      start_date: start,
      all_day: form.all_day,
      event_type: form.event_type,
    })
    if (error) { toast.error('Error al crear evento'); return }
    toast.success('Evento añadido')
    setDialog(false)
    setForm({ ...emptyForm })
    load()
  }

  async function del(id: string) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(evs => evs.filter(e => e.id !== id))
  }

  const now = startOfDay(new Date())
  const upcoming = events.filter(e => !isPast(new Date(e.start_date)) || isToday(new Date(e.start_date)))
  const past = events.filter(e => isPast(new Date(e.start_date)) && !isToday(new Date(e.start_date)))
  const upcomingGroups = groupByMonth(upcoming)
  const pastGroups = groupByMonth(past.slice().reverse())

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 bg-card border border-border">
        <div className="p-4 border-r border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Próximos eventos</p>
          <p className="text-3xl font-black">{upcoming.length}</p>
        </div>
        <div className="p-4 flex items-center justify-center">
          <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Nuevo evento</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse" />)}</div>
      ) : (
        <>
          {upcoming.length === 0 && (
            <div className="bg-card border border-border p-10 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Sin eventos próximos</p>
              <Button size="sm" className="mt-3" onClick={() => setDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Añadir</Button>
            </div>
          )}

          {Object.entries(upcomingGroups).map(([month, evs]) => (
            <div key={month}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 capitalize">{month}</p>
              <div className="bg-card border border-border divide-y divide-border">
                {evs.map(e => {
                  const cfg = EVENT_CONFIG[e.event_type]
                  return (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="text-lg shrink-0 mt-0.5">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{formatEventDate(e.start_date, e.all_day)}</p>
                        {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] border border-border px-1.5 py-0.5 font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                        <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {past.length > 0 && (
            <button onClick={() => setShowPast(p => !p)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showPast ? '▾' : '▸'} {past.length} eventos pasados
            </button>
          )}

          {showPast && Object.entries(pastGroups).map(([month, evs]) => (
            <div key={month} className="opacity-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 capitalize">{month}</p>
              <div className="bg-card border border-border divide-y divide-border">
                {evs.map(e => {
                  const cfg = EVENT_CONFIG[e.event_type]
                  return (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="text-lg shrink-0 mt-0.5">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-through">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{formatEventDate(e.start_date, e.all_day)}</p>
                      </div>
                      <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo evento</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Visita del fontanero…" autoFocus /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Tipo</Label>
                <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v as EventType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.entries(EVENT_CONFIG) as [EventType, { label: string }][]).map(([v, c]) => <SelectItem key={v} value={v}>{EVENT_CONFIG[v].icon} {c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="all-day" checked={form.all_day} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))} className="w-4 h-4" />
              <Label htmlFor="all-day">Todo el día</Label>
              {!form.all_day && <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="ml-auto w-28 h-8 text-sm" />}
            </div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalles…" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={addEvent} disabled={!form.title.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

