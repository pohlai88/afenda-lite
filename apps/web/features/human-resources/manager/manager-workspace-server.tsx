import type { Session } from "@afenda/auth";
import { ManagerWorkspace } from "./manager-workspace";
import { loadManagerWorkspace } from "./manager-workspace-data";

export async function ManagerWorkspaceServer({
	session,
	page,
}: {
	session: Session;
	page: number;
}) {
	const data = await loadManagerWorkspace(session, page);
	return <ManagerWorkspace data={data} />;
}
