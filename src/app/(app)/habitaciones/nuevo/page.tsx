'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Zone, RoomType, MeasurementCategory } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface MeasureItem {
  key: string
  category: MeasurementCategory
  label: string
  icon: string
  selected: boolean
  w: string // ancho cm
  h: string // alto cm
  d: string // fondo cm
}

// ── Presets por tipo de habitación ────────────────────────────────────────────
const PRESETS: Record<RoomType, Omit<MeasureItem, 'key'>[]> = {
  bedroom: [
    { category: 'door',      label: 'Puerta',           icon: '🚪', selected: true,  w: '90',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: true,  w: '120', h: '120', d: '' },
    { category: 'furniture', label: 'Cama',              icon: '🛏️', selected: true,  w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Armario',           icon: '🗄️', selected: false, w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Mesita de noche',   icon: '🪑', selected: false, w: '',    h: '',    d: '' },
    { category: 'radiator',  label: 'Radiador',          icon: '🔥', selected: false, w: '',    h: '',    d: '' },
  ],
  bathroom: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '70',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: false, w: '',    h: '',    d: '' },
    { category: 'fixture',   label: 'Ducha',             icon: '🚿', selected: true,  w: '',    h: '',    d: '' },
    { category: 'fixture',   label: 'Bañera',            icon: '🛁', selected: false, w: '170', h: '60',  d: '75' },
    { category: 'fixture',   label: 'Lavabo',            icon: '🪠', selected: true,  w: '60',  h: '50',  d: '45' },
    { category: 'fixture',   label: 'Inodoro',           icon: '🚽', selected: true,  w: '40',  h: '40',  d: '70' },
    { category: 'wall',      label: 'Pared alicatado',   icon: '🧱', selected: false, w: '',    h: '',    d: '' },
  ],
  kitchen: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '80',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: true,  w: '',    h: '',    d: '' },
    { category: 'fixture',   label: 'Encimera',          icon: '🍳', selected: true,  w: '',    h: '85',  d: '60' },
    { category: 'fixture',   label: 'Fregadero',         icon: '🚰', selected: true,  w: '60',  h: '50',  d: '50' },
    { category: 'wall',      label: 'Salpicadero',       icon: '🧱', selected: false, w: '',    h: '',    d: '' },
    { category: 'fixture',   label: 'Campana extractor', icon: '💨', selected: false, w: '60',  h: '50',  d: '50' },
  ],
  living_room: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '80',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: true,  w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Sofá',              icon: '🛋️', selected: false, w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Hueco TV',          icon: '📺', selected: false, w: '',    h: '',    d: '' },
    { category: 'radiator',  label: 'Radiador',          icon: '🔥', selected: false, w: '',    h: '',    d: '' },
  ],
  dining_room: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '80',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: false, w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Mesa comedor',      icon: '🪑', selected: false, w: '',    h: '',    d: '' },
  ],
  hallway: [
    { category: 'door',      label: 'Puerta entrada',    icon: '🚪', selected: true,  w: '90',  h: '210', d: '' },
    { category: 'wall',      label: 'Pared principal',   icon: '🧱', selected: false, w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Zapatero',          icon: '👟', selected: false, w: '',    h: '',    d: '' },
  ],
  garage: [
    { category: 'door',      label: 'Puerta garaje',     icon: '🚗', selected: true,  w: '',    h: '',    d: '' },
    { category: 'door',      label: 'Puerta paso',       icon: '🚪', selected: false, w: '80',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: false, w: '',    h: '',    d: '' },
  ],
  terrace: [
    { category: 'door',      label: 'Puerta/ventanal',   icon: '🚪', selected: true,  w: '',    h: '',    d: '' },
    { category: 'floor',     label: 'Suelo terraza',     icon: '🏠', selected: true,  w: '',    h: '',    d: '' },
    { category: 'wall',      label: 'Barandilla',        icon: '🧱', selected: false, w: '',    h: '',    d: '' },
  ],
  garden: [
    { category: 'door',      label: 'Puerta jardín',     icon: '🚪', selected: false, w: '',    h: '',    d: '' },
    { category: 'floor',     label: 'Zona césped',       icon: '🌿', selected: false, w: '',    h: '',    d: '' },
  ],
  office: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '80',  h: '210', d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: true,  w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Mesa escritorio',   icon: '💻', selected: false, w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Librería/estantes', icon: '📚', selected: false, w: '',    h: '',    d: '' },
  ],
  laundry: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '70',  h: '210', d: '' },
    { category: 'fixture',   label: 'Lavadora',          icon: '🫧', selected: true,  w: '60',  h: '85',  d: '60' },
    { category: 'fixture',   label: 'Secadora',          icon: '🌀', selected: false, w: '60',  h: '85',  d: '60' },
    { category: 'fixture',   label: 'Fregadero',         icon: '🚰', selected: false, w: '',    h: '',    d: '' },
  ],
  storage: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: true,  w: '70',  h: '210', d: '' },
    { category: 'wall',      label: 'Pared estantes',    icon: '🧱', selected: false, w: '',    h: '',    d: '' },
    { category: 'furniture', label: 'Armario/estante',   icon: '🗄️', selected: false, w: '',    h: '',    d: '' },
  ],
  other: [
    { category: 'door',      label: 'Puerta',            icon: '🚪', selected: false, w: '',    h: '',    d: '' },
    { category: 'window',    label: 'Ventana',           icon: '🪟', selected: false, w: '',    h: '',    d: '' },
  ],
}

