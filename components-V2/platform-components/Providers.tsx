// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { ThemeProvider } from './ThemeProvider'
import { SidebarProvider } from './ui/sidebar'
import { TooltipProvider } from './ui/tooltip'

// Context Imports
import type { Settings } from '@/components-V2/platform-context/settingsContext'
import { SettingsProvider } from '@/components-V2/platform-context/settingsContext'

type Props = {
  children: ReactNode
  settingsCookie?: Settings
  sidebarDefaultOpen?: boolean
}

const Providers = ({ children, settingsCookie, sidebarDefaultOpen }: Props) => {
  return (
    <ThemeProvider attribute='class' defaultTheme={settingsCookie?.mode ?? 'system'} enableSystem={true}>
      <SettingsProvider settingsCookie={settingsCookie}>
        <TooltipProvider>
          <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}

export default Providers
