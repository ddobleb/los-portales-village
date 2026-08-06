'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Room, Measurement, MeasurementCategory, RoomStatus } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<MeasurementCategory, string> = {
  door: 'Puerta', window: 'Ventana', wall: 'Pared', floor: 'Suelo',
  ceiling: 'Techo', radiator: 'Radiador', furniture: 'Mueble',
  fixture: 'Instalación', other: 'Otro',
}
const CATEGORY_ICONS: Record<MeasurementCategory, string> = {
  door: '🚪', window: '🪟', wall: '🧱', floor: '🏠',
  ceiling: '⬆️', radiator: '🔥', furniture: '🛋️',
  fixture: '🔧', other: '📏',
}
const STATUS_OPTIONS: { value: RoomStatus; label: string }[] = [
  { value: 'pending',     label: 'Pendiente' },
  { value: 'in_progress', label: 'En obra' },
  { value: 'done',        label: 'Terminada' },
]
const STATUS_STYLE: Record<RoomStatus, string> = {
  pending:     'border-border text-muted-foreground',
  in_progress: 'border-[var(--brand-terracota)] text-[var(--brand-terracota)]',
  done:        'bg-[var(--brand-terracota)] text-white border-transparent',
}

interface EditingMeasure {
  id: string
  label: string
  category: MeasurementCategory
  w: string; h: string; d: string
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { household } = useAuth()
  const supabase = createClient()

