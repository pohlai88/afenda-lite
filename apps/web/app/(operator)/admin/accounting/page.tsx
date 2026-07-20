import { AccountingShell } from "@/features/accounting/accounting-shell";

/** Operator admin accounting — session + `accounting.read` / manage. */
export default function AdminAccountingPage() {
	return <AccountingShell surface="admin" />;
}
