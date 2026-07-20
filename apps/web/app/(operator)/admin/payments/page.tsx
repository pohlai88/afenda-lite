import { PaymentsShell } from "@/features/payments/payments-shell";

/** Operator admin payments — session + `payments.read` / manage. */
export default function AdminPaymentsPage() {
	return <PaymentsShell surface="admin" />;
}
