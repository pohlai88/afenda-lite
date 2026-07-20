import { FulfillmentShell } from "@/features/fulfillment/fulfillment-shell";

/** Operator admin fulfillment — session + `fulfillment.read` / manage. */
export default function AdminFulfillmentPage() {
	return <FulfillmentShell surface="admin" />;
}
