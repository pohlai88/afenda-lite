import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { requireAccountSession } from '@/lib/account-session'
import { PortalAccountSectionNav } from '@/components/portal/portal-account-section-nav'
import { PortalFormSection } from '@/components/portal/portal-form-section'
import { PortalAccountNeonView } from '@/components/portal/portal-account-neon-view'
import {
  accountCopyKey,
  isPortalAccountPath,
  PORTAL_ACCOUNT_PATHS,
  resolveAccountPathAccess,
} from '@/lib/routing/account-paths'
import { portalCopy, PORTAL_NAME } from '@/lib/copy/portal-copy'

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
  return PORTAL_ACCOUNT_PATHS.map((path) => ({ path }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>
}): Promise<Metadata> {
  const { path } = await params

  if (path === 'security') {
    return {
      title: `${PORTAL_NAME} — ${portalCopy.metadata.accountSecurity.title}`,
      description: portalCopy.metadata.accountSecurity.description,
    }
  }

  return {
    title: `${PORTAL_NAME} — ${portalCopy.metadata.accountSettings.title}`,
    description: portalCopy.metadata.accountSettings.description,
  }
}

/** Neon AccountView under AdminCN shell (layout). BL-07: name + password. */
export default async function AccountPathPage({
  params,
}: {
  params: Promise<{ path: string }>
}) {
  const { path } = await params

  if (!isPortalAccountPath(path)) {
    notFound()
  }

  const member = await requireAccountSession()
  const access = resolveAccountPathAccess(member.context, path)
  if (!access.allowed) {
    redirect(access.redirectHref)
  }

  const copy = portalCopy.account[accountCopyKey(path)]

  return (
    <div className='flex flex-col gap-8'>
      <PortalFormSection
        headingLevel={1}
        title={copy.title}
        description={copy.description}
      >
        <PortalAccountNeonView pathname={path} />
      </PortalFormSection>
      <PortalAccountSectionNav activePath={path} context={member.context} />
    </div>
  )
}
