import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { OPERATOR_ADMIN_PATH } from "@/features/auth/operator-paths";
import { PublicMessageShell } from "@/features/auth/public-message-shell";

export default function OperatorNotFound() {
	return (
		<PublicMessageShell
			asLandmark={false}
			footer={
				<Button asChild className="mt-2" variant="outline">
					<Link href={OPERATOR_ADMIN_PATH}>Back to admin</Link>
				</Button>
			}
			title="Page not found"
		>
			<p className="max-w-sm text-foreground-secondary text-sm">
				That operator page does not exist.
			</p>
		</PublicMessageShell>
	);
}
