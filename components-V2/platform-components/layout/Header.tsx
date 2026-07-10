'use client'

// Third-party Imports
import { ActivityIcon, BellIcon } from 'lucide-react'

// Component Imports
import ModeToggle from '@/components-V2/platform-components/layout/ModeToggle'
import ActivityDialog from '@/components-V2/platform-components/shared/ActivityDialog'
import NotificationDropdown from '@/components-V2/platform-components/shared/NotificationDropdown'
import ProfileDropdown from '@/components-V2/platform-components/shared/ProfileDropdown'
import { Button } from '@/components-V2/platform-components/ui/button'
import { Separator } from '@/components-V2/platform-components/ui/separator'
import { SidebarTrigger, useSidebar } from '@/components-V2/platform-components/ui/sidebar'
import CommandMenu from './CommandMenu'
import ThemeCustomizer from './ThemeCustomizer'

// Hook Imports
import { useSettings } from '@/components-V2/platform-hooks/use-settings'

// Util Imports
import { cn } from '@/components-V2/lib/utils'

const Header = () => {
  const { settings, updateSettings } = useSettings()
  const { open } = useSidebar()

  return (
    <header className='sticky top-0 z-50 px-4 before:absolute before:inset-0 before:rounded-t-xl before:mask-[linear-gradient(var(--card),var(--card)_18%,transparent_100%)] before:backdrop-blur-md sm:px-6'>
      <div
        className={cn(
          'bg-card relative z-51 mx-auto mt-3 flex w-full items-center justify-between rounded-xl border px-6 py-2',
          settings.layout === 'compact' ? 'max-w-348' : 'w-full'
        )}
      >
        <div className='flex items-center gap-1.5 sm:gap-4'>
          <SidebarTrigger className='[&_svg]:size-5!' onClick={() => updateSettings({ sidebarOpen: !open })} />
          <Separator orientation='vertical' className='hidden h-4! self-center! sm:block' />
          <CommandMenu />
        </div>
        <div className='flex items-center gap-1.5'>
          <ActivityDialog
            trigger={
              <Button variant='ghost' size='icon'>
                <ActivityIcon />
              </Button>
            }
            triggerClassName='max-md:hidden'
          />
          <NotificationDropdown
            trigger={
              <Button variant='ghost' size='icon' className='relative'>
                <BellIcon />
                <span className='bg-destructive absolute top-2 right-2.5 size-2 rounded-full' />
              </Button>
            }
          />
          <ModeToggle />
          <ThemeCustomizer />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
