// Component Import
import { Separator } from '@/components-V2/platform-components/ui/separator'

import DangerZone from '@/components-V2/platform-views/pages/user-settings/workspace/danger-zone'
import WorkspaceData from '@/components-V2/platform-views/pages/user-settings/workspace/workspace-data'
import WorkspaceDetail from '@/components-V2/platform-views/pages/user-settings/workspace/workspace-detail'
import WorkspaceName from '@/components-V2/platform-views/pages/user-settings/workspace/workspace-name'
import WorkspaceOrganizations from '@/components-V2/platform-views/pages/user-settings/workspace/workspace-organizations'

const Workspace = () => {
  return (
    <section className='py-3'>
      <WorkspaceName />
      <Separator className='my-10' />
      <WorkspaceDetail />
      <Separator className='my-10' />
      <WorkspaceOrganizations />
      <Separator className='my-10' />
      <WorkspaceData />
      <Separator className='my-10' />
      <DangerZone />
    </section>
  )
}

export default Workspace
