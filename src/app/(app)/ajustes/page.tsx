'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LogOut, Copy, Check } from 'lucide-react'

const APP_VERSION = '0.2.0'

export default function AjustesPage() {
  const { user, profile, household, signOut } = useAuth()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [address, setAddress] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.full_name ?? '')
    if (household) { setHouseholdName(household.name ?? ''); setAddress(household.address ?? '') }
  }, [profile, household])

  async function saveProfile() {
    if (!user) return
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id)
    setSavingProfile(false)
    if (error) toast.error('Error al guardar')
    else toast.success('Perfil actualizado')
  }

  async function saveHousehold() {
    if (!household) return
    setSavingHousehold(true)
    const { error } = await supabase.from('households').update({ name: householdName.trim(), address: address.trim() || null }).eq('id', household.id)
    setSavingHousehold(false)
    if (error) toast.error('Error al guardar')
    else toast.success('Hogar actualizado')
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !household) return
    const token = crypto.randomUUID()
    const { error } = await supabase.from('invitations').insert({
      household_id: household.id,
      email: inviteEmail.trim(),
      token,
      invited_by: user?.id,
    })
    if (error) { toast.error('Error al crear invitación'); return }
    const link = `${window.location.origin}/onboarding?invite=${token}&email=${encodeURIComponent(inviteEmail.trim())}`
    await navigator.clipboard.writeText(link)
    setInviteCopied(true)
    setInviteEmail('')
    toast.success('Enlace de invitación copiado. Envíaselo al invitado.')
    setTimeout(() => setInviteCopied(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Perfil */}
      <div className="bg-card border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tu perfil</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--brand-terracota)] text-white flex items-center justify-center text-xl font-black shrink-0">
              {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{name || 'Sin nombre'}</p>
              <p>{user?.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nombre completo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60" />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile || !name.trim()} className="w-full">
            {savingProfile ? 'Guardando…' : 'Guardar perfil'}
          </Button>
        </div>
      </div>

      {/* Hogar */}
      {household && (
        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tu reforma</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <Label>Nombre del proyecto</Label>
              <Input value={householdName} onChange={e => setHouseholdName(e.target.value)} placeholder="Los Portales Village" />
            </div>
            <div className="space-y-1">
              <Label>Dirección <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, número, ciudad…" />
            </div>
            <Button onClick={saveHousehold} disabled={savingHousehold || !householdName.trim()} className="w-full">
              {savingHousehold ? 'Guardando…' : 'Guardar hogar'}
            </Button>
          </div>
        </div>
      )}

      {/* Invitar miembro */}
      {household && (
        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Invitar miembro</h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Genera un enlace de invitación para que otra persona acceda a <strong>{household.name}</strong>.
            </p>
            <div className="space-y-1">
              <Label>Email del invitado</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="familiar@email.com"
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
              />
            </div>
            <Button onClick={sendInvite} disabled={!inviteEmail.trim()} variant="outline" className="w-full">
              {inviteCopied
                ? <><Check className="h-4 w-4 mr-2 text-green-600" /> Enlace copiado</>
                : <><Copy className="h-4 w-4 mr-2" /> Generar y copiar enlace</>}
            </Button>
          </div>
        </div>
      )}

      {/* Cuenta */}
      <div className="bg-card border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cuenta</h2>
        </div>
        <div className="p-4">
          <Button variant="outline" onClick={signOut} className="w-full text-destructive border-destructive/30 hover:bg-destructive/5">
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </div>

      {/* Versión */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        Los Portales Village · v{APP_VERSION}
      </p>

    </div>
  )
}

