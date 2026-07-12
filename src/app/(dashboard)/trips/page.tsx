import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TripsClient from '@/components/TripsClient'

export const dynamic = 'force-dynamic'

export default async function TripsPage() {
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

  // Fetch all trips with nested join data
  const { data: trips } = await supabase
    .from('trips')
    .select(`
      *,
      vehicles ( name_model, registration_number, max_load_capacity, odometer ),
      drivers ( name, license_number, safety_score )
    `)
    .order('created_at', { ascending: false })

  return (
    <TripsClient 
      initialTrips={(trips || []) as any[]} 
      userRole={role} 
    />
  )
}
