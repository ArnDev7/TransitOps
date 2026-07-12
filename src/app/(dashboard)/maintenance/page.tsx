import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MaintenanceClient from '@/components/MaintenanceClient'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
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

  // Fetch all maintenance logs joined with vehicles
  const { data: logs } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      vehicles ( name_model, registration_number, status )
    `)
    .order('created_at', { ascending: false })

  return (
    <MaintenanceClient 
      initialLogs={(logs || []) as any[]} 
      userRole={role} 
    />
  )
}
