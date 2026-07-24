import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { ManagerHrShell } from "@/features/human-resources/human-resources-shell";
import { parseHrPage } from "@/features/human-resources/pagination";

type PageProps = {
	searchParams: Promise<{
		page?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
};

export default async function ManagerHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	return (
		<ManagerHrShell
			page={parseHrPage(params.page)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