  const [room, setRoom] = useState<Room | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingMeasure | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newM, setNewM] = useState<Omit<EditingMeasure, 'id'>>({ label: '', category: 'other', w: '', h: '', d: '' })

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const [roomRes, measRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', id).single(),
      supabase.from('measurements').select('*').eq('room_id', id).order('sort_order').order('created_at'),
    ])
    if (roomRes.error || !roomRes.data) { toast.error('Habitación no encontrada'); router.push('/habitaciones'); return }
    setRoom(roomRes.data as Room)
    setMeasurements((measRes.data ?? []) as Measurement[])
    setLoading(false)
  }

  async function updateStatus(status: RoomStatus) {
    if (!room) return
    await supabase.from('rooms').update({ status }).eq('id', id)
    setRoom(r => r ? { ...r, status } : r)
  }

  async function saveMeasurement() {
    if (!editing || !editing.label.trim()) return
    await supabase.from('measurements').update({
      label: editing.label.trim(),
      category: editing.category,
      width_cm: editing.w ? parseFloat(editing.w) : null,
      height_cm: editing.h ? parseFloat(editing.h) : null,
      depth_cm: editing.d ? parseFloat(editing.d) : null,
    }).eq('id', editing.id)
    setEditing(null)
    load()
  }

  async function addMeasurement() {
    if (!newM.label.trim()) return
    await supabase.from('measurements').insert({
      room_id: id,
      label: newM.label.trim(),
      category: newM.category,
      width_cm: newM.w ? parseFloat(newM.w) : null,
      height_cm: newM.h ? parseFloat(newM.h) : null,
      depth_cm: newM.d ? parseFloat(newM.d) : null,
      sort_order: measurements.length,
    })
    setNewM({ label: '', category: 'other', w: '', h: '', d: '' })
    setAddingNew(false)
    load()
  }

  async function deleteMeasurement(measId: string) {
    await supabase.from('measurements').delete().eq('id', measId)
    setMeasurements(ms => ms.filter(m => m.id !== measId))
  }

  if (loading || !room) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  // Group measurements by category
  const grouped = measurements.reduce<Record<string, Measurement[]>>((acc, m) => {
    const k = m.category
    if (!acc[k]) acc[k] = []
    acc[k].push(m)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/habitaciones')} className="shrink-0 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold leading-tight truncate">{room.name}</h1>
          <p className="text-sm text-muted-foreground">{room.type}</p>
        </div>
        {/* Status selector */}
        <Select value={room.status} onValueChange={v => updateStatus(v as RoomStatus)}>
          <SelectTrigger className={cn('w-auto h-7 text-xs font-semibold border px-3 shrink-0', STATUS_STYLE[room.status])}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dimensiones generales */}
      {(room.floor_sqm || room.ceiling_height_cm) && (
        <div className="bg-card border border-border px-4 py-3 flex gap-6">
          {room.floor_sqm && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Superficie</p>
              <p className="text-xl font-black">{room.floor_sqm} <span className="text-sm font-normal text-muted-foreground">m²</span></p>
            </div>
          )}
          {room.ceiling_height_cm && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Alto techo</p>
              <p className="text-xl font-black">{room.ceiling_height_cm} <span className="text-sm font-normal text-muted-foreground">cm</span></p>
            </div>
          )}
        </div>
      )}

      {/* Elementos y medidas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Elementos y medidas ({measurements.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setAddingNew(true)} disabled={addingNew}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
          </Button>
        </div>

        {/* Formulario nuevo elemento */}
        {addingNew && (
          <div className="bg-card border border-[var(--brand-terracota)]/40 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={newM.label}
                  onChange={e => setNewM(n => ({ ...n, label: e.target.value }))}
                  placeholder="Ej: Ventana principal"
                  onKeyDown={e => e.key === 'Enter' && addMeasurement()}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <Select value={newM.category} onValueChange={v => setNewM(n => ({ ...n, category: v as MeasurementCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_LABELS) as [MeasurementCategory, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{CATEGORY_ICONS[v]} {l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DimInputs
              w={newM.w} h={newM.h} d={newM.d}
              onW={w => setNewM(n => ({ ...n, w }))}
              onH={h => setNewM(n => ({ ...n, h }))}
              onD={d => setNewM(n => ({ ...n, d }))}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setAddingNew(false); setNewM({ label: '', category: 'other', w: '', h: '', d: '' }) }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={addMeasurement} disabled={!newM.label.trim()}>
                Guardar
              </Button>
            </div>
          </div>
        )}

        {measurements.length === 0 && !addingNew ? (
          <div className="bg-card border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">Sin medidas registradas</p>
            <Button size="sm" onClick={() => setAddingNew(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir primer elemento
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {(Object.entries(grouped) as [MeasurementCategory, Measurement[]][]).map(([cat, items]) => (
              <div key={cat} className="bg-card border border-border overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border">
                  <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                {/* Measurement rows */}
                {items.map((m, i) => (
                  <div key={m.id} className={cn('px-4 py-3', i < items.length - 1 && 'border-b border-border')}>
                    {editing?.id === m.id ? (
                      /* Edit mode */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            value={editing.label}
                            onChange={e => setEditing(ed => ed ? { ...ed, label: e.target.value } : ed)}
                            className="text-sm"
                          />
                          <Select
                            value={editing.category}
                            onValueChange={v => setEditing(ed => ed ? { ...ed, category: v as MeasurementCategory } : ed)}
                          >
                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.entries(CATEGORY_LABELS) as [MeasurementCategory, string][]).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{CATEGORY_ICONS[v]} {l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DimInputs
                          w={editing.w} h={editing.h} d={editing.d}
                          onW={w => setEditing(ed => ed ? { ...ed, w } : ed)}
                          onH={h => setEditing(ed => ed ? { ...ed, h } : ed)}
                          onD={d => setEditing(ed => ed ? { ...ed, d } : ed)}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" onClick={saveMeasurement}><Check className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{m.label}</p>
                          <DimDisplay w={m.width_cm} h={m.height_cm} d={m.depth_cm} />
                        </div>
                        <button
                          onClick={() => setEditing({ id: m.id, label: m.label, category: m.category as MeasurementCategory, w: m.width_cm?.toString() ?? '', h: m.height_cm?.toString() ?? '', d: m.depth_cm?.toString() ?? '' })}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteMeasurement(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DimInputs({ w, h, d, onW, onH, onD }: { w: string; h: string; d: string; onW: (v: string) => void; onH: (v: string) => void; onD: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Ancho', val: w, set: onW },
        { label: 'Alto',  val: h, set: onH },
        { label: 'Fondo', val: d, set: onD },
      ].map(({ label, val, set }) => (
        <div key={label}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
          <div className="relative">
            <Input type="number" min="0" value={val} onChange={e => set(e.target.value)} placeholder="—" className="pr-8 h-8 text-sm" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">cm</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DimDisplay({ w, h, d }: { w: number | null; h: number | null; d: number | null }) {
  const parts = [
    w != null && `A: ${w} cm`,
    h != null && `H: ${h} cm`,
    d != null && `F: ${d} cm`,
  ].filter(Boolean)

  if (parts.length === 0) return <p className="text-xs text-muted-foreground italic">Sin medidas</p>
  return <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>
}
