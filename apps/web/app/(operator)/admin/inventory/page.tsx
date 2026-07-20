import { InventoryShell } from "@/features/inventory/inventory-shell";

/**
 * Operator admin inventory — session + `inventory.read` / manage.
 */
export default function AdminInventoryPage() {
	return <InventoryShell surface="admin" />;
}
