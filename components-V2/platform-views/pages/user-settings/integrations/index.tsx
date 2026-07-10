// Component Imports
import { Separator } from '@/components-V2/platform-components/ui/separator'

import type { IntegrationsData } from '@/components-V2/platform-types/pages/user-settings-types'

import Communication from '@/components-V2/platform-views/pages/user-settings/integrations/integrations-communication'
import Planning from '@/components-V2/platform-views/pages/user-settings/integrations/integrations-planning'
import Tools from '@/components-V2/platform-views/pages/user-settings/integrations/integrations-tools'

type IntegrationsProps = {
  integrationsData: IntegrationsData
}

const Integrations = ({ integrationsData }: IntegrationsProps) => {
  return (
    <section className='py-3'>
      <Communication apps={integrationsData.communication} />
      <Separator className='my-10' />
      <Planning apps={integrationsData.planning} />
      <Separator className='my-10' />
      <Tools apps={integrationsData.tools} />
    </section>
  )
}

export default Integrations
