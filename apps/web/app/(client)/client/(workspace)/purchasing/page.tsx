import { PurchasingShell } from "@/features/purchasing/purchasing-shell";

/**
 * Client workspace purchasing — session + `purchasing.order.read` / fine-grained manage.
 */
export default function ClientPurchasingPage() {
	return <PurchasingShell surface="client" />;
}
