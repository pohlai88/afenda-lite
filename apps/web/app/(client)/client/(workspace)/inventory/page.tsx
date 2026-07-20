import { InventoryShell } from "@/features/inventory/inventory-shell";

/**
 * Client workspace inventory — session + `inventory.read` / manage.
 */
export default function ClientInventoryPage() {
	return <InventoryShell surface="client" />;
}
