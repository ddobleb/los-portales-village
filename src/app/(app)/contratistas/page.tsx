'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Contractor, ContractorSpecialty } from '@/lib/database.types'
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
import { Plus, Trash2, Phone, Mail, Globe, Star, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const SPECIALTY_LABELS: Record<ContractorSpecialty, string> = {
  plumber: 'Fontanero', electrician: 'Electricista', painter: 'Pintor',
  carpenter: 'Carpintero', architect: 'Arquitecto', interior_designer: 'Interiorista',
  builder: 'Constructor', roofer: 'Tejador', tiler: 'Alicatador',
  landscaper: 'Paisajista', hvac: 'Climatización', locksmith: 'Cerrajero',
  cleaner: 'Limpieza', other: 'Otro',
}

const SPECIALTY_ICONS: Record<ContractorSpecialty, string> = {
  plumber: '🔧', electrician: '⚡', painter: '🎨', carpenter: '🪚',
  architect: '📐', interior_designer: '🛋️', builder: '🏗️', roofer: '🏠',
  tiler: '🟦', landscaper: '🌿', hvac: '❄️', locksmith: '🔑',
  cleaner: '🧹', other: '👷',
}

type FormData = { name: string; specialty: ContractorSpecialty; phone: string; email: string; website: string; notes: string; rating: string }
const emptyForm: FormData = { name: '', specialty: 'other', phone: '', email: '', website: '', notes: '', rating: '' }

export default function ContratistasPage() {
  const { household } = useAuth()
  const supabase = createClient()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Contractor }>({ open: false })
  const [form, setForm] = useState<FormData>(emptyForm)
  const [filterSpec, setFilterSpec] = useState<ContractorSpecialty | 'all'>('all')

  useEffect(() => { if (household) load() }, [household])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('contractors').select('*').eq('household_id', household!.id).order('name')
    setContractors((data ?? []) as Contractor[])
    setLoading(false)
  }

  function openAdd() { setForm(emptyForm); setDialog({ open: true }) }
  function openEdit(c: Contractor) {
    setForm({ name: c.name, specialty: c.specialty ?? 'other', phone: c.phone ?? '', email: c.email ?? '', website: c.website ?? '', notes: c.notes ?? '', rating: c.rating?.toString() ?? '' })
    setDialog({ open: true, editing: c })
  }

  async function save() {
    if (!form.name.trim()) return
    const payload = {
      household_id: household!.id,
      name: form.name.trim(),
      specialty: form.specialty,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      notes: form.notes || null,
      rating: form.rating ? parseInt(form.rating) : null,
    }
    if (dialog.editing) {
      const { error } = await supabase.from('contractors').update(payload).eq('id', dialog.editing.id)
      if (error) { toast.error('Error al guardar'); return }
      toast.success('Actualizado')
    } else {
      const { error } = await supabase.from('contractors').insert(payload)
      if (error) { toast.error('Error al añadir'); return }
      toast.success('Contratista añadido')
    }
    setDialog({ open: false })
    load()
  }

  async function del(id: string) {
    await supabase.from('contractors').delete().eq('id', id)
    setContractors(cs => cs.filter(c => c.id !== id))
  }

  const specialties = [...new Set(contractors.map(c => c.specialty).filter(Boolean))] as ContractorSpecialty[]
  const filtered = filterSpec === 'all' ? contractors : contractors.filter(c => c.specialty === filterSpec)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterSpec('all')} className={cn('px-3 py-1.5 text-xs font-semibold border transition-colors', filterSpec === 'all' ? 'bg-[var(--brand-terracota)] text-white border-transparent' : 'border-border text-muted-foreground')}>
            Todos ({contractors.length})
          </button>
          {specialties.map(s => (
            <button key={s} onClick={() => setFilterSpec(s)} className={cn('px-3 py-1.5 text-xs font-semibold border transition-colors', filterSpec === s ? 'bg-[var(--brand-terracota)] text-white border-transparent' : 'border-border text-muted-foreground')}>
              {SPECIALTY_ICONS[s]} {SPECIALTY_LABELS[s]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Añadir</Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border p-10 text-center">
          <p className="text-muted-foreground text-sm mb-3">Sin contratistas registrados</p>
          <Button size="sm" onClick={openAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Añadir contratista</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0 mt-0.5">{SPECIALTY_ICONS[c.specialty as ContractorSpecialty ?? 'other']}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{c.name}</p>
                    {c.specialty && <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5">{SPECIALTY_LABELS[c.specialty as ContractorSpecialty]}</span>}
                    {c.rating && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                        <Star className="h-3 w-3 fill-current" /> {c.rating}/5
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Phone className="h-3 w-3" />{c.phone}</a>}
                    {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Mail className="h-3 w-3" />{c.email}</a>}
                    {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Globe className="h-3 w-3" />Web</a>}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{c.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialog.open} onOpenChange={open => setDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{dialog.editing ? 'Editar contratista' : 'Nuevo contratista'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Especialidad</Label>
                <Select value={form.specialty} onValueChange={v => setForm(f => ({ ...f, specialty: v as ContractorSpecialty }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.entries(SPECIALTY_LABELS) as [ContractorSpecialty, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{SPECIALTY_ICONS[v]} {l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valoración (1-5)</Label>
                <Input type="number" min="1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="—" />
              </div>
            </div>
            <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="600 000 000" /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nombre@empresa.es" /></div>
            <div className="space-y-1"><Label>Web</Label><Input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Presupuesto, condiciones, referencias…" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Cancelar</Button>
            <Button onClick={save} disabled={!form.name.trim()}>{dialog.editing ? 'Guardar' : 'Añadir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

