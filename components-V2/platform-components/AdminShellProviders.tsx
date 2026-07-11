'use client'

import type { ReactNode } from 'react'
import { SidebarProvider } from '@/components-V2/platform-components/ui/sidebar'
import { TooltipProvider } from '@/components-V2/platform-components/ui/tooltip'
import { OrganizationAdminShellFlagsProvider } from '@/components-V2/platform-context/organizationAdminShellFlagsContext'
import type { Settings } from '@/components-V2/platform-context/settingsContext'
import { SettingsProvider } from '@/components-V2/platform-context/settingsContext'
import type { ShellModuleId } from '@/modules/platform/shell/access'

type Props = {
  children: ReactNode
  settingsCookie?: Settings
  sidebarDefaultOpen?: boolean
  /** Local-only developer harness — never true in production Vercel. */
  showPlayground?: boolean
  entitledModules?: ShellModuleId[]
  isOrgAdmin?: boolean
}

/**
 * AdminCN shell providers for /dashboard and /trade.
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
}: Props) {
  return (
    <SettingsProvider settingsCookie={settingsCookie}>
      <OrganizationAdminShellFlagsProvider
        showPlayground={showPlayground}
        entitledModules={entitledModules}
        isOrgAdmin={isOrgAdmin}
      >
        <TooltipProvider>
          <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
        </TooltipProvider>
      </OrganizationAdminShellFlagsProvider>
    </SettingsProvider>
  )
}
