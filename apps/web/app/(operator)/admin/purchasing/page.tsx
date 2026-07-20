import { PurchasingShell } from "@/features/purchasing/purchasing-shell";

/**
 * Operator admin purchasing — session + `purchasing.order.read` / fine-grained manage.
 */
export default function AdminPurchasingPage() {
	return <PurchasingShell surface="admin" />;
}
