import { authServer } from "@afenda/auth";
import { forbidPermissionAccess } from "@/features/auth/require-permission";
import {
	hasCompensationCapability,
	resolveCompensationCapabilities,
} from "./compensation-permissions";
import { CompensationWorkspace } from "./compensation-workspace";
import { loadCompensationWorkspace } from "./load-compensation-workspace.server";

export async function CompensationWorkspaceServer() {
	const session = await authServer.session.requireRole("operator");
	const capabilities = await resolveCompensationCapabilities(session);
	if (!hasCompensationCapability(capabilities)) {
		forbidPermissionAccess();
	}
	const data = await loadCompensationWorkspace(capabilities);
	return <CompensationWorkspace capabilities={capabilities} data={data} />;
}
