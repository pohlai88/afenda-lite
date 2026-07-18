import {
	AFENDA_AUTH_VIEW_PATHS,
	isPublicAuthPath,
	PUBLIC_AUTH_PATHS,
	type PublicAuthPath,
} from "@afenda/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthPathShell } from "@/features/auth/auth-path-shell";

type AuthPageProps = {
	params: Promise<{ path: string }>;
};

const AUTH_TITLES: Record<PublicAuthPath, string> = {
	[AFENDA_AUTH_VIEW_PATHS.SIGN_IN]: "Sign in",
	[AFENDA_AUTH_VIEW_PATHS.FORGOT_PASSWORD]: "Forgot password",
	[AFENDA_AUTH_VIEW_PATHS.RESET_PASSWORD]: "Reset password",
	[AFENDA_AUTH_VIEW_PATHS.SIGN_OUT]: "Sign out",
	[AFENDA_AUTH_VIEW_PATHS.SIGN_UP]: "Sign up",
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
 * Public `/auth/*` — Path A Afenda credential forms + Neon AuthView for forgot/reset.
 * Post-login callback safety (N7): Path A via `signInAction` / `signUpAction`;
 * Neon residual via `AuthUiProvider`.
 */
export default async function AuthPage({ params }: AuthPageProps) {
	const { path } = await params;
	if (!isPublicAuthPath(path)) {
		notFound();
	}
	return <AuthPathShell path={path} />;
}
