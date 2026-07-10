// Component Imports
import { Separator } from '@/components-V2/platform-components/ui/separator'

// Component Imports
import ConnectAccount from '@/components-V2/platform-views/pages/user-settings/general/connect-account'
import DangerZone from '@/components-V2/platform-views/pages/user-settings/general/danger-zone'
import EmailPass from '@/components-V2/platform-views/pages/user-settings/general/email-password'
import PersonalInfo from '@/components-V2/platform-views/pages/user-settings/general/personal-info'
import SocialUrl from '@/components-V2/platform-views/pages/user-settings/general/social-url'

const UserGeneral = () => {
  return (
    <section className='py-3'>
      <PersonalInfo />
      <Separator className='my-10' />
      <EmailPass />
      <Separator className='my-10' />
      <ConnectAccount />
      <Separator className='my-10' />
      <SocialUrl />
      <Separator className='my-10' />
      <DangerZone />
    </section>
  )
}

export default UserGeneral
