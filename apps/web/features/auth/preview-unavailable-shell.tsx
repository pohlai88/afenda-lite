import { AUTH_LOGIN_PATH } from "@afenda/auth";
import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { PublicMessageShell } from "@/features/auth/public-message-shell";

/**
 * Client preview gate — session-gate bypass (ARCH-012).
 * Shown when a preview/share URL is not available to the client product.
 */
export function PreviewUnavailableShell() {
	return (
		<PublicMessageShell
			title="Preview unavailable"
			footer={
				<Button asChild variant="outline" className="mt-2">
					<Link href={AUTH_LOGIN_PATH}>Sign in</Link>
				</Button>
			}
		>
			<p>
				This client preview is not available. Sign in with an invited account or
				contact your operator.
			</p>
		</PublicMessageShell>
	);
}
