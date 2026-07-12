import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  // Get current user
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (!user || userErr) {
    redirect('/login')
  }

  // Fetch all vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, registration_number, name_model, type, status, region')

  // Fetch all drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, name, status')

  // Fetch all trips
  const { data: trips } = await supabase
    .from('trips')
    .select(`
      id,
      status,
      vehicle_id,
      driver_id,
      source,
      destination,
      cargo_weight,
      planned_distance,
      created_at,
      vehicles ( registration_number, name_model ),
      drivers ( name )
    `)

  return (
    <DashboardClient 
      vehicles={(vehicles || []) as any[]}
      drivers={(drivers || []) as any[]}
      trips={(trips || []) as any[]}
    />
  )
}
