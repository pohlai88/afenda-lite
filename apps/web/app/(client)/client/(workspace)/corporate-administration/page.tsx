import { CorporateAdministrationShell } from "@/features/corporate-administration/corporate-administration-shell";

export default async function ClientCorporateAdministrationPage({
	searchParams,
}: Readonly<{ searchParams: Promise<{ cursor?: string | string[] }> }>) {
	const { cursor } = await searchParams;
	return (
		<CorporateAdministrationShell
			surface="client"
			{...(typeof cursor === "string" ? { cursor } : {})}
		/>
	);
}
