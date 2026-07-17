import { resolveAuthUiOrigin } from "@afenda/auth";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { AuthUiProvider } from "@/features/auth/auth-ui-provider";
import { MAIN_CONTENT_ID } from "@/features/auth/main-content";

/**
 * Shared Neon Auth island layout body — provider + origin only.
 * Route segments import island CSS themselves so the CSS stays co-located.
 *
 * Suspense wraps the provider because it reads `useSearchParams` for the N7
 * post-login callback allowlist.
 */
export async function AuthIslandLayout({ children }: { children: ReactNode }) {
	const appOrigin = await resolveAuthUiOrigin();
	return (
		<main id={MAIN_CONTENT_ID} tabIndex={-1} className="min-h-dvh">
			<Suspense fallback={null}>
				<AuthUiProvider appOrigin={appOrigin}>{children}</AuthUiProvider>
			</Suspense>
		</main>
	);
}
