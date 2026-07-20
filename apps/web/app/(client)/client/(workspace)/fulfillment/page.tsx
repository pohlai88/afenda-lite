import { FulfillmentShell } from "@/features/fulfillment/fulfillment-shell";

/** Client workspace fulfillment — session + `fulfillment.read` / manage. */
export default function ClientFulfillmentPage() {
	return <FulfillmentShell surface="client" />;
}
