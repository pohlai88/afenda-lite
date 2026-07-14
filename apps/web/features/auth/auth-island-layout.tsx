import { resolveAuthUiOrigin } from "@afenda/auth";
import type { ReactNode } from "react";

import { AuthUiProvider } from "@/features/auth/auth-ui-provider";

/**
 * Shared Neon Auth island layout body — provider + origin only.
 * Route segments import island CSS themselves so the CSS stays co-located.
 */
export async function AuthIslandLayout({ children }: { children: ReactNode }) {
	const appOrigin = await resolveAuthUiOrigin();
	return <AuthUiProvider appOrigin={appOrigin}>{children}</AuthUiProvider>;
}
