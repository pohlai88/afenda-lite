import type { ReactNode } from 'react'
import { requireAccountSession } from '@/lib/account-session'
import { AdminCnShell } from '@/components-V2/platform-components/AdminCnShell'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAccountSession()
  return <AdminCnShell>{children}</AdminCnShell>
}
