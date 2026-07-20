import { SalesShell } from "@/features/sales/sales-shell";

/**
 * Client workspace sales — session + `sales.read` / manage.
 */
export default function ClientSalesPage() {
	return <SalesShell surface="client" />;
}
