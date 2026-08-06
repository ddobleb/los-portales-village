'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { ShoppingItem, Room } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'pending' | 'purchased'

function formatCur(n: number | null) {
  if (!n) return ''
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function ComprasPage() {
  const { household } = useAuth()
  const supabase = createClient()

  const [items, setItems] = useState<ShoppingItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '1', unit: 'ud', estimated_price: '', store: '', url: '', room_id: '' })

  useEffect(() => { if (household) load() }, [household])

  async function load() {
    setLoading(true)
    const [itemsRes, roomsRes] = await Promise.all([
      supabase.from('shopping_items').select('*').eq('household_id', household!.id).order('sort_order').order('created_at', { ascending: false }),
      supabase.from('rooms').select('id, name').eq('household_id', household!.id).order('name'),
    ])
    setItems((itemsRes.data ?? []) as ShoppingItem[])
    setRooms((roomsRes.data ?? []) as Room[])
    setLoading(false)
  }

  const filtered = items.filter(i => filter === 'all' ? true : filter === 'pending' ? !i.purchased : i.purchased)
  const pendingCount = items.filter(i => !i.purchased).length
  const pendingTotal = items.filter(i => !i.purchased).reduce((s, i) => s + (i.estimated_price ?? 0), 0)

  async function toggle(item: ShoppingItem) {
    const purchased = !item.purchased
    await supabase.from('shopping_items').update({ purchased, purchased_at: purchased ? new Date().toISOString() : null }).eq('id', item.id)
    setItems(its => its.map(i => i.id === item.id ? { ...i, purchased, purchased_at: purchased ? new Date().toISOString() : null } : i))
  }

  async function addItem() {
    if (!form.name.trim()) return
    const { error } = await supabase.from('shopping_items').insert({
      household_id: household!.id,
      name: form.name.trim(),
      quantity: parseFloat(form.quantity) || 1,
      unit: form.unit || 'ud',
      estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
      store: form.store || null,
      url: form.url || null,
      room_id: form.room_id || null,
      purchased: false,
      sort_order: items.length,
    })
    if (error) { toast.error('Error al añadir'); return }
    toast.success('Añadido a la lista')
    setDialog(false)
    setForm({ name: '', quantity: '1', unit: 'ud', estimated_price: '', store: '', url: '', room_id: '' })
    load()
  }

  async function deleteItem(id: string) {
    await supabase.from('shopping_items').delete().eq('id', id)
    setItems(its => its.filter(i => i.id !== id))
  }

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'purchased', label: 'Comprados' },
    { value: 'all', label: 'Todos' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 bg-card border border-border">
        <div className="p-4 border-r border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Por comprar</p>
          <p className="text-3xl font-black">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">artículos pendientes</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Coste estimado</p>
          <p className="text-3xl font-black">{pendingTotal > 0 ? formatCur(pendingTotal) : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">artículos pendientes</p>
        </div>
      </div>

      {/* Filtros + añadir */}
      <div className="flex gap-2 items-center">
        <div className="flex gap-1 flex-1">
          {FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter(value)} className={cn(
              'px-3 py-1.5 text-xs font-semibold border transition-colors',
              filter === value ? 'bg-[var(--brand-terracota)] text-white border-transparent' : 'border-border text-muted-foreground hover:border-foreground/30'
            )}>{label}</button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Añadir</Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          {filter === 'pending' ? '¡Lista vacía! Añade lo que necesitas.' : 'Sin artículos en este estado.'}
        </p>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {filtered.map(item => {
            const room = rooms.find(r => r.id === item.room_id)
            return (
              <div key={item.id} className={cn('flex items-center gap-3 px-4 py-3', item.purchased && 'opacity-60')}>
                {/* Check */}
                <button onClick={() => toggle(item)} className={cn(
                  'w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors',
                  item.purchased ? 'bg-[var(--brand-terracota)] border-[var(--brand-terracota)]' : 'border-border'
                )}>
                  {item.purchased && <Check className="h-3 w-3 text-white" />}
                </button>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', item.purchased && 'line-through')}>{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit}
                    {room && ` · ${room.name}`}
                    {item.store && ` · ${item.store}`}
                  </p>
                </div>
                {/* Precio + link */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.estimated_price && <span className="text-sm font-semibold">{formatCur(item.estimated_price)}</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo artículo</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Artículo</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Mampara ducha" autoFocus />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Cantidad</Label>
                <Input type="number" min="0.1" step="0.1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Unidad</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ud, m², kg" />
              </div>
              <div className="space-y-1">
                <Label>Precio (€)</Label>
                <Input type="number" min="0" step="0.01" value={form.estimated_price} onChange={e => setForm(f => ({ ...f, estimated_price: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tienda</Label>
                <Input value={form.store} onChange={e => setForm(f => ({ ...f, store: e.target.value }))} placeholder="Leroy Merlin…" />
              </div>
              <div className="space-y-1">
                <Label>Habitación</Label>
                <Select value={form.room_id || '__none'} onValueChange={v => setForm(f => ({ ...f, room_id: v === '__none' ? '' : (v ?? '') }))}>
                  <SelectTrigger><SelectValue placeholder="Sin hab." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin habitación</SelectItem>
                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL del producto</Label>
              <Input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={addItem} disabled={!form.name.trim()}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

