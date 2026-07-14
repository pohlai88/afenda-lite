import {
	isPublicAuthPath,
	PUBLIC_AUTH_PATHS,
	type PublicAuthPath,
} from "@afenda/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthViewShell } from "@/features/auth/auth-view-shell";

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
 */
export default async function AuthPage({ params }: AuthPageProps) {
	const { path } = await params;
	if (!isPublicAuthPath(path)) {
		notFound();
	}
	return <AuthViewShell path={path} />;
}
