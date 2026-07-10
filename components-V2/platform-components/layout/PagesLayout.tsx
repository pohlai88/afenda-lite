'use client'

import { Suspense, type ReactNode } from 'react'
import Footer from '@/components-V2/platform-components/layout/Footer'
import Header from '@/components-V2/platform-components/layout/Header'
import Sidebar from '@/components-V2/platform-components/layout/Sidebar'
import { SidebarInset } from '@/components-V2/platform-components/ui/sidebar'
import { useSettings } from '@/components-V2/platform-hooks/use-settings'
import { cn } from '@/components-V2/lib/utils'

export default function PagesLayout({ children }: { children: ReactNode }) {
  const { settings } = useSettings()

  return (
    <div className='flex h-full min-h-dvh w-full min-w-0'>
      <Suspense>
        <Sidebar />
      </Suspense>
      <SidebarInset className='flex flex-1 flex-col'>
        <Header />
        <main
          className={cn(
            'mx-auto size-full flex-1 px-4 py-6 sm:px-6',
            settings.layout === 'compact' ? 'mx-auto max-w-360' : 'w-full'
          )}
        >
          {children}
        </main>
        <Footer />
      </SidebarInset>
    </div>
  )
}
