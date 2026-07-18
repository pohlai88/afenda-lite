"use client";

import type { PublicAuthPath } from "@afenda/auth/client";
import { AuthView } from "@neondatabase/auth-ui";
import { type ReactNode, useEffect } from "react";

import { signOutAction } from "@/app/actions/auth-credentials";
import { AfendaSignInForm } from "@/features/auth/afenda-sign-in-form";
import { AfendaSignUpForm } from "@/features/auth/afenda-sign-up-form";
import { AuthSurfaceChrome } from "@/features/auth/auth-surface-chrome";
import { LocalAuthCredentialFill } from "@/features/auth/local-auth-credential-fill";
import type { LocalAuthCredentials } from "@/features/auth/local-auth-credentials";

type AuthPathShellProps = {
	path: PublicAuthPath;
	/** Development-only operator / preview credentials for login autofill. */
	localCredentials?: LocalAuthCredentials | null;
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
 * Public `/auth/[path]` shell — Path A Afenda forms for login/sign-up/sign-out;
 * Neon `AuthView` for forgot/reset (SDK reset incomplete per Neon docs).
 */
export function AuthPathShell({
	path,
	localCredentials = null,
}: AuthPathShellProps) {
	let body: ReactNode;
	switch (path) {
		case "login":
			body = (
				<>
					<AfendaSignInForm />
					{localCredentials ? (
						<LocalAuthCredentialFill credentials={localCredentials} />
					) : null}
				</>
			);
			break;
		case "sign-up":
			body = <AfendaSignUpForm />;
			break;
		case "forgot-password":
		case "reset-password":
			body = <AuthView pathname={path} />;
			break;
		case "sign-out":
			body = <SignOutRunner />;
			break;
		default: {
			const _exhaustive: never = path;
			body = _exhaustive;
		}
	}

	return <AuthSurfaceChrome>{body}</AuthSurfaceChrome>;
}
