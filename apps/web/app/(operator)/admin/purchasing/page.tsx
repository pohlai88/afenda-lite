import { PurchasingShell } from "@/features/purchasing/purchasing-shell";

/**
 * Operator admin purchasing — session + `purchasing.read` / manage.
 */
export default function AdminPurchasingPage() {
	return <PurchasingShell surface="admin" />;
}
