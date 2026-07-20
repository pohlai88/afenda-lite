import { InventoryShell } from "@/features/inventory/inventory-shell";
import { firstSearchParam } from "@/lib/first-search-param";

type AdminInventoryPageProps = {
	searchParams: Promise<{ movementId?: string | string[] }>;
};

/**
 * Operator admin inventory — session + fine-grained inventory permissions.
 */
export default async function AdminInventoryPage({
	searchParams,
}: AdminInventoryPageProps) {
	const params = await searchParams;
	return (
		<InventoryShell
			surface="admin"
			movementId={firstSearchParam(params.movementId)}
		/>
	);
}
