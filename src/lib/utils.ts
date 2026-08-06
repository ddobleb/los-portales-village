import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function taskPriorityLabel(priority: string): string {
  const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' }
  return labels[priority] ?? priority
}

export function taskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente', in_progress: 'En curso', done: 'Hecho',
    blocked: 'Bloqueado', cancelled: 'Cancelado',
  }
  return labels[status] ?? status
}

export function roomStatusLabel(status: string): string {
  const labels: Record<string, string> = { pending: 'Pendiente', in_progress: 'En curso', done: 'Terminada' }
  return labels[status] ?? status
}

export function roomTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bedroom: 'Dormitorio', bathroom: 'Baño', kitchen: 'Cocina',
    living_room: 'Salón', dining_room: 'Comedor', hallway: 'Pasillo',
    garage: 'Garaje', terrace: 'Terraza', garden: 'Jardín', office: 'Despacho',
    laundry: 'Lavandería', storage: 'Trastero', other: 'Otro',
  }
  return labels[type] ?? type
}

export function measurementCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    door: 'Puerta', window: 'Ventana', wall: 'Pared', floor: 'Suelo',
    ceiling: 'Techo', radiator: 'Radiador', other: 'Otro',
  }
  return labels[cat] ?? cat
}

export function contractorSpecialtyLabel(specialty: string): string {
  const labels: Record<string, string> = {
    plumber: 'Fontanero', electrician: 'Electricista', painter: 'Pintor',
    carpenter: 'Carpintero', architect: 'Arquitecto', interior_designer: 'Interiorista',
    builder: 'Albañil', roofer: 'Tejador', tiler: 'Alicatador', landscaper: 'Jardinero',
    hvac: 'Climatización', locksmith: 'Cerrajero', cleaner: 'Limpieza', other: 'Otro',
  }
  return labels[specialty] ?? specialty
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    plumbing: 'Fontanería', electrical: 'Electricidad', painting: 'Pintura',
    carpentry: 'Carpintería', flooring: 'Suelos', tiling: 'Alicatado',
    roofing: 'Tejado', insulation: 'Aislamiento', demolition: 'Demolición',
    furniture: 'Muebles', appliances: 'Electrodomésticos', cleaning: 'Limpieza',
    garden: 'Jardín', other: 'Otro', materials: 'Materiales', labor: 'Mano de obra',
    tools: 'Herramientas', permits: 'Permisos', design: 'Diseño', transport: 'Transporte',
  }
  return labels[cat] ?? cat
}
