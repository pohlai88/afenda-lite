import {
	getAuthBootstrap,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
} from "@afenda/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TheMachineLanding } from "@/features/landing/the-machine-landing";

type HomePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
	title: "Afenda — The Machine",
	description:
		"The Machine by Afenda — purpose-bound enterprise intelligence for protection, detection, and response.",
};

/**
 * Public landing (`/`).
 *
 * Anonymous visitors get The Machine (`features/landing`). N7 signed-in bounce:
 * authenticated visitors never dead-end on `/` — governed resolver sends them
 * to a safe same-origin callback or coarse role home.
 *
 * N8: session without active org → ensure Route Handler; getSession Set-Cookie
 * needs → sync Route Handler first.
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
		case "sync_cookies":
			return redirect(bootstrap.url);
		case "ensure_active_org":
			return redirect(bootstrap.url);
		case "ready":
			return redirect(
				resolvePostLoginPath({
					role: bootstrap.session.role,
					callbackUrl,
				}),
			);
		case "anonymous":
			return <TheMachineLanding />;
		default: {
			const _exhaustive: never = bootstrap;
			return _exhaustive;
		}
	}
}
