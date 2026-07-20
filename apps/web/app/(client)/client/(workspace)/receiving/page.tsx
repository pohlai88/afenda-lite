import { ReceivingShell } from "@/features/receiving/receiving-shell";

/** Client workspace receiving — session + `receiving.read` / manage. */
export default function ClientReceivingPage() {
	return <ReceivingShell surface="client" />;
}
