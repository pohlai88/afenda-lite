import { ReceivablesShell } from "@/features/receivables/receivables-shell";

/** Client workspace receivables — session + `receivables.read` / manage. */
export default function ClientReceivablesPage() {
	return <ReceivablesShell surface="client" />;
}
