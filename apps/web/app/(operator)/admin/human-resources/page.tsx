import { parseAdminEmployeeDirectoryParams } from "@/features/human-resources/admin/directory-params";
import { EmployeeDirectoryWorkspace } from "@/features/human-resources/admin/employee-directory";
import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";

interface PageProps {
	searchParams: Promise<{
		page?: string | string[];
		query?: string | string[];
		field?: string | string[];
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
}

export default async function AdminHumanResourcesPage({
	searchParams,
}: PageProps) {
	const params = await searchParams;
	return (
		<EmployeeDirectoryWorkspace
			params={parseAdminEmployeeDirectoryParams(params)}
			preferences={parseHrDisplayPreferences(params)}
		/>
	);
}
