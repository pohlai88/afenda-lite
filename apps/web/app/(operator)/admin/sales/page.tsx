import { SalesShell } from "@/features/sales/sales-shell";

/**
 * Operator admin sales — session + `sales.read` / manage.
 */
export default function AdminSalesPage() {
	return <SalesShell surface="admin" />;
}
