import { AUTH_LOGIN_PATH } from "@afenda/auth";
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
				<Link
					href={AUTH_LOGIN_PATH}
					className="mt-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground"
				>
					Sign in
				</Link>
			}
		>
			<p>
				This client preview is not available. Sign in with an invited account or
				contact your operator.
			</p>
		</PublicMessageShell>
	);
}
