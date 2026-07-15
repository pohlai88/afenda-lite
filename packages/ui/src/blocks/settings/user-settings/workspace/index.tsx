// Component Import
import { Separator } from "../../../../components/ui/separator";

import DangerZone from "./danger-zone";
import WorkspaceData from "./workspace-data";
import WorkspaceDetail from "./workspace-detail";
import WorkspaceName from "./workspace-name";
import WorkspaceOrganizations from "./workspace-organizations";

const Workspace = () => {
	return (
		<section className="py-3">
			<WorkspaceName />
			<Separator className="my-10" />
			<WorkspaceDetail />
			<Separator className="my-10" />
			<WorkspaceOrganizations />
			<Separator className="my-10" />
			<WorkspaceData />
			<Separator className="my-10" />
			<DangerZone />
		</section>
	);
};

export default Workspace;