const ROOM_TYPES: { type: RoomType; label: string; icon: string }[] = [
  { type: 'living_room',  label: 'Salón',         icon: '🛋️' },
  { type: 'kitchen',      label: 'Cocina',        icon: '🍳' },
  { type: 'bedroom',      label: 'Dormitorio',    icon: '🛏️' },
  { type: 'bathroom',     label: 'Baño',          icon: '🚿' },
  { type: 'dining_room',  label: 'Comedor',       icon: '🪑' },
  { type: 'hallway',      label: 'Pasillo',       icon: '🚶' },
  { type: 'office',       label: 'Despacho',      icon: '💻' },
  { type: 'laundry',      label: 'Lavadero',      icon: '🫧' },
  { type: 'storage',      label: 'Trastero',      icon: '📦' },
  { type: 'terrace',      label: 'Terraza',       icon: '☀️' },
  { type: 'garden',       label: 'Jardín',        icon: '🌿' },
  { type: 'garage',       label: 'Garaje',        icon: '🚗' },
  { type: 'other',        label: 'Otro',          icon: '🏠' },
]

const CAT_LABEL: Record<MeasurementCategory, string> = {
  door: 'Puerta', window: 'Ventana', wall: 'Pared', floor: 'Suelo',
  ceiling: 'Techo', radiator: 'Radiador', furniture: 'Mueble',
  fixture: 'Instalación', other: 'Otro',
}

const STEPS = ['Tipo', 'Habitación', 'Medidas', 'Listo']

