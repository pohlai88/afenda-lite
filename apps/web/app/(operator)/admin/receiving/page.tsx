import { ReceivingShell } from "@/features/receiving/receiving-shell";

/** Operator admin receiving — session + `receiving.receipt.*` permissions. */
export default function AdminReceivingPage() {
	return <ReceivingShell surface="admin" />;
}
