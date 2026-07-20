import { PayablesShell } from "@/features/payables/payables-shell";

/** Client workspace payables — session + `payables.read` / manage. */
export default function ClientPayablesPage() {
	return <PayablesShell surface="client" />;
}
