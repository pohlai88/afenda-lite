"use client";

import { AuthView } from "@neondatabase/auth-ui";

import { AuthSurfaceChrome } from "@/features/auth/auth-surface-chrome";

type AuthViewShellProps = {
	path: string;
};

/**
 * Neon Auth UI forms for login · forgot-password · reset-password · sign-out · sign-up.
 * Auth island chrome only — session resolution stays in `@afenda/auth`.
 */
export function AuthViewShell({ path }: AuthViewShellProps) {
	return (
		<AuthSurfaceChrome>
			<AuthView pathname={path} />
		</AuthSurfaceChrome>
	);
}
