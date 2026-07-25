import { CorporateAdministrationShell } from "@/features/corporate-administration/corporate-administration-shell";

export default async function ClientCorporateAdministrationPage({
	searchParams,
}: {
	searchParams: Promise<{ companyId?: string }>;
}) {
	const { companyId } = await searchParams;
	return (
		<CorporateAdministrationShell surface="client" companyId={companyId} />
	);
}
