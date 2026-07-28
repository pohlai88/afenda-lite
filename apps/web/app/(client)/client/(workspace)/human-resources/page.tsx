import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { parseHrPage } from "@/features/human-resources/pagination";
import { SelfServiceWorkspaceServer } from "@/features/human-resources/self-service/self-service-workspace-server";

type PageProps = {
	searchParams: Promise<{
		page?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
};

export default async function EmployeeHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	return (
		<SelfServiceWorkspaceServer
			page={parseHrPage(params.page)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
