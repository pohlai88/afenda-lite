'use client'

import type { ReactNode } from 'react'
import { SidebarProvider } from '@/components-V2/platform-components/ui/sidebar'
import { TooltipProvider } from '@/components-V2/platform-components/ui/tooltip'
import { OrganizationAdminShellFlagsProvider } from '@/components-V2/platform-context/organizationAdminShellFlagsContext'
import type { Settings } from '@/components-V2/platform-context/settingsContext'
import { SettingsProvider } from '@/components-V2/platform-context/settingsContext'
import {
  OrganizationSwitcherProvider,
  type OrganizationSwitcherOrg,
} from '@/features/portal-chrome/organization-switcher-context'
import type { ShellModuleId } from '@/modules/platform/shell/access'

type Props = {
  children: ReactNode
  settingsCookie?: Settings
  sidebarDefaultOpen?: boolean
  /** Local-only developer harness — never true in production Vercel. */
  showPlayground?: boolean
  entitledModules?: ShellModuleId[]
  isOrgAdmin?: boolean
  orgSwitcherEnabled?: boolean
  organizations?: OrganizationSwitcherOrg[]
  activeOrganizationId?: string | null
}

/**
 * AdminCN shell providers for /dashboard and /fft.
 * Dark mode is owned by the root portal ThemeProvider (next-themes +
 * `client-declaration-theme`) — do not nest a second ThemeProvider here.
 */
export function AdminShellProviders({
  children,
  settingsCookie,
  sidebarDefaultOpen,
  showPlayground = false,
  entitledModules = ['declarations'],
  isOrgAdmin = false,
  orgSwitcherEnabled = false,
  organizations = [],
  activeOrganizationId = null,
}: Props) {
  return (
    <SettingsProvider settingsCookie={settingsCookie}>
      <OrganizationAdminShellFlagsProvider
        showPlayground={showPlayground}
        entitledModules={entitledModules}
        isOrgAdmin={isOrgAdmin}
      >
        <OrganizationSwitcherProvider
          enabled={orgSwitcherEnabled}
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
        >
          <TooltipProvider>
            <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
          </TooltipProvider>
        </OrganizationSwitcherProvider>
      </OrganizationAdminShellFlagsProvider>
    </SettingsProvider>
  )
}
