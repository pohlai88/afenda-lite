'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components-V2/platform-components/ThemeProvider'
import { SidebarProvider } from '@/components-V2/platform-components/ui/sidebar'
import { TooltipProvider } from '@/components-V2/platform-components/ui/tooltip'
import type { Settings } from '@/components-V2/platform-context/settingsContext'
import { SettingsProvider } from '@/components-V2/platform-context/settingsContext'

type Props = {
  children: ReactNode
  settingsCookie?: Settings
  sidebarDefaultOpen?: boolean
}

/**
 * AdminCN shell providers for /dashboard (and later workspace).
 * Includes next-themes so ModeToggle/ThemeCustomizer work — isolated from
 * the portal root custom ThemeProvider used on auth routes.
 */
export function AdminShellProviders({
  children,
  settingsCookie,
  sidebarDefaultOpen,
}: Props) {
  return (
    <ThemeProvider
      attribute='class'
      defaultTheme={settingsCookie?.mode ?? 'system'}
      enableSystem
    >
      <SettingsProvider settingsCookie={settingsCookie}>
        <TooltipProvider>
          <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
