import {
	AUTH_LOGIN_PATH,
	getAuthBootstrap,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
} from "@afenda/auth";
import { Button } from "@afenda/ui-system";
import Link from "next/link";
import { redirect } from "next/navigation";

type HomePageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Public landing.
 *
 * N7 signed-in bounce: an authenticated visitor never dead-ends on `/`. The
 * governed resolver (`@afenda/auth`) sends them to a safe same-origin callback
 * when present, otherwise to their coarse role home. Anonymous visitors keep
 * the public shell.
 *
 * N8: when Neon Auth has a session but no active organization yet, bounce
 * through the cookie-safe ensure Route Handler before role-home resolution.
 * When getSession needs Set-Cookie (session_data mint / refresh) in RSC,
 * bounce through the cookie-safe sync Route Handler first.
 */
export default async function HomePage({ searchParams }: HomePageProps) {
	const query = await searchParams;
	const rawCallback = query[POST_LOGIN_CALLBACK_PARAM];
	const callbackUrl = Array.isArray(rawCallback) ? undefined : rawCallback;
	// Omit bare `/` as ensure/sync `next` — those handlers already resolve role
	// home. Passing `next=/` created ensure↔`/` bounce risk when session_data
	// cookies lagged behind Neon Auth server state.
	const bootstrap = await getAuthBootstrap(callbackUrl);

	if (bootstrap.state === "sync_cookies") {
		redirect(bootstrap.url);
	}
	if (bootstrap.state === "ensure_active_org") {
		redirect(bootstrap.url);
	}
	if (bootstrap.state === "ready") {
		redirect(
			resolvePostLoginPath({
				role: bootstrap.session.role,
				callbackUrl,
			}),
		);
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4">
			<h1 className="text-2xl font-semibold tracking-tight">Afenda-Lite</h1>
			<p className="max-w-md text-center text-sm text-foreground-secondary">
				Public shell. Operator and client surfaces are role-gated after sign-in.
			</p>
			<Button asChild>
				<Link href={AUTH_LOGIN_PATH}>Sign in</Link>
			</Button>
		</main>
	);
}
