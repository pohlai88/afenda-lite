import { AccountingShell } from "@/features/accounting/accounting-shell";

/** Operator admin accounting — session + `accounting.journal.read` / fine manage perms. */
export default function AdminAccountingPage() {
	return <AccountingShell surface="admin" />;
}
