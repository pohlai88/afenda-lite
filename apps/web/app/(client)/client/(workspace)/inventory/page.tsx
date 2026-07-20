import { InventoryShell } from "@/features/inventory/inventory-shell";

/**
 * Client workspace inventory — session + fine-grained inventory permissions.
 */
export default function ClientInventoryPage() {
	return <InventoryShell surface="client" />;
}
