import { CorporateAdministrationShell } from "@/features/corporate-administration/corporate-administration-shell";

export default async function AdminCorporateAdministrationPage({
	searchParams,
}: {
	searchParams: Promise<{ companyId?: string }>;
}) {
	const { companyId } = await searchParams;
	return <CorporateAdministrationShell surface="admin" companyId={companyId} />;
}
