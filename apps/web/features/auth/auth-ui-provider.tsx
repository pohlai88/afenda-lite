"use client";

import {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_BASE_PATH,
	getBrowserAuthClient,
	POST_LOGIN_CALLBACK_PARAM,
	sanitizeCallbackUrl,
} from "@afenda/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type AuthUiProviderProps = {
	/**
	 * Live request origin for password-reset / callback links
	 * (`resolveAuthUiOrigin` — not a hard-coded production APP_URL alone).
	 */
	appOrigin: string;
	children: ReactNode;
};

/** Matches `@daveyplate/better-auth-ui` `Link` contract (href + children). */
function AuthUiLink({
	href,
	className,
	children,
}: {
	href: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<NextLink href={href} className={className}>
			{children}
		</NextLink>
	);
}

/**
 * Resolve a navigation target the Neon Auth UI may hand us.
 *
 * Relative same-origin paths pass the allowlist. Absolute same-origin URLs are
 * reduced to their path (so internal auth view switches keep working). Anything
 * external / protocol-relative / scheme-prefixed falls back to `/` — the
 * signed-in bounce hub that resolves the coarse role home.
 */
function toSafeNavigatePath(href: string): string {
	let candidate = href;
	if (href.startsWith("http://") || href.startsWith("https://")) {
		try {
			const url = new URL(href);
			if (
				typeof window !== "undefined" &&
				url.origin === window.location.origin
			) {
				candidate = `${url.pathname}${url.search}${url.hash}`;
			} else {
				return "/";
			}
		} catch {
			return "/";
		}
	}
	return sanitizeCallbackUrl(candidate) ?? "/";
}

/**
 * Neon Auth UI island — credentials · forgot/reset · invitee sign-up (ARCH-026 · I1.3).
 * Auth SDK client comes from `@afenda/auth/client`; no app-side SMTP.
 * `signUp` is enabled so invitation accept can create credentials before accept.
 *
 * `NeonAuthUIProvider` nests `next-themes` ThemeProvider. Repo `pnpm.patchedDependencies`
 * omits ThemeScript entirely (`patches/next-themes@0.4.6.patch`) so React 19 does not
 * warn on client `<script>` and SSR/client trees stay aligned (theme still applies via
 * ThemeProvider effects; auth island forces `defaultTheme="light"`).
 *
 * N7: the `redirectTo` prop is the sanitized query callback (or `/`), and every
 * navigate/replace destination is re-checked through the same allowlist so an
 * unsanitized value can never drive a post-login redirect.
 *
 * Must render under a Suspense boundary (`useSearchParams`).
 */
export function AuthUiProvider({ appOrigin, children }: AuthUiProviderProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const authClient = getBrowserAuthClient();

	const redirectTo =
		sanitizeCallbackUrl(searchParams.get(POST_LOGIN_CALLBACK_PARAM)) ?? "/";

	const navigateSafe = (href: string) => {
		router.push(toSafeNavigatePath(href));
	};
	const replaceSafe = (href: string) => {
		router.replace(toSafeNavigatePath(href));
	};

	return (
		<NeonAuthUIProvider
			authClient={authClient}
			basePath={AUTH_BASE_PATH}
			baseURL={appOrigin}
			credentials={{ forgotPassword: true }}
			defaultTheme="light"
			Link={AuthUiLink}
			navigate={navigateSafe}
			onSessionChange={() => {
				router.refresh();
			}}
			redirectTo={redirectTo}
			replace={replaceSafe}
			signUp
			viewPaths={AFENDA_AUTH_VIEW_PATHS}
		>
			{children}
		</NeonAuthUIProvider>
	);
}
