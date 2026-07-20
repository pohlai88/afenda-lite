import { ReceivablesShell } from "@/features/receivables/receivables-shell";

/** Client workspace receivables — session + fine-grained receivables permissions. */
export default function ClientReceivablesPage() {
	return <ReceivablesShell surface="client" />;
}
