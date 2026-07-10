// Component Import
import { Separator } from '@/components-V2/platform-components/ui/separator'

import type { Session } from '@/components-V2/platform-types/pages/user-settings-types'

import Sessions from '@/components-V2/platform-views/pages/user-settings/security/all-sessions'
import ApiKey from '@/components-V2/platform-views/pages/user-settings/security/api-key'
import TwoFactor from '@/components-V2/platform-views/pages/user-settings/security/two-factor'

type SecurityProps = {
  sessionsData: Session[]
}

function Security({ sessionsData }: SecurityProps) {
  return (
    <section className='py-3'>
      <TwoFactor />
      <Separator className='my-10' />
      <ApiKey />
      <Separator className='my-10' />
      <Sessions initialSessions={sessionsData} />
    </section>
  )
}

export default Security
