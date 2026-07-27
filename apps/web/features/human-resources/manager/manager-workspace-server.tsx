import type { Session } from "@afenda/auth";
import type { HrDisplayPreferences } from "../display-preferences";
import { ManagerWorkspace } from "./manager-workspace";
import { loadManagerWorkspace } from "./manager-workspace-data";

export async function ManagerWorkspaceServer({
	session,
	page,
	preferences,
}: {
	session: Session;
	page: number;
	preferences: HrDisplayPreferences;
}) {
	const data = await loadManagerWorkspace(session, page);
	return <ManagerWorkspace data={data} preferences={preferences} />;
}
