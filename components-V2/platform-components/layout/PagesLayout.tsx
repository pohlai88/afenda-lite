'use client'

import { Suspense, type ReactNode } from 'react'
import Footer from '@/components-V2/platform-components/layout/Footer'
import Header from '@/components-V2/platform-components/layout/Header'
import Sidebar from '@/components-V2/platform-components/layout/Sidebar'
import { SidebarInset } from '@/components-V2/platform-components/ui/sidebar'
import { useSettings } from '@/components-V2/platform-hooks/use-settings'
import { cn } from '@/components-V2/lib/utils'

type PagesLayoutProps = {
  children: ReactNode
  /** Swap product nav for a surface-specific sidebar (e.g. playground). */
  sidebar?: ReactNode
}

/**
 * Canonical AdminCN pages chrome — Header + inset main + Footer.
 * Do not fork this structure for /playground; pass `sidebar` instead.
 */
export default function PagesLayout({ children, sidebar }: PagesLayoutProps) {
  const { settings } = useSettings()

  return (
    <div className='flex h-full min-h-dvh w-full min-w-0'>
      <Suspense>{sidebar ?? <Sidebar />}</Suspense>
      <SidebarInset className='flex min-w-0 flex-1 flex-col'>
        <Header />
        <main
          className={cn(
            'mx-auto size-full min-w-0 flex-1 px-4 py-6 sm:px-6',
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
