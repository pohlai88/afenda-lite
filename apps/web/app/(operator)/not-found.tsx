import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { OPERATOR_ADMIN_PATH } from "@/features/auth/operator-paths";
import { PublicMessageShell } from "@/features/auth/public-message-shell";

export default function OperatorNotFound() {
	return (
		<PublicMessageShell
			asLandmark={false}
			title="Not found"
			footer={
				<Button asChild variant="outline" className="mt-2">
					<Link href={OPERATOR_ADMIN_PATH}>Back to admin</Link>
				</Button>
			}
		>
			<p className="max-w-sm text-sm text-foreground-secondary">
				That operator page does not exist.
			</p>
		</PublicMessageShell>
	);
}
