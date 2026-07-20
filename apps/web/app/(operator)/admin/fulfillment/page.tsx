import { FulfillmentShell } from "@/features/fulfillment/fulfillment-shell";

/** Operator admin fulfillment — session + `fulfillment.delivery.read` / write perms. */
export default function AdminFulfillmentPage() {
	return <FulfillmentShell surface="admin" />;
}
