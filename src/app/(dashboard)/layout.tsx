import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    redirect('/login')
  }

  // Fetch the role from the public users table
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Default to driver as a safety check if profile is still syncing
  const role = profile?.role || 'driver'

  return (
    <DashboardLayoutWrapper user={{ id: user.id, email: user?.email }} role={role}>
      {children}
    </DashboardLayoutWrapper>
  )
}
