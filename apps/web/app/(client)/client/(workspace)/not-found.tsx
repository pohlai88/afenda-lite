import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";
import { PublicMessageShell } from "@/features/auth/public-message-shell";

export default function ClientWorkspaceNotFound() {
	return (
		<PublicMessageShell
			title="Not found"
			footer={
				<Button asChild variant="outline" className="mt-2">
					<Link href={CLIENT_DASHBOARD_PATH}>Back to declarations</Link>
				</Button>
			}
		>
			<p className="text-sm">That client workspace page does not exist.</p>
		</PublicMessageShell>
	);
}
