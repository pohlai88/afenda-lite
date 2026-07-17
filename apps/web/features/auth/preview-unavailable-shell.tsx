import { PublicMessageShell } from "@/features/auth/public-message-shell";
import { SignInButton } from "@/features/auth/sign-in-button";

/**
 * Client preview gate — session-gate bypass (ARCH-012).
 * Shown when a preview/share URL is not available to the client product.
 */
export function PreviewUnavailableShell() {
	return (
		<PublicMessageShell
			title="Preview unavailable"
			footer={<SignInButton variant="outline" className="mt-2" />}
		>
			<p>
				This client preview is not available. Sign in with an invited account or
				contact your operator.
			</p>
		</PublicMessageShell>
	);
}
