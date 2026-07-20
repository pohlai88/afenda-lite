import { InventoryShell } from "@/features/inventory/inventory-shell";

/**
 * Operator admin inventory — session + fine-grained inventory permissions.
 */
export default function AdminInventoryPage() {
	return <InventoryShell surface="admin" />;
}
