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

  return (
    <DriversClient 
      initialDrivers={(drivers || []) as any[]} 
      userRole={role} 
    />
  )
}
