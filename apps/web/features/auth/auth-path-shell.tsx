"use client";

import type { PublicAuthPath } from "@afenda/auth/client";
import { AuthView } from "@neondatabase/auth-ui";
import { useEffect } from "react";

import { signOutAction } from "@/app/actions/auth-credentials";
import { AfendaSignInForm } from "@/features/auth/afenda-sign-in-form";

type AuthPathShellProps = {
	path: PublicAuthPath;
};

function SignOutRunner() {
	useEffect(() => {
		void signOutAction();
	}, []);

	return (
		<p className="text-sm text-muted-foreground" role="status">
			Signing out…
		</p>
	);
}

/**
 * Public `/auth/[path]` panel body — Path A Afenda form for login/sign-out;
 * Neon `AuthView` for forgot/reset (SDK reset incomplete per Neon docs).
 * Cinematic chrome is owned by AuthIslandLayout (does not remount on path change).
 * Invitee onboarding is `/join` only — no public self-signup surface.
 */
export function AuthPathShell({ path }: AuthPathShellProps) {
	switch (path) {
		case "login":
			return <AfendaSignInForm />;
		case "forgot-password":
		case "reset-password":
			return <AuthView pathname={path} />;
		case "sign-out":
			return <SignOutRunner />;
		default: {
			const _exhaustive: never = path;
			return _exhaustive;
		}
	}
}
