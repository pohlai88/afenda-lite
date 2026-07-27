import { getSession } from "@afenda/auth";
import { Suspense } from "react";

import { requirePermission } from "@/features/auth/require-permission";
import { ManagerWorkspaceLoading } from "@/features/human-resources/manager/manager-workspace-loading";
import { ManagerWorkspaceServer } from "@/features/human-resources/manager/manager-workspace-server";
import { parseHrPage } from "@/features/human-resources/pagination";

type PageProps = {
	searchParams: Promise<{
		page?: string | string[];
	}>;
};

export default async function ManagerHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	const session = await getSession();
	await requirePermission(session, "human-resources.employee.read");
	const page = parseHrPage(params.page);
	return (
		<Suspense fallback={<ManagerWorkspaceLoading />}>
			<ManagerWorkspaceServer session={session} page={page} />
		</Suspense>
	);
}
