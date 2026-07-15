// Data Imports
import { db } from '#fake-db/pages/user-settings'

import UserSettingsTabs from '#views/pages/user-settings/user-settings-tabs'

/**
 * ! If you're using a database, you can uncomment the line below and use the server action to fetch the data
 * ! import { getIntegrationsData, getMembersData, getSessionsData } from '#app/server/actions'
 */

const UserSettings = () => {
  const membersData = { members: db.members, pending: db.pending }
  const sessionsData = db.sessions
  const integrationsData = db.integrations

  return (
    <div>
      <div className='mb-4 md:mb-6 lg:mb-10'>
        <h1 className='text-xl font-bold'>Account & User Management</h1>
        <p className='text-muted-foreground'>Manage your account settings and user preferences.</p>
      </div>
      <UserSettingsTabs membersData={membersData} sessionsData={sessionsData} integrationsData={integrationsData} />
    </div>
  )
}

export default UserSettings
