// Server Actions Imports — AdminCN demo reads fake-db directly (no unauthenticated action barrel).
import { db as userSettingsDb } from "@/components-V2/platform-fake-db/pages/user-settings";

import UserSettingsTabs from "@/components-V2/platform-views/pages/user-settings/user-settings-tabs";

const UserSettings = async () => {
  const membersData = {
    members: userSettingsDb.members,
    pending: userSettingsDb.pending,
  };
  const sessionsData = userSettingsDb.sessions;
  const integrationsData = userSettingsDb.integrations;

  return (
    <div>
      <div className="mb-4 md:mb-6 lg:mb-10">
        <h1 className="text-xl font-bold">Account & User Management</h1>
        <p className="text-muted-foreground">
          Manage your account settings and user preferences.
        </p>
      </div>
      <UserSettingsTabs
        membersData={membersData}
        sessionsData={sessionsData}
        integrationsData={integrationsData}
      />
    </div>
  );
};

export default UserSettings;
