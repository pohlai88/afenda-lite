import { requireRole } from "@afenda/auth";
import { forbidPermissionAccess } from "@/features/auth/require-permission";
import type { HrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { OperationsHrShell } from "@/features/human-resources/human-resources-shell";
import {
	hasHrOperationsCapability,
	resolveHrOperationsCapabilities,
} from "./hr-operations-permissions";
import { HrOperationsWorkspace } from "./hr-operations-workspace";
import { loadHrOperations } from "./load-hr-operations";

export async function HrOperationsWorkspaceServer({
	page,
	preferences,
}: {
	page: number;
	preferences: HrDisplayPreferences;
}) {
	const session = await requireRole("operator");
	const capabilities = await resolveHrOperationsCapabilities(session);
	if (!hasHrOperationsCapability(capabilities)) {
		forbidPermissionAccess();
	}
	const data = await loadHrOperations(capabilities);
	const integrationHealth = capabilities.canViewIntegrationHealth
		? await OperationsHrShell({ page, preferences })
		: null;
	return (
		<HrOperationsWorkspace
			capabilities={capabilities}
			data={data}
			integrationHealth={integrationHealth}
		/>
	);
}
