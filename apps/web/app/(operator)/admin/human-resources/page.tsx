import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { AdminHrShell } from "@/features/human-resources/human-resources-shell";
import { parseHrPage } from "@/features/human-resources/pagination";

type PageProps = {
	searchParams: Promise<{
		page?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
};

export default async function AdminHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	return (
		<AdminHrShell
			page={parseHrPage(params.page)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
