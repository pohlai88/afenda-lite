import { PayablesShell } from "@/features/payables/payables-shell";

/** Operator admin payables — session + `payables.read` / manage. */
export default function AdminPayablesPage() {
	return <PayablesShell surface="admin" />;
}
