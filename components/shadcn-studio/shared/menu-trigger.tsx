'use client'

import type { VariantProps } from 'class-variance-authority'

import { IconPlaceholder } from '@/components/svg/icon-placeholder'
import { useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import type { buttonVariants } from '@/components/ui/button'

type Props = {
  className?: string
  variant?: VariantProps<typeof buttonVariants>['variant']
}

const MenuTrigger = ({ className, variant = 'ghost' }: Props) => {
  const { open, isMobile, openMobile, toggleSidebar } = useSidebar()

  const isOpen = isMobile ? openMobile : open

  return (
    <Button variant={variant} size='icon-lg' onClick={toggleSidebar} className={className}>
      {isOpen ? (
        <IconPlaceholder
          lucide='PanelLeftCloseIcon'
          tabler='IconLayoutSidebarLeftCollapse'
          hugeicons='PanelLeftCloseIcon'
          phosphor='SidebarSimpleIcon'
          remixicon='RiLayoutLeftLine'
        />
      ) : (
        <IconPlaceholder
          lucide='PanelRightCloseIcon'
          tabler='IconLayoutSidebarRightCollapse'
          hugeicons='PanelRightCloseIcon'
          phosphor='SidebarSimpleIcon'
          remixicon='RiLayoutRightLine'
        />
      )}
    </Button>
  )
}

export default MenuTrigger
