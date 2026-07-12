import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DriversClient from '@/components/DriversClient'

export const dynamic = 'force-dynamic'

export default async function DriversPage() {
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

  // Fetch drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch trips to calculate completed trips count
  const { data: trips } = await supabase
    .from('trips')
    .select('driver_id, status')

  const driversWithCompletedTrips = (drivers || []).map((d) => {
    const completedCount = (trips || []).filter(t => t.driver_id === d.id && t.status === 'Completed').length
    return {
      ...d,
      completed_trips: completedCount
    }
  })

  return (
    <DriversClient 
      initialDrivers={driversWithCompletedTrips} 
      userRole={role} 
    />
  )
}
