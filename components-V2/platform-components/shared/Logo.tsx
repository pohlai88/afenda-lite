// Config Imports
import themeConfig from '@/components-V2/platform-config/themeConfig'

// SVG Imports
import LogoSvg from '@/components-V2/platform-assets/svg/logo'

// Util Imports
import { cn } from '@/components-V2/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoSvg className='size-8.5' />
      <span className='text-xl font-bold'>{themeConfig.templateName}</span>
    </div>
  )
}

export default Logo
