import { resolveAuthUiOrigin } from "@afenda/auth";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { AuthUiProvider } from "@/features/auth/auth-ui-provider";

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
		<Suspense fallback={null}>
			<AuthUiProvider appOrigin={appOrigin}>{children}</AuthUiProvider>
		</Suspense>
	);
}
