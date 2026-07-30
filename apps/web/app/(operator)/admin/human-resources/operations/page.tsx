import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { HrOperationsWorkspaceServer } from "@/features/human-resources/operations/hr-operations-workspace-server";
import { parseHrPage } from "@/features/human-resources/pagination";

interface PageProps {
	searchParams: Promise<{
		page?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
}

export default async function OperationsHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	return (
		<HrOperationsWorkspaceServer
			page={parseHrPage(params.page)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
