import { redirect } from 'next/navigation'
import { requireAccountSession } from '@/lib/account-session'
import { resolvePortalAccountIndexHref } from '@/lib/routing/account-paths'

export const dynamic = 'force-dynamic'

/** Persona router — operators → /account/settings, clients → /client/profile. */
export default async function AccountIndexPage() {
  const member = await requireAccountSession()
  redirect(resolvePortalAccountIndexHref(member.context))
}
