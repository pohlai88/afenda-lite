import { humanResourcesEmployeeIdSchema } from "@afenda/human-resources";
import { notFound } from "next/navigation";

import { EmployeeAdminDetail } from "@/features/human-resources/admin/employee-detail";
import { parseHrDisplayPreferences } from "@/features/human-resources/display-preferences";

interface PageProps {
	params: Promise<{ employeeId: string }>;
	searchParams: Promise<{
		locale?: string | string[];
		timeZone?: string | string[];
	}>;
}

export default async function AdminEmployeeDetailPage({
	params,
	searchParams,
}: PageProps) {
	const [{ employeeId }, displayParams] = await Promise.all([
		params,
		searchParams,
	]);
	const parsedEmployeeId = humanResourcesEmployeeIdSchema.safeParse(employeeId);
	if (!parsedEmployeeId.success) {
		notFound();
	}
	return (
		<EmployeeAdminDetail
			employeeId={parsedEmployeeId.data}
			preferences={parseHrDisplayPreferences(displayParams)}
		/>
	);
}
