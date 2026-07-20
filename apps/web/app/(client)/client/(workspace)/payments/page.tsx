import { PaymentsShell } from "@/features/payments/payments-shell";

/** Client workspace payments — session + `payments.payment.read` / manage perms. */
export default function ClientPaymentsPage() {
	return <PaymentsShell surface="client" />;
}
