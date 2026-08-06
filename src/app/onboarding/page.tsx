'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hammer, Home } from 'lucide-react'
import { toast } from 'sonner'

export default function OnboardingPage() {
  const [householdName, setHouseholdName] = useState('Los Portales Village')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!householdName.trim()) { toast.error('Escribe el nombre de tu hogar'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesión expirada'); return }

    // Crear hogar
    const { data: household, error: hErr } = await supabase
      .from('households')
      .insert({ name: householdName.trim(), address: address.trim() || null, created_by: user.id })
      .select()
      .single()

    if (hErr || !household) {
      toast.error('Error al crear el hogar: ' + hErr?.message)
      setLoading(false)
      return
    }

    // Añadir usuario como owner
    const { error: mErr } = await supabase
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id, role: 'owner' })

    if (mErr) {
      toast.error('Error al configurar el hogar')
      setLoading(false)
      return
    }

    // Crear presupuesto inicial
    await supabase
      .from('household_budget')
      .insert({ household_id: household.id, total_budget: 0 })

    toast.success('¡Hogar creado! Bienvenido a tu reforma')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-terracota)] text-white shadow-lg">
            <Hammer className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--brand-terracota)]">¡Bienvenido!</h1>
          <p className="text-sm text-muted-foreground">
            Vamos a configurar tu proyecto de reforma
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-[var(--brand-terracota)]" />
              Crear tu hogar
            </CardTitle>
            <CardDescription>
              Dale un nombre a tu proyecto. Después podrás invitar a tu familia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Nombre del proyecto *</Label>
                <Input
                  id="household-name"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  placeholder="Los Portales Village"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección (opcional)</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Calle Mayor, 1 · 28001 Madrid"
                  rows={2}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[var(--brand-terracota)] hover:bg-[var(--brand-terracota-dark)]"
                disabled={loading}
              >
                {loading ? 'Creando…' : 'Empezar mi reforma'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
