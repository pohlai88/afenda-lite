import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { OperationsHrShell } from "@/features/human-resources/human-resources-shell";
import { parseHrPage } from "@/features/human-resources/pagination";

type PageProps = {
	searchParams: Promise<{
		page?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
};

export default async function OperationsHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	return (
		<OperationsHrShell
			page={parseHrPage(params.page)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
