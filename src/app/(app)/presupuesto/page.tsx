'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Expense, ExpenseCategory } from '@/lib/database.types'
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
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const CAT_LABELS: Record<ExpenseCategory, string> = {
  materials: 'Materiales', labor: 'Mano de obra', appliances: 'Electrodomésticos',
  furniture: 'Muebles', tools: 'Herramientas', permits: 'Permisos',
  design: 'Diseño', transport: 'Transporte', other: 'Otro',
}

const CAT_COLORS: Record<ExpenseCategory, string> = {
  materials: '#3b6ea0', labor: '#1d3454', appliances: '#6b7c3b',
  furniture: '#9b6b3a', tools: '#7c3b6b', permits: '#3b7c6b',
  design: '#6b3b7c', transport: '#7c6b3b', other: '#6b6b6b',
}

function formatCur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function PresupuestoPage() {
  const { household } = useAuth()
  const supabase = createClient()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [form, setForm] = useState({ description: '', amount: '', category: 'materials' as ExpenseCategory, date: new Date().toISOString().slice(0, 10) })

  useEffect(() => { if (household) load() }, [household])

  async function load() {
    setLoading(true)
    const [expRes, budRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('household_id', household!.id).order('expense_date', { ascending: false }),
      supabase.from('household_budget').select('total_budget').eq('household_id', household!.id).single(),
    ])
    setExpenses((expRes.data ?? []) as Expense[])
    setBudget(budRes.data?.total_budget ?? 0)
    setLoading(false)
  }

  const totalSpent = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const budgetPct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0

  // By category
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category ?? 'other'] = (acc[e.category ?? 'other'] ?? 0) + (e.amount ?? 0)
    return acc
  }, {})

  async function saveBudget() {
    const val = parseFloat(budgetInput)
    if (isNaN(val) || val < 0) return
    await supabase.from('household_budget').upsert({ household_id: household!.id, total_budget: val }, { onConflict: 'household_id' })
    setBudget(val)
    setEditingBudget(false)
  }

  async function addExpense() {
    if (!form.description.trim() || !form.amount) return
    const { error } = await supabase.from('expenses').insert({
      household_id: household!.id,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      expense_date: form.date,
    })
    if (error) { toast.error('Error al añadir gasto'); return }
    toast.success('Gasto añadido')
    setDialog(false)
    setForm({ description: '', amount: '', category: 'materials', date: new Date().toISOString().slice(0, 10) })
    load()
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(es => es.filter(e => e.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* KPI presupuesto */}
      <div className="grid grid-cols-2 bg-card border border-border">
        <div className="p-4 border-r border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Gastado</p>
          <p className="text-3xl font-black">{formatCur(totalSpent)}</p>
          {budget > 0 && <p className="text-xs text-muted-foreground mt-1">{Math.round(budgetPct)}% del presupuesto</p>}
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Presupuesto total</p>
          {editingBudget ? (
            <div className="flex gap-2 items-center mt-1">
              <Input value={budgetInput} onChange={e => setBudgetInput(e.target.value)} type="number" className="h-8 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && saveBudget()} />
              <Button size="sm" onClick={saveBudget}>✓</Button>
            </div>
          ) : (
            <button onClick={() => { setBudgetInput(budget.toString()); setEditingBudget(true) }} className="text-left">
              <p className="text-3xl font-black">{budget > 0 ? formatCur(budget) : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Toca para editar</p>
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {budget > 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted w-full">
            <div
              className={cn('h-full transition-all', budgetPct > 85 ? 'bg-red-500' : 'bg-[var(--brand-terracota)]')}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          {budget > totalSpent && (
            <p className="text-xs text-muted-foreground text-right">Resta: {formatCur(budget - totalSpent)}</p>
          )}
        </div>
      )}

      {/* Por categoría */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Por categoría</h3>
          </div>
          <div className="divide-y divide-border">
            {(Object.entries(byCategory) as [ExpenseCategory, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: CAT_COLORS[cat] }} />
                  <span className="text-sm flex-1">{CAT_LABELS[cat]}</span>
                  <span className="text-sm font-semibold">{formatCur(total)}</span>
                  {budget > 0 && <span className="text-xs text-muted-foreground w-10 text-right">{Math.round((total / budget) * 100)}%</span>}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Lista gastos */}
      <div className="bg-card border border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Gastos ({expenses.length})</h3>
          <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Añadir</Button>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse" />)}</div>
        ) : expenses.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Sin gastos registrados</p>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 shrink-0" style={{ backgroundColor: CAT_COLORS[e.category as ExpenseCategory ?? 'other'] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{CAT_LABELS[e.category as ExpenseCategory ?? 'other']} · {format(new Date(e.expense_date), 'd MMM yyyy', { locale: es })}</p>
                </div>
                <span className="text-sm font-bold shrink-0">{formatCur(e.amount)}</span>
                <button onClick={() => deleteExpense(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog nuevo gasto */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Azulejos baño" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Importe (€)</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.entries(CAT_LABELS) as [ExpenseCategory, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={addExpense} disabled={!form.description.trim() || !form.amount}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

