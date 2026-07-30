import {
	getAuthBootstrap,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
} from "@afenda/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnresolvedOrganizationShell } from "@/features/auth/unresolved-organization-shell";
import { TheMachineLanding } from "@/features/landing/the-machine-landing";

interface HomePageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
	title: "Afenda — The Machine",
	description:
		"The Machine by Afenda — purpose-bound enterprise intelligence for protection, detection, and response.",
};

/**
 * Public landing (`/`).
 *
 * Anonymous visitors get The Machine (`features/landing`). N7 signed-in bounce:
 * ready sessions → governed resolver (callback or role home). N8: inactive but
 * resolvable org → ensure Route Handler; cookie mint → sync Route Handler.
 * Authenticated with no resolvable membership → UnresolvedOrganizationShell
 * (never marketing landing after sign-up).
 */
export default async function HomePage({ searchParams }: HomePageProps) {
	const query = await searchParams;
	const rawCallback = query[POST_LOGIN_CALLBACK_PARAM];
	const callbackUrl = Array.isArray(rawCallback) ? undefined : rawCallback;
	// Omit bare `/` as ensure/sync `next` — those handlers already resolve role
	// home. Passing `next=/` created ensure↔`/` bounce risk when session_data
	// cookies lagged behind Neon Auth server state.
	const bootstrap = await getAuthBootstrap(callbackUrl);
	switch (bootstrap.state) {
		// biome-ignore lint/suspicious/noUnnecessaryConditions: AuthBootstrap is an external discriminated union; this case is runtime-reachable.
		case "sync_cookies":
			return redirect(bootstrap.url);
		// biome-ignore lint/suspicious/noUnnecessaryConditions: AuthBootstrap is an external discriminated union; this case is runtime-reachable.
		case "ensure_active_org":
			return redirect(bootstrap.url);
		// biome-ignore lint/suspicious/noUnnecessaryConditions: AuthBootstrap is an external discriminated union; this case is runtime-reachable.
		case "ready":
			return redirect(
				resolvePostLoginPath({
					role: bootstrap.session.role,
					callbackUrl,
				}),
			);
		// biome-ignore lint/suspicious/noUnnecessaryConditions: AuthBootstrap is an external discriminated union; this case is runtime-reachable.
		case "unresolved_organization":
			return <UnresolvedOrganizationShell />;
		// biome-ignore lint/suspicious/noUnnecessaryConditions: AuthBootstrap is an external discriminated union; this case is runtime-reachable.
		case "anonymous":
			return <TheMachineLanding />;
		default: {
			const _exhaustive: never = bootstrap;
			return _exhaustive;
		}
	}
}
