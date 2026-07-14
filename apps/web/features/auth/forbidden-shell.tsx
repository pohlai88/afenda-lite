import { AUTH_LOGIN_PATH } from "@afenda/auth";
import Link from "next/link";

import { PublicMessageShell } from "@/features/auth/public-message-shell";

/**
 * Auth feature — access-denied shell for `/403` (ARCH-026 · ARCH-028 S7.4).
 * Presentation only; role gates live in `@afenda/auth` `requireRole`.
 */
export function ForbiddenShell() {
	return (
		<PublicMessageShell
			title="403"
			footer={
				<Link
					href={AUTH_LOGIN_PATH}
					className="mt-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground"
				>
					Sign in
				</Link>
			}
		>
			<p>You do not have access to this surface.</p>
		</PublicMessageShell>
	);
}
