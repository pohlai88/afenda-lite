// Component Imports
import { ThemeProvider } from './ThemeProvider'
import { SidebarProvider } from './ui/sidebar'
import { TooltipProvider } from './ui/tooltip'

// Context Imports
import { SettingsProvider } from '../contexts/settingsContext'

// Playground contract
import type { ProvidersContract } from '../playground/types'

interface ProvidersProps extends ProvidersContract {}

const Providers = ({ children, settingsCookie, sidebarDefaultOpen }: ProvidersProps) => {
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
