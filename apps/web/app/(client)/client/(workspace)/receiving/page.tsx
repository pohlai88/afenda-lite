import { ReceivingShell } from "@/features/receiving/receiving-shell";

/** Client workspace receiving — session + `receiving.receipt.*` permissions. */
export default function ClientReceivingPage() {
	return <ReceivingShell surface="client" />;
}
