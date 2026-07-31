import { authServer, type PublicAuthPath } from "@afenda/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthPathShell } from "@/features/auth/auth-path-shell";

interface AuthPageProps {
	params: Promise<{ path: string }>;
}

const AUTH_TITLES: Record<PublicAuthPath, string> = {
	[authServer.paths.view.SIGN_IN]: "Sign in",
	[authServer.paths.view.FORGOT_PASSWORD]: "Forgot password",
	[authServer.paths.view.RESET_PASSWORD]: "Reset password",
	[authServer.paths.view.SIGN_OUT]: "Sign out",
};

/** Reject undeclared segments (e.g. `/auth/sign-in`, `/auth/sign-up`) with a hard 404 — not a soft island fallback. */
export const dynamicParams = false;

export function generateStaticParams() {
	return authServer.paths.publicSegments.map((path) => ({ path }));
}

export async function generateMetadata({
	params,
}: AuthPageProps): Promise<Metadata> {
	const { path } = await params;
	if (!authServer.paths.isPublicAuth(path)) {
		return { title: "Auth" };
	}
	return { title: AUTH_TITLES[path] };
}

/**
 * Public `/auth/*` — Path A Afenda credential forms + Neon AuthView for forgot/reset.
 * Post-login callback safety (N7): Path A via `signInAction`;
 * Neon residual via `AuthUiProvider`. Invitee credential creation is `/join` only.
 */
export default async function AuthPage({ params }: AuthPageProps) {
	const { path } = await params;
	if (!authServer.paths.isPublicAuth(path)) {
		notFound();
	}
	return <AuthPathShell path={path} />;
}
