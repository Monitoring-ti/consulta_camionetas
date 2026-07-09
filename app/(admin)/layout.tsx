import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="app-shell">
      <Sidebar userEmail={user?.email} />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
