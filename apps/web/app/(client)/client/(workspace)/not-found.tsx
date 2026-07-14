import Link from "next/link";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";
import { PublicMessageShell } from "@/features/auth/public-message-shell";

export default function ClientWorkspaceNotFound() {
	return (
		<PublicMessageShell
			title="Not found"
			footer={
				<Link
					href={CLIENT_DASHBOARD_PATH}
					className="mt-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground"
				>
					Back to dashboard
				</Link>
			}
		>
			<p className="text-sm">That client workspace page does not exist.</p>
		</PublicMessageShell>
	);
}
