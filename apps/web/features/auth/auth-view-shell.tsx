"use client";

import type { PublicAuthPath } from "@afenda/auth/client";
import { AuthView } from "@neondatabase/auth-ui";

import { AuthSurfaceChrome } from "@/features/auth/auth-surface-chrome";
import { LocalAuthCredentialFill } from "@/features/auth/local-auth-credential-fill";
import type { LocalAuthCredentials } from "@/features/auth/local-auth-credentials";

type AuthViewShellProps = {
	path: PublicAuthPath;
	/** Development-only operator / preview credentials for login autofill. */
	localCredentials?: LocalAuthCredentials | null;
};

/**
 * Neon Auth UI forms for login · forgot-password · reset-password · sign-out · sign-up.
 * Auth island chrome only — session resolution stays in `@afenda/auth`.
 */
export function AuthViewShell({
	path,
	localCredentials = null,
}: AuthViewShellProps) {
	return (
		<AuthSurfaceChrome>
			<AuthView pathname={path} />
			{path === "login" && localCredentials ? (
				<LocalAuthCredentialFill credentials={localCredentials} />
			) : null}
		</AuthSurfaceChrome>
	);
}
