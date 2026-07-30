import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";
import { PublicMessageShell } from "@/features/auth/public-message-shell";

export default function ClientWorkspaceNotFound() {
	return (
		<PublicMessageShell
			asLandmark={false}
			footer={
				<Button asChild className="mt-2" variant="outline">
					<Link href={CLIENT_DASHBOARD_PATH}>Back to home</Link>
				</Button>
			}
			title="Page not found"
		>
			<p className="text-sm">That client workspace page does not exist.</p>
		</PublicMessageShell>
	);
}
