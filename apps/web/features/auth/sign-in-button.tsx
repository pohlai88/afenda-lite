import { AUTH_LOGIN_PATH } from "@afenda/auth/client";
import { Button } from "@afenda/ui-system";
import Link from "next/link";
import type { ComponentProps } from "react";

type SignInButtonProps = Pick<
	ComponentProps<typeof Button>,
	"variant" | "className"
>;

/**
 * Canonical Sign in CTA — always targets AUTH_LOGIN_PATH (PL-S2 · auth shells).
 */
export function SignInButton({ variant, className }: SignInButtonProps) {
	return (
		<Button asChild variant={variant} className={className}>
			<Link href={AUTH_LOGIN_PATH}>Sign in</Link>
		</Button>
	);
}
