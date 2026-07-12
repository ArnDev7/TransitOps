import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ReportsClient from '@/components/ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = createClient()

  // Get current user
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (!user || userErr) {
    redirect('/login')
  }

  // Fetch all vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, registration_number, name_model, acquisition_cost, type, status')

  // Fetch maintenance costs
  const { data: maintenanceLogs } = await supabase
    .from('maintenance_logs')
    .select('vehicle_id, cost')

  // Fetch fuel log costs
  const { data: fuelLogs } = await supabase
    .from('fuel_logs')
    .select('vehicle_id, liters, cost')

  // Fetch trips for efficiency/revenue calculations
  const { data: trips } = await supabase
    .from('trips')
    .select('vehicle_id, status, planned_distance, fuel_consumed, revenue')

  return (
    <ReportsClient 
      vehicles={(vehicles || []) as any[]}
      maintenanceLogs={(maintenanceLogs || []) as any[]}
      fuelLogs={(fuelLogs || []) as any[]}
      trips={(trips || []) as any[]}
    />
  )
}
