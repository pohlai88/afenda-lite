import { AUTH_SIGN_OUT_PATH, JOIN_PATH } from "@afenda/auth/client";
import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { PublicMessageShell } from "@/features/auth/public-message-shell";

/**
 * Signed-in `/` when Neon session has no resolvable organization (invite
 * not accepted, multi-org without allowlist, etc.).
 * Must never render The Machine marketing landing or point at public self-signup.
 */
export function UnresolvedOrganizationShell() {
	return (
		<PublicMessageShell
			title="Organization required"
			footer={
				<div className="mt-2 flex flex-wrap items-center justify-center gap-3">
					<Button asChild variant="outline">
						<Link href={JOIN_PATH}>Have an invitation?</Link>
					</Button>
					<Button asChild variant="ghost">
						<Link href={AUTH_SIGN_OUT_PATH}>Sign out</Link>
					</Button>
				</div>
			}
		>
			<p>
				Your account is signed in, but it is not a member of an organization
				yet. Open the invitation link from your email, or ask an administrator
				to invite you.
			</p>
		</PublicMessageShell>
	);
}
