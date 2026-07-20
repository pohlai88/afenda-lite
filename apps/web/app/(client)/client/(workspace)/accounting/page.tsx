import { AccountingShell } from "@/features/accounting/accounting-shell";

/** Client workspace accounting — session + `accounting.journal.read` / fine manage perms. */
export default function ClientAccountingPage() {
	return <AccountingShell surface="client" />;
}
