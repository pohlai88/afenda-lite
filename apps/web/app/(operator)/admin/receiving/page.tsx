import { ReceivingShell } from "@/features/receiving/receiving-shell";

/** Operator admin receiving — session + `receiving.read` / manage. */
export default function AdminReceivingPage() {
	return <ReceivingShell surface="admin" />;
}
