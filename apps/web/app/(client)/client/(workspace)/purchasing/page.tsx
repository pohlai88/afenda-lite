import { PurchasingShell } from "@/features/purchasing/purchasing-shell";

/**
 * Client workspace purchasing — session + `purchasing.read` / manage.
 */
export default function ClientPurchasingPage() {
	return <PurchasingShell surface="client" />;
}
