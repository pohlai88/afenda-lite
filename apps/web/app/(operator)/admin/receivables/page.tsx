import { ReceivablesShell } from "@/features/receivables/receivables-shell";

/** Operator admin receivables — session + `receivables.read` / manage. */
export default function AdminReceivablesPage() {
	return <ReceivablesShell surface="admin" />;
}
