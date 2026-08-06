'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Zone, Room, RoomType, RoomStatus } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Plus, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight,
  Layers, Wand2, ChevronRight as ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  bedroom: 'Dormitorio', bathroom: 'Baño', kitchen: 'Cocina',
  living_room: 'Salón', dining_room: 'Comedor', hallway: 'Pasillo',
  garage: 'Garaje', terrace: 'Terraza', garden: 'Jardín',
  office: 'Despacho', laundry: 'Lavadero', storage: 'Trastero', other: 'Otro',
}

const STATUS_CONFIG: Record<RoomStatus, { label: string; className: string }> = {
  pending:     { label: 'Pendiente', className: 'border-border text-muted-foreground' },
  in_progress: { label: 'En obra',   className: 'border-[var(--brand-terracota)] text-[var(--brand-terracota)]' },
  done:        { label: 'Terminada', className: 'bg-[var(--brand-terracota)] text-white border-transparent' },
}

type ZoneWithRooms = Zone & { rooms: Room[] }

export default function HabitacionesPage() {
  const { household } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [zones, setZones] = useState<ZoneWithRooms[]>([])
  const [unzoned, setUnzoned] = useState<Room[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [zoneDialog, setZoneDialog] = useState<{ open: boolean; editing?: Zone }>({ open: false })
  const [roomDialog, setRoomDialog] = useState<{ open: boolean; zoneId?: string | null; editing?: Room }>({ open: false })
  const [zoneName, setZoneName] = useState('')
  const [roomForm, setRoomForm] = useState({ name: '', type: 'other' as RoomType, status: 'pending' as RoomStatus })

  useEffect(() => {
    if (household) load()
  }, [household])

  async function load() {
    setLoading(true)
    const [zonesRes, roomsRes] = await Promise.all([
      supabase.from('zones').select('*').eq('household_id', household!.id).order('sort_order').order('created_at'),
      supabase.from('rooms').select('*').eq('household_id', household!.id).order('sort_order').order('name'),
    ])
    if (zonesRes.error) toast.error('Error cargando zonas')
    if (roomsRes.error) toast.error('Error cargando habitaciones')

    const allRooms = (roomsRes.data ?? []) as Room[]
    const allZones = (zonesRes.data ?? []) as Zone[]

    const zoneMap = new Map<string, Room[]>()
    allZones.forEach(z => zoneMap.set(z.id, []))
    const noZone: Room[] = []
    allRooms.forEach(r => {
      if (r.zone_id && zoneMap.has(r.zone_id)) zoneMap.get(r.zone_id)!.push(r)
      else noZone.push(r)
    })

    setZones(allZones.map(z => ({ ...z, rooms: zoneMap.get(z.id) ?? [] })))
    setUnzoned(noZone)
    setLoading(false)
  }

  function toggleCollapse(id: string) {
    setCollapsed(c => ({ ...c, [id]: !c[id] }))
  }

  // ── Zones CRUD ──────────────────────────────────────
  function openNewZone() { setZoneName(''); setZoneDialog({ open: true }) }
  function openEditZone(z: Zone) { setZoneName(z.name); setZoneDialog({ open: true, editing: z }) }

  async function saveZone() {
    if (!zoneName.trim()) return
    if (zoneDialog.editing) {
      const { error } = await supabase.from('zones').update({ name: zoneName.trim() }).eq('id', zoneDialog.editing.id)
      if (error) { toast.error('Error al renombrar'); return }
      toast.success('Zona renombrada')
    } else {
      const { error } = await supabase.from('zones').insert({ household_id: household!.id, name: zoneName.trim(), sort_order: zones.length })
      if (error) { toast.error('Error al crear zona'); return }
      toast.success('Zona creada')
    }
    setZoneDialog({ open: false })
    load()
  }

  async function deleteZone(z: Zone) {
    if (z.rooms && z.rooms.length > 0) {
      toast.error('Mueve o elimina las habitaciones primero')
      return
    }
    const { error } = await supabase.from('zones').delete().eq('id', z.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Zona eliminada')
    load()
  }

  // ── Rooms CRUD ──────────────────────────────────────
  function openNewRoom(zoneId?: string | null) {
    setRoomForm({ name: '', type: 'other', status: 'pending' })
    setRoomDialog({ open: true, zoneId })
  }
  function openEditRoom(r: Room) {
    setRoomForm({ name: r.name, type: r.type, status: r.status })
    setRoomDialog({ open: true, zoneId: r.zone_id, editing: r })
  }

  async function saveRoom() {
    if (!roomForm.name.trim()) return
    const payload = {
      name: roomForm.name.trim(),
      type: roomForm.type,
      status: roomForm.status,
      zone_id: roomDialog.zoneId ?? null,
      household_id: household!.id,
    }
    if (roomDialog.editing) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', roomDialog.editing.id)
      if (error) { toast.error('Error al guardar'); return }
      toast.success('Habitación actualizada')
    } else {
      const { error } = await supabase.from('rooms').insert(payload)
      if (error) { toast.error('Error al crear habitación'); return }
      toast.success('Habitación creada')
    }
    setRoomDialog({ open: false })
    load()
  }

  async function deleteRoom(r: Room) {
    const { error } = await supabase.from('rooms').delete().eq('id', r.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Habitación eliminada')
    load()
  }

  if (!household) return null

  const totalRooms = zones.reduce((s, z) => s + z.rooms.length, 0) + unzoned.length

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-terracota)]">Habitaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalRooms} habitaciones · {zones.length} zonas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openNewZone}>
            <Layers className="h-4 w-4 mr-1.5" /> Nueva zona
          </Button>
          <Button variant="outline" size="sm" onClick={() => openNewRoom(null)}>
            <Plus className="h-4 w-4 mr-1.5" /> Rápida
          </Button>
          <Button size="sm" onClick={() => router.push('/habitaciones/nuevo')}>
            <Wand2 className="h-4 w-4 mr-1.5" /> Wizard
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {/* Zonas con sus habitaciones */}
          {zones.map(zone => (
            <div key={zone.id} className="rounded-xl border bg-card overflow-hidden">
              {/* Cabecera zona */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b">
                <button
                  onClick={() => toggleCollapse(zone.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {collapsed[zone.id]
                    ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold text-sm">{zone.name}</span>
                  <span className="text-xs text-muted-foreground">({zone.rooms.length})</span>
                </button>
                <Button variant="ghost" size="icon-sm" onClick={() => openNewRoom(zone.id)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/habitaciones/nuevo?zoneId=${zone.id}`)}>
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center size-7 rounded-lg hover:bg-muted">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditZone(zone)}>
                      <Pencil className="h-4 w-4 mr-2" /> Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteZone(zone)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar zona
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Habitaciones de la zona */}
              {!collapsed[zone.id] && (
                <div>
                  {zone.rooms.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground italic">
                      Sin habitaciones aún.{' '}
                      <button onClick={() => openNewRoom(zone.id)} className="text-[var(--brand-terracota)] underline">
                        Añadir
                      </button>
                    </p>
                  )}
                  {zone.rooms.map((room, i) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      onEdit={openEditRoom}
                      onDelete={deleteRoom}
                      last={i === zone.rooms.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Sin zona */}
          {(unzoned.length > 0 || zones.length === 0) && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b">
                <button
                  onClick={() => toggleCollapse('__unzoned')}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {collapsed['__unzoned']
                    ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold text-sm text-muted-foreground">Sin zona</span>
                  <span className="text-xs text-muted-foreground">({unzoned.length})</span>
                </button>
                <Button variant="ghost" size="icon-sm" onClick={() => openNewRoom(null)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {!collapsed['__unzoned'] && (
                <div>
                  {unzoned.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground italic">Crea una zona para organizar tus habitaciones.</p>
                  )}
                  {unzoned.map((room, i) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      onEdit={openEditRoom}
                      onDelete={deleteRoom}
                      last={i === unzoned.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialog: zona */}
      <Dialog open={zoneDialog.open} onOpenChange={open => setZoneDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{zoneDialog.editing ? 'Renombrar zona' : 'Nueva zona'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="zone-name">Nombre</Label>
            <Input
              id="zone-name"
              value={zoneName}
              onChange={e => setZoneName(e.target.value)}
              placeholder="Ej: Planta baja, Planta alta, Jardín…"
              onKeyDown={e => e.key === 'Enter' && saveZone()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialog({ open: false })}>Cancelar</Button>
            <Button onClick={saveZone} disabled={!zoneName.trim()}>
              {zoneDialog.editing ? 'Guardar' : 'Crear zona'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: habitación */}
      <Dialog open={roomDialog.open} onOpenChange={open => setRoomDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{roomDialog.editing ? 'Editar habitación' : 'Nueva habitación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nombre</Label>
              <Input
                id="room-name"
                value={roomForm.name}
                onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Cocina, Dormitorio principal…"
                onKeyDown={e => e.key === 'Enter' && saveRoom()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={roomForm.type} onValueChange={v => setRoomForm(f => ({ ...f, type: v as RoomType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={roomForm.status} onValueChange={v => setRoomForm(f => ({ ...f, status: v as RoomStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CONFIG) as [RoomStatus, { label: string }][]).map(([v, c]) => (
                    <SelectItem key={v} value={v}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Zona selector */}
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select
                value={roomDialog.zoneId ?? '__none'}
                onValueChange={v => setRoomDialog(d => ({ ...d, zoneId: v === '__none' ? null : v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin zona</SelectItem>
                  {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialog({ open: false })}>Cancelar</Button>
            <Button onClick={saveRoom} disabled={!roomForm.name.trim()}>
              {roomDialog.editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RoomRow({ room, onEdit, onDelete, last }: {
  room: Room
  onEdit: (r: Room) => void
  onDelete: (r: Room) => void
  last: boolean
}) {
  const status = STATUS_CONFIG[room.status]
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', !last && 'border-b border-border')}>
      <Link href={`/habitaciones/${room.id}`} className="flex-1 min-w-0 group">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate group-hover:text-[var(--brand-terracota)] transition-colors">{room.name}</p>
            <p className="text-xs text-muted-foreground">{ROOM_TYPE_LABELS[room.type]}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
        </div>
      </Link>
      <span className={cn('text-[11px] font-medium px-2 py-0.5 border shrink-0', status.className)}>
        {status.label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center size-7 hover:bg-muted">
          <MoreVertical className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(room)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(room)}>
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

