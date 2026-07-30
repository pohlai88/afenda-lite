import { PublicMessageShell } from "@/features/auth/public-message-shell";
import { SignInButton } from "@/features/auth/sign-in-button";

/**
 * Auth feature — access-denied shell for `/403` (ARCH-026 · ARCH-028 S7.4).
 * Presentation only; role gates live in `@afenda/auth` `requireRole`.
 */
export function ForbiddenShell() {
	return (
		<PublicMessageShell
			footer={<SignInButton className="mt-2" variant="outline" />}
			title="Access denied"
		>
			<p>You do not have access to this surface.</p>
		</PublicMessageShell>
	);
}
