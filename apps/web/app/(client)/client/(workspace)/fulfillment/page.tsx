import { FulfillmentShell } from "@/features/fulfillment/fulfillment-shell";

/** Client workspace fulfillment — session + `fulfillment.delivery.read` / write perms. */
export default function ClientFulfillmentPage() {
	return <FulfillmentShell surface="client" />;
}
