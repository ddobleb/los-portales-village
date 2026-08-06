import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberRes = await supabase
    .from('household_members')
    .select('household_id, households(id, name, address)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (memberRes.error || !memberRes.data) redirect('/onboarding')

  const householdId = memberRes.data.household_id

  const [roomsRes, tasksRes, expensesRes, budgetRes, shoppingRes] = await Promise.all([
    supabase.from('rooms').select('id, name, type, status, color').eq('household_id', householdId).order('sort_order'),
    supabase.from('tasks').select('id, title, priority, status, due_date, room_id').eq('household_id', householdId).neq('status', 'done').neq('status', 'cancelled').order('due_date', { ascending: true }).limit(10),
    supabase.from('expenses').select('amount').eq('household_id', householdId),
    supabase.from('household_budget').select('total_budget').eq('household_id', householdId).single(),
    supabase.from('shopping_items').select('id, purchased').eq('household_id', householdId),
  ])

  const rooms = roomsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const expenses = expensesRes.data ?? []
  const totalBudget = budgetRes.data?.total_budget ?? 0
  const shoppingItems = shoppingRes.data ?? []

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const roomsDone = rooms.filter(r => r.status === 'done').length
  const roomsInProgress = rooms.filter(r => r.status === 'in_progress').length
  const tasksDue = tasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }).length
  const shoppingPending = shoppingItems.filter(i => !i.purchased).length

  return (
    <DashboardClient
      rooms={rooms}
      pendingTasks={tasks}
      totalBudget={totalBudget}
      totalSpent={totalSpent}
      roomsDone={roomsDone}
      roomsInProgress={roomsInProgress}
      tasksDueThisWeek={tasksDue}
      shoppingPending={shoppingPending}
    />
  )
}
