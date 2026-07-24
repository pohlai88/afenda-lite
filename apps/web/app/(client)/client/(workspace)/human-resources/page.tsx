import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { EmployeeHrShell } from "@/features/human-resources/human-resources-shell";
import { parseHrPage } from "@/features/human-resources/pagination";

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
		<EmployeeHrShell
			page={parseHrPage(params.page)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
