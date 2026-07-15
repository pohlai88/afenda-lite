import type { UserSettingsData } from "../../../contracts/pages/user-settings-types";

import UserSettingsTabs from "./user-settings-tabs";

const UserSettings = ({ data }: { data: UserSettingsData }) => {
	const membersData = { members: data.members, pending: data.pending };
	const sessionsData = data.sessions;
	const integrationsData = data.integrations;

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
