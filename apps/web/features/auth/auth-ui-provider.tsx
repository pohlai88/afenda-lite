"use client";

import {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_BASE_PATH,
	getBrowserAuthClient,
} from "@afenda/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
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
 * Neon Auth UI island — credentials · forgot/reset · invitee sign-up (ARCH-026 · I1.3).
 * Auth SDK client comes from `@afenda/auth/client`; no app-side SMTP.
 * `signUp` is enabled so invitation accept can create credentials before accept.
 */
export function AuthUiProvider({ appOrigin, children }: AuthUiProviderProps) {
	const router = useRouter();
	const authClient = getBrowserAuthClient();

	return (
		<NeonAuthUIProvider
			authClient={authClient}
			basePath={AUTH_BASE_PATH}
			baseURL={appOrigin}
			credentials={{ forgotPassword: true }}
			defaultTheme="light"
			Link={AuthUiLink}
			navigate={router.push}
			onSessionChange={() => {
				router.refresh();
			}}
			redirectTo="/"
			replace={router.replace}
			signUp
			viewPaths={AFENDA_AUTH_VIEW_PATHS}
		>
			{children}
		</NeonAuthUIProvider>
	);
}