// ── Wizard page ───────────────────────────────────────────────────────────────
export default function NuevoWizardPage() {
  const { household } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [selectedType, setSelectedType] = useState<RoomType | null>(null)

  // Step 2
  const [roomName, setRoomName] = useState('')
  const [floorSqm, setFloorSqm] = useState('')
  const [ceilingCm, setCeilingCm] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState<string | null>(searchParams.get('zoneId'))
  const [newZoneName, setNewZoneName] = useState('')
  const [zoneMode, setZoneMode] = useState<'existing' | 'new' | 'none'>(
    searchParams.get('zoneId') ? 'existing' : 'existing'
  )

  // Step 3
  const [items, setItems] = useState<MeasureItem[]>([])
  const [newItemLabel, setNewItemLabel] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)

  useEffect(() => {
    if (household) loadZones()
  }, [household])

  async function loadZones() {
    const { data } = await supabase.from('zones').select('*').eq('household_id', household!.id).order('sort_order')
    setZones(data ?? [])
    if (!searchParams.get('zoneId') && data && data.length > 0) {
      setZoneId(data[0].id)
    }
  }

  // When type is selected, populate items
  function selectType(t: RoomType) {
    setSelectedType(t)
    const label = ROOM_TYPES.find(r => r.type === t)?.label ?? t
    setRoomName(label)
    setItems(PRESETS[t].map((p, i) => ({ ...p, key: `${t}-${i}` })))
  }

  function next() {
    if (step === 0 && !selectedType) { toast.error('Selecciona un tipo'); return }
    if (step === 1 && !roomName.trim()) { toast.error('Escribe el nombre'); return }
    setStep(s => s + 1)
  }
  function back() { setStep(s => s - 1) }

  // Items helpers
  function toggleItem(key: string) {
    setItems(its => its.map(i => i.key === key ? { ...i, selected: !i.selected } : i))
  }
  function updateItem(key: string, field: 'w' | 'h' | 'd', val: string) {
    setItems(its => its.map(i => i.key === key ? { ...i, [field]: val } : i))
  }
  function removeItem(key: string) {
    setItems(its => its.filter(i => i.key !== key))
  }
  function addCustomItem() {
    if (!newItemLabel.trim()) return
    setItems(its => [...its, {
      key: `custom-${Date.now()}`,
      category: 'other',
      label: newItemLabel.trim(),
      icon: '📏',
      selected: true,
      w: '', h: '', d: '',
    }])
    setNewItemLabel('')
    setAddingCustom(false)
  }

  async function save() {
    if (!household) return
    setSaving(true)

    try {
      // 1. Resolve zone
      let resolvedZoneId: string | null = null
      if (zoneMode === 'existing') {
        resolvedZoneId = zoneId
      } else if (zoneMode === 'new' && newZoneName.trim()) {
        const { data, error } = await supabase
          .from('zones')
          .insert({ household_id: household.id, name: newZoneName.trim(), sort_order: zones.length })
          .select().single()
        if (error) { toast.error('Error al crear zona'); setSaving(false); return }
        resolvedZoneId = data.id
      }

      // 2. Create room
      const { data: room, error: rErr } = await supabase
        .from('rooms')
        .insert({
          household_id: household.id,
          name: roomName.trim(),
          type: selectedType!,
          zone_id: resolvedZoneId,
          floor_sqm: floorSqm ? parseFloat(floorSqm) : null,
          ceiling_height_cm: ceilingCm ? parseInt(ceilingCm) : null,
          status: 'pending',
        })
        .select().single()

      if (rErr || !room) { toast.error('Error al crear habitación'); setSaving(false); return }

      // 3. Save measurements
      const measurements = items
        .filter(i => i.selected)
        .map((i, idx) => ({
          room_id: room.id,
          category: i.category,
          label: i.label,
          width_cm: i.w ? parseFloat(i.w) : null,
          height_cm: i.h ? parseFloat(i.h) : null,
          depth_cm: i.d ? parseFloat(i.d) : null,
          sort_order: idx,
        }))

      if (measurements.length > 0) {
        const { error: mErr } = await supabase.from('measurements').insert(measurements)
        if (mErr) toast.warning('Habitación creada pero error en medidas')
      }

      setStep(3) // success
    } catch {
      toast.error('Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const selectedItems = items.filter(i => i.selected)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[var(--brand-terracota)]">Nueva habitación</h1>
          <p className="text-xs text-muted-foreground">Configura y registra todas las medidas</p>
        </div>
      </div>

      {/* Step indicator */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.slice(0, 3).map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors',
                i < step ? 'bg-[var(--brand-terracota)] text-white'
                  : i === step ? 'bg-[var(--brand-terracota)] text-white ring-4 ring-[var(--brand-terracota)]/20'
                  : 'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('text-xs font-medium hidden sm:block',
                i === step ? 'text-[var(--brand-terracota)]' : 'text-muted-foreground'
              )}>{label}</span>
              {i < 2 && <div className={cn('h-px w-6 sm:w-10', i < step ? 'bg-[var(--brand-terracota)]' : 'bg-border')} />}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 0: Tipo ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-1">¿Qué tipo de habitación es?</h2>
            <p className="text-sm text-muted-foreground">Elegiremos los elementos típicos para registrar</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {ROOM_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => selectType(type)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center',
                  selectedType === type
                    ? 'border-[var(--brand-terracota)] bg-[var(--brand-terracota)]/5'
                    : 'border-border hover:border-[var(--brand-terracota)]/40 hover:bg-muted/50'
                )}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={next} disabled={!selectedType}>
              Siguiente <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Nombre + zona + dimensiones ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold mb-1">Nombre y ubicación</h2>
            <p className="text-sm text-muted-foreground">¿Cómo se llama y en qué zona está?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-name">Nombre de la habitación</Label>
            <Input
              id="room-name"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="Ej: Cocina, Dormitorio principal…"
              autoFocus
            />
          </div>

          {/* Zona */}
          <div className="space-y-3">
            <Label>Zona / Planta</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setZoneMode('none')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  zoneMode === 'none' ? 'bg-[var(--brand-terracota)] text-white border-transparent' : 'border-border hover:bg-muted'
                )}
              >Sin zona</button>
              {zones.map(z => (
                <button
                  key={z.id}
                  onClick={() => { setZoneMode('existing'); setZoneId(z.id) }}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    zoneMode === 'existing' && zoneId === z.id
                      ? 'bg-[var(--brand-terracota)] text-white border-transparent'
                      : 'border-border hover:bg-muted'
                  )}
                >{z.name}</button>
              ))}
              <button
                onClick={() => setZoneMode('new')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  zoneMode === 'new' ? 'bg-[var(--brand-terracota)] text-white border-transparent' : 'border-border hover:bg-muted'
                )}
              >+ Nueva zona</button>
            </div>
            {zoneMode === 'new' && (
              <Input
                value={newZoneName}
                onChange={e => setNewZoneName(e.target.value)}
                placeholder="Ej: Planta alta, Azotea, Garaje…"
                autoFocus
              />
            )}
          </div>

          {/* Dimensiones generales */}
          <div className="space-y-2">
            <Label>Dimensiones generales <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Superficie (m²)</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={floorSqm}
                    onChange={e => setFloorSqm(e.target.value)}
                    placeholder="0.0"
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m²</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Altura del techo (cm)</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={ceilingCm}
                    onChange={e => setCeilingCm(e.target.value)}
                    placeholder="250"
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1.5" /> Atrás</Button>
            <Button onClick={next} disabled={!roomName.trim()}>
              Siguiente <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Medidas ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-1">Elementos y medidas</h2>
            <p className="text-sm text-muted-foreground">Activa los que quieras medir y rellena las dimensiones que conozcas</p>
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <MeasureRow
                key={item.key}
                item={item}
                onToggle={() => toggleItem(item.key)}
                onChange={(field, val) => updateItem(item.key, field, val)}
                onRemove={() => removeItem(item.key)}
              />
            ))}
          </div>

          {/* Add custom */}
          {addingCustom ? (
            <div className="flex gap-2">
              <Input
                value={newItemLabel}
                onChange={e => setNewItemLabel(e.target.value)}
                placeholder="Nombre del elemento (ej: Columna, Hueco escalera…)"
                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                autoFocus
              />
              <Button size="sm" onClick={addCustomItem} disabled={!newItemLabel.trim()}>Añadir</Button>
              <Button size="sm" variant="outline" onClick={() => { setAddingCustom(false); setNewItemLabel('') }}>✕</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingCustom(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Añadir elemento personalizado
            </Button>
          )}

          <div className="rounded-xl bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
            <strong className="text-foreground">{selectedItems.length}</strong> elementos seleccionados · Las medidas en blanco se guardan igualmente para rellenar después
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1.5" /> Atrás</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : <><Check className="h-4 w-4 mr-1.5" /> Guardar habitación</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Éxito ── */}
      {step === 3 && (
        <div className="text-center py-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{roomName} creada</h2>
            <p className="text-muted-foreground text-sm">
              {selectedItems.length} elementos registrados
              {floorSqm && ` · ${floorSqm} m²`}
              {ceilingCm && ` · ${ceilingCm} cm de techo`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setStep(0); setSelectedType(null); setRoomName(''); setFloorSqm('');
                setCeilingCm(''); setItems([]); setZoneMode('existing');
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Añadir otra habitación
            </Button>
            <Button variant="outline" onClick={() => router.push('/habitaciones')}>
              Ver todas las habitaciones
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-component: fila de medida ─────────────────────────────────────────────
function MeasureRow({ item, onToggle, onChange, onRemove }: {
  item: MeasureItem
  onToggle: () => void
  onChange: (field: 'w' | 'h' | 'd', val: string) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(item.selected)

  function toggle() {
    onToggle()
    setOpen(!item.selected)
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all overflow-hidden',
      item.selected ? 'border-[var(--brand-terracota)]/40 bg-[var(--brand-terracota)]/3' : 'border-border bg-card'
    )}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={toggle}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            item.selected ? 'bg-[var(--brand-terracota)] border-[var(--brand-terracota)]' : 'border-border'
          )}
        >
          {item.selected && <Check className="h-3 w-3 text-white" />}
        </button>
        <span className="text-lg leading-none">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground ml-2">{CAT_LABEL[item.category]}</span>
        </div>
        {item.selected && (
          <button onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground transition-colors">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dimension inputs */}
      {item.selected && open && (
        <div className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-3 gap-2">
            {[
              { field: 'w' as const, label: 'Ancho', placeholder: 'cm' },
              { field: 'h' as const, label: 'Alto', placeholder: 'cm' },
              { field: 'd' as const, label: 'Fondo', placeholder: 'cm' },
            ].map(({ field, label, placeholder }) => (
              <div key={field} className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={item[field]}
                    onChange={e => onChange(field, e.target.value)}
                    placeholder={placeholder}
                    className="h-8 text-sm pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">cm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
