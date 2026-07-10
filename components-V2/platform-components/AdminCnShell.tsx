import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { AdminShellProviders } from '@/components-V2/platform-components/AdminShellProviders'
import PagesLayout from '@/components-V2/platform-components/layout/PagesLayout'
import themeConfig from '@/components-V2/platform-config/themeConfig'
import type { Settings } from '@/components-V2/platform-context/settingsContext'

/** Shared AdminCN chrome for operator surfaces (/dashboard, /account). */
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

  return (
    <AdminShellProviders
      settingsCookie={settingsCookie}
      sidebarDefaultOpen={sidebarDefaultOpen}
    >
      <PagesLayout>{children}</PagesLayout>
    </AdminShellProviders>
  )
}
