import { InventoryShell } from "@/features/inventory/inventory-shell";
import { firstSearchParam } from "@/lib/first-search-param";

type ClientInventoryPageProps = {
	searchParams: Promise<{ movementId?: string | string[] }>;
};

/**
 * Client workspace inventory — read-only console (mutations are operator/admin).
 */
export default async function ClientInventoryPage({
	searchParams,
}: ClientInventoryPageProps) {
	const params = await searchParams;
	return (
		<InventoryShell
			surface="client"
			movementId={firstSearchParam(params.movementId)}
		/>
	);
}
