import { getSession } from "@afenda/auth";
import { Suspense } from "react";

import { requireAnyPermission } from "@/features/auth/require-permission";
import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { ManagerWorkspaceLoading } from "@/features/human-resources/manager/manager-workspace-loading";
import { ManagerWorkspaceServer } from "@/features/human-resources/manager/manager-workspace-server";
import { parseHrPage } from "@/features/human-resources/pagination";

type PageProps = {
	searchParams: Promise<{
		page?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
};

const MANAGER_WORKSPACE_PERMISSIONS = [
	"human-resources.employee.read",
	"human-resources.leave-request.approve-team",
	"human-resources.time.timesheet.approve",
	"human-resources.time.exception.resolve",
	"human-resources.employment.manage",
	"human-resources.performance.manager.manage",
	"human-resources.talent.admin",
	"human-resources.succession.admin",
	"human-resources.workforce-plan.read",
] as const;

export default async function ManagerHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	const session = await getSession();
	await requireAnyPermission(session, MANAGER_WORKSPACE_PERMISSIONS);
	const page = parseHrPage(params.page);
	const preferences = parseHrDisplayPreferences(params);
	return (
		<Suspense fallback={<ManagerWorkspaceLoading />}>
			<ManagerWorkspaceServer
				session={session}
				page={page}
				preferences={preferences}
			/>
		</Suspense>
	);
}
