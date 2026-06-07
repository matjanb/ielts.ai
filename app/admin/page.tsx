import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/api/admin'
import { AdminClient } from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Server-side gate: non-admins (and anonymous users) never see the panel.
  const admin = await getAdminUser()
  if (!admin) redirect('/dashboard')
  return <AdminClient />
}
