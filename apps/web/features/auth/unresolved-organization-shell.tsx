import { authBrowser } from "@afenda/auth/client";
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
			footer={
				<div className="mt-2 flex flex-wrap items-center justify-center gap-3">
					<Button asChild variant="outline">
						<Link href={authBrowser.paths.join.path}>Have an invitation?</Link>
					</Button>
					<Button asChild variant="ghost">
						<Link href={authBrowser.paths.signOut}>Sign out</Link>
					</Button>
				</div>
			}
			title="Organization required"
		>
			<p>
				Your account is signed in, but it is not a member of an organization
				yet. Open the invitation link from your email, or ask an administrator
				to invite you.
			</p>
		</PublicMessageShell>
	);
}
