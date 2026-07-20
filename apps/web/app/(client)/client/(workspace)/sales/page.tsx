import { SalesShell } from "@/features/sales/sales-shell";

/**
 * Client workspace sales — session + fine-grained `sales.order.*` permissions.
 */
export default function ClientSalesPage() {
	return <SalesShell surface="client" />;
}
