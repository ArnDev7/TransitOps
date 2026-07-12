import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import VehiclesClient from '@/components/VehiclesClient'

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
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

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <VehiclesClient 
      initialVehicles={(vehicles || []) as any[]} 
      userRole={role} 
    />
  )
}
