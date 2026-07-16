import { AUTH_LOGIN_PATH } from "@afenda/auth";
import { Button } from "@afenda/ui-system";
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
				<Button asChild variant="outline" className="mt-2">
					<Link href={AUTH_LOGIN_PATH}>Sign in</Link>
				</Button>
			}
		>
			<p>You do not have access to this surface.</p>
		</PublicMessageShell>
	);
}
