import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { AdminShellProviders } from '@/components-V2/platform-components/AdminShellProviders'
import PagesLayout from '@/components-V2/platform-components/layout/PagesLayout'
import themeConfig from '@/components-V2/platform-config/themeConfig'
import type { Settings } from '@/components-V2/platform-context/settingsContext'
import { listPortalOrganizations } from '@/modules/identity/portal-organization'
import {
  isPlaygroundEnabled,
  isPortalOrgSwitcherEnabled,
} from '@/modules/platform/env/accessors'
import { resolveShellAccess } from '@/features/portal-chrome/resolve-shell-access'

/** Shared AdminCN chrome for Declarations + Feed Farm Trade modules (/dashboard, /fft). */
export async function AdminCnShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(themeConfig.settingsCookieName)?.value
  let settingsCookie: Settings | undefined
  if (raw) {
    try {
      settingsCookie = JSON.parse(raw) as Settings
    } catch {
      settingsCookie = undefined
    }
  }

  const sidebarDefaultOpen = settingsCookie?.sidebarOpen ?? themeConfig.sidebarOpen
  const showPlayground = isPlaygroundEnabled()
  const shellAccess = await resolveShellAccess()
  const orgSwitcherEnabled = isPortalOrgSwitcherEnabled()

  let organizations: { id: string; name: string; slug: string }[] = []
  let activeOrganizationId: string | null = null
  if (orgSwitcherEnabled) {
    try {
      const listed = await listPortalOrganizations()
      organizations = listed.organizations
      activeOrganizationId = listed.activeOrganizationId
    } catch {
      organizations = []
      activeOrganizationId = null
    }
  }

  return (
    <AdminShellProviders
      settingsCookie={settingsCookie}
      sidebarDefaultOpen={sidebarDefaultOpen}
      showPlayground={showPlayground}
      entitledModules={shellAccess?.modules ?? ['declarations']}
      isOrgAdmin={shellAccess?.isOrgAdmin ?? false}
      orgSwitcherEnabled={orgSwitcherEnabled}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
    >
      <PagesLayout>{children}</PagesLayout>
    </AdminShellProviders>
  )
}
