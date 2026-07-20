import { PaymentsShell } from "@/features/payments/payments-shell";

/** Client workspace payments — session + `payments.read` / manage. */
export default function ClientPaymentsPage() {
	return <PaymentsShell surface="client" />;
}
