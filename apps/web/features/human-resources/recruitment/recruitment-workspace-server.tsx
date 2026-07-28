import { requireRole } from "@afenda/auth";

import { forbidPermissionAccess } from "@/features/auth/require-permission";

import { loadRecruitmentWorkspace } from "./load-recruitment-workspace";
import {
	hasRecruitmentCapability,
	resolveRecruitmentCapabilities,
} from "./recruitment-permissions";
import { RecruitmentWorkspace } from "./recruitment-workspace";

export async function RecruitmentWorkspaceServer() {
	const session = await requireRole("operator");
	const capabilities = await resolveRecruitmentCapabilities(session);
	if (!hasRecruitmentCapability(capabilities)) forbidPermissionAccess();
	const data = await loadRecruitmentWorkspace({
		organizationId: session.orgId,
		actorUserId: session.userId,
		capabilities,
	});
	return <RecruitmentWorkspace capabilities={capabilities} data={data} />;
}
