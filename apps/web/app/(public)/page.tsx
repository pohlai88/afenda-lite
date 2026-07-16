import {
	AUTH_LOGIN_PATH,
	getApiSession,
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
 * the public shell. `getApiSession` is null-safe (no anonymous login redirect).
 */
export default async function HomePage({ searchParams }: HomePageProps) {
	const session = await getApiSession();
	if (session) {
		const query = await searchParams;
		const rawCallback = query[POST_LOGIN_CALLBACK_PARAM];
		const callbackUrl = Array.isArray(rawCallback) ? undefined : rawCallback;
		redirect(resolvePostLoginPath({ role: session.role, callbackUrl }));
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
