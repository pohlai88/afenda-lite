import { ReceivablesShell } from "@/features/receivables/receivables-shell";

/** Operator admin receivables — session + fine-grained receivables permissions. */
export default function AdminReceivablesPage() {
	return <ReceivablesShell surface="admin" />;
}
