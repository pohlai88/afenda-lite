import { requireAdminSession } from '@/lib/auth/session'
import { AdminCnShell } from '@/components-V2/platform-components/AdminCnShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminSession()
  return <AdminCnShell>{children}</AdminCnShell>
}
