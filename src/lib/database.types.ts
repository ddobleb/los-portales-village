// Tipos TypeScript generados para la base de datos de Supabase
// Actualizar cuando se modifique el schema ejecutando:
// npx supabase gen types typescript --project-id TU_PROJECT_ID > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type RoomType =
  | 'bedroom' | 'bathroom' | 'kitchen' | 'living_room' | 'dining_room'
  | 'hallway' | 'garage' | 'terrace' | 'garden' | 'office' | 'laundry'
  | 'storage' | 'other'

export type RoomStatus = 'pending' | 'in_progress' | 'done'

export type MeasurementCategory = 'door' | 'window' | 'wall' | 'floor' | 'ceiling' | 'radiator' | 'furniture' | 'fixture' | 'other'

export type TaskCategory =
  | 'plumbing' | 'electrical' | 'painting' | 'carpentry' | 'flooring'
  | 'tiling' | 'roofing' | 'insulation' | 'demolition' | 'furniture'
  | 'appliances' | 'cleaning' | 'garden' | 'other'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked' | 'cancelled'

export type ExpenseCategory =
  | 'materials' | 'labor' | 'appliances' | 'furniture' | 'tools'
  | 'permits' | 'design' | 'transport' | 'other'

export type ContractorSpecialty =
  | 'plumber' | 'electrician' | 'painter' | 'carpenter' | 'architect'
  | 'interior_designer' | 'builder' | 'roofer' | 'tiler' | 'landscaper'
  | 'hvac' | 'locksmith' | 'cleaner' | 'other'

export type EventType = 'visit' | 'delivery' | 'work' | 'milestone' | 'meeting' | 'other'

export type HouseholdRole = 'owner' | 'member'

// ──────────────────────────────────────────────
// Entidades principales
// ──────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

export interface Household {
  id: string
  name: string
  address: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: HouseholdRole
  joined_at: string
  // join
  profile?: Profile
}

export interface Zone {
  id: string
  household_id: string
  name: string
  sort_order: number
  created_at: string
  // computed
  rooms?: Room[]
}

export interface Room {
  id: string
  household_id: string
  zone_id: string | null
  name: string
  type: RoomType
  floor_sqm: number | null
  ceiling_height_cm: number | null
  description: string | null
  status: RoomStatus
  color: string
  sort_order: number
  created_at: string
  updated_at: string
  // computed
  tasks?: Task[]
  measurements?: Measurement[]
  photos?: Photo[]
}

export interface Measurement {
  id: string
  room_id: string
  category: MeasurementCategory
  label: string
  width_cm: number | null
  height_cm: number | null
  depth_cm: number | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface Photo {
  id: string
  household_id: string
  room_id: string | null
  task_id: string | null
  storage_path: string
  caption: string | null
  taken_at: string
  uploaded_by: string | null
  created_at: string
  // computed
  public_url?: string
}

export interface Task {
  id: string
  household_id: string
  zone_id: string | null
  room_id: string | null
  measurement_id: string | null
  title: string
  description: string | null
  category: TaskCategory | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  estimated_cost: number | null
  actual_cost: number | null
  assigned_to: string | null
  created_by: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // join
  room?: Pick<Room, 'id' | 'name' | 'color'>
  assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface Expense {
  id: string
  household_id: string
  task_id: string | null
  room_id: string | null
  amount: number
  currency: string
  category: ExpenseCategory | null
  description: string
  expense_date: string
  receipt_path: string | null
  created_by: string | null
  created_at: string
  // join
  task?: Pick<Task, 'id' | 'title'>
  room?: Pick<Room, 'id' | 'name'>
}

export interface HouseholdBudget {
  id: string
  household_id: string
  total_budget: number
  notes: string | null
  updated_at: string
}

export interface ShoppingItem {
  id: string
  household_id: string
  room_id: string | null
  task_id: string | null
  name: string
  quantity: number
  unit: string
  estimated_price: number | null
  actual_price: number | null
  store: string | null
  url: string | null
  notes: string | null
  purchased: boolean
  purchased_at: string | null
  purchased_by: string | null
  sort_order: number
  created_at: string
  // join
  room?: Pick<Room, 'id' | 'name' | 'color'>
}

export interface Contractor {
  id: string
  household_id: string
  name: string
  specialty: ContractorSpecialty | null
  phone: string | null
  email: string | null
  website: string | null
  notes: string | null
  rating: number | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  household_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  event_type: EventType
  room_id: string | null
  contractor_id: string | null
  task_id: string | null
  created_by: string | null
  created_at: string
  // join
  room?: Pick<Room, 'id' | 'name'>
  contractor?: Pick<Contractor, 'id' | 'name'>
}
