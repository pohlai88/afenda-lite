import { AUTH_LOGIN_PATH } from "@afenda/auth/client";
import { Button, cn } from "@afenda/ui-system";
import Link from "next/link";
import type { ComponentProps } from "react";

type SignInButtonProps = Pick<
	ComponentProps<typeof Button>,
	"variant" | "className"
> & {
	/**
	 * `machine` — champagne dual-frame CTA for The Machine / lynx landing.
	 * Default keeps auth message-shell variants (outline / secondary).
	 *
	 * **CLOSED (edit-forbidden):** `surface="machine"` visual DNA is locked.
	 * Do not restyle, invent `--auth-signin-*` tokens, or apply global vault kits
	 * without an explicit reopen letter in the chat turn.
	 */
	surface?: "default" | "machine";
};

/**
 * Canonical Sign in CTA — always targets AUTH_LOGIN_PATH (PL-S2 · auth shells).
 *
 * Machine surface chrome: CLOSED — see deprecation register · Closed product phases.
 */
export function SignInButton({
	variant,
	className,
	surface = "default",
}: SignInButtonProps) {
	if (surface === "machine") {
		return (
			<Button
				asChild
				variant="ghost"
				className={cn(
					"sign-in-button sign-in-button--machine ring-0 focus-visible:ring-0",
					className,
				)}
			>
				<Link href={AUTH_LOGIN_PATH}>
					<span aria-hidden="true" className="sign-in-button__mark" />
					<span className="sign-in-button__label">Sign in</span>
				</Link>
			</Button>
		);
	}

	return (
		<Button
			asChild
			variant={variant}
			className={cn("sign-in-button", className)}
		>
			<Link href={AUTH_LOGIN_PATH}>Sign in</Link>
		</Button>
	);
}
