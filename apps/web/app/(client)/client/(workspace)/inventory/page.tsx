import { InventoryShell } from "@/features/inventory/inventory-shell";
import { firstSearchParam } from "@/lib/first-search-param";

interface ClientInventoryPageProps {
	searchParams: Promise<{ movementId?: string | string[] }>;
}

/**
 * Client workspace inventory — read-only console (mutations are operator/admin).
 */
export default async function ClientInventoryPage({
	searchParams,
}: ClientInventoryPageProps) {
	const params = await searchParams;
	const movementId = firstSearchParam(params.movementId);
	return (
		<InventoryShell
			surface="client"
			{...(movementId === undefined ? {} : { movementId })}
		/>
	);
}
