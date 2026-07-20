import { AccountingShell } from "@/features/accounting/accounting-shell";

/** Client workspace accounting — session + `accounting.read` / manage. */
export default function ClientAccountingPage() {
	return <AccountingShell surface="client" />;
}
