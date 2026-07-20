import { SalesShell } from "@/features/sales/sales-shell";

/**
 * Operator admin sales — session + fine-grained `sales.order.*` permissions.
 */
export default function AdminSalesPage() {
	return <SalesShell surface="admin" />;
}
