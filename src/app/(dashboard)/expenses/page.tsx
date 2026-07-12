import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ExpensesClient from '@/components/ExpensesClient'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const supabase = createClient()

  // Get current user
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (!user || userErr) {
    redirect('/login')
  }

  // Get user role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'driver'

  // Fetch fuel logs joined with vehicles
  const { data: fuelLogs } = await supabase
    .from('fuel_logs')
    .select('*, vehicles(name_model, registration_number)')
    .order('date', { ascending: false })

  // Fetch expenses joined with vehicles
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, vehicles(name_model, registration_number)')
    .order('date', { ascending: false })

  return (
    <ExpensesClient 
      initialFuelLogs={(fuelLogs || []) as any[]} 
      initialExpenses={(expenses || []) as any[]} 
      userRole={role} 
    />
  )
}
