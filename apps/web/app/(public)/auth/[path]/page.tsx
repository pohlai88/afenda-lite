import {
	isPublicAuthPath,
	PUBLIC_AUTH_PATHS,
	type PublicAuthPath,
} from "@afenda/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthViewShell } from "@/features/auth/auth-view-shell";
import { resolveLocalAuthCredentials } from "@/features/auth/local-auth-credentials";

type AuthPageProps = {
	params: Promise<{ path: string }>;
};

const AUTH_TITLES: Record<PublicAuthPath, string> = {
	login: "Sign in",
	"forgot-password": "Forgot password",
	"reset-password": "Reset password",
	"sign-out": "Sign out",
	"sign-up": "Sign up",
};

/** Reject undeclared segments (e.g. `/auth/sign-in`) with a hard 404 — not a soft island fallback. */
export const dynamicParams = false;

export function generateStaticParams() {
	return PUBLIC_AUTH_PATHS.map((path) => ({ path }));
}

export async function generateMetadata({
	params,
}: AuthPageProps): Promise<Metadata> {
	const { path } = await params;
	if (!isPublicAuthPath(path)) {
		return { title: "Auth" };
	}
	return { title: AUTH_TITLES[path] };
}

/**
 * Neon Auth UI paths under `/auth/*`.
 * Neon mail `/auth/accept-invitation` is a sibling segment → `/join`.
 *
 * Post-login callback safety (N7) is enforced in `AuthUiProvider`, which
 * sanitizes every navigation the Neon Auth UI performs. A server redirect here
 * is intentionally avoided: the sibling `error.tsx` boundary soft-catches
 * `redirect()`, so the client provider is the reliable governed choke point.
 */
export default async function AuthPage({ params }: AuthPageProps) {
	const { path } = await params;
	if (!isPublicAuthPath(path)) {
		notFound();
	}
	const localCredentials =
		path === "login" ? resolveLocalAuthCredentials() : null;
	return <AuthViewShell path={path} localCredentials={localCredentials} />;
}
