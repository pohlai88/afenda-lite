import { InventoryShell } from "@/features/inventory/inventory-shell";
import { firstSearchParam } from "@/lib/first-search-param";

interface AdminInventoryPageProps {
	searchParams: Promise<{ movementId?: string | string[] }>;
}

/**
 * Operator admin inventory — session + fine-grained inventory permissions.
 */
export default async function AdminInventoryPage({
	searchParams,
}: AdminInventoryPageProps) {
	const params = await searchParams;
	const movementId = firstSearchParam(params.movementId);
	return (
		<InventoryShell
			surface="admin"
			{...(movementId === undefined ? {} : { movementId })}
		/>
	);
}
