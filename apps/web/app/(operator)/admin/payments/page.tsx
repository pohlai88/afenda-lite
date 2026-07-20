import { PaymentsShell } from "@/features/payments/payments-shell";

/** Operator admin payments — session + `payments.payment.read` / manage perms. */
export default function AdminPaymentsPage() {
	return <PaymentsShell surface="admin" />;
}
