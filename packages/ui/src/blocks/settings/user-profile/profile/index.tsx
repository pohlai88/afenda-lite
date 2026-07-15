import type { UserProfilePageData } from "../../../../contracts/pages/user-profile-types";
// Components Imports
import AboutSection from "./about-section";
import { ActivityTimeline } from "./activity-timeline";
import Connections from "./connections";
import ProfileProjectDatatable from "./profile-project-datatable";
import Teams from "./teams";

function Profile({ data }: { data: UserProfilePageData }) {
	const { activityLog } = data;
	return (
		<div className="grid grid-cols-12 gap-6">
			{/* About Section */}
			<div className="col-span-12 space-y-6 lg:col-span-4">
				<AboutSection data={data} />
			</div>

			{/* Activity Section */}
			<div className="col-span-12 lg:col-span-8">
				<div className="grid grid-cols-12 gap-6">
					{/* Activity timeline */}
					<ActivityTimeline activityLog={activityLog} className="col-span-12" />
					{/* Connections */}
					<Connections data={data} className="col-span-12 lg:col-span-6" />
					{/* Teams */}
					<Teams data={data} className="col-span-12 lg:col-span-6" />
					{/* Projects DataTable */}
					<ProfileProjectDatatable data={data} className="col-span-12" />
				</div>
			</div>
		</div>
	);
}

export default Profile;
