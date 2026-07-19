"use client";

import { JOIN_PATH } from "@afenda/auth/client";
import { Button, Spinner } from "@afenda/ui-system";
import {
	AcceptInvitationCard,
	AuthLoading,
	authLocalization,
	SignedIn,
	SignedOut,
	SignInForm,
	SignUpForm,
} from "@neondatabase/auth-ui";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type InviteeAuthMode = "sign-up" | "sign-in";

function buildJoinReturnPath(invitationId: string): string {
	const query = new URLSearchParams({ invitationId });
	return `${JOIN_PATH}?${query.toString()}`;
}

/**
 * Invite-gated Neon credentials on `/join` only — not a public auth path.
 * After auth, `redirectTo` returns here so `AcceptInvitationCard` can accept.
 */
function InviteeJoinCredentials({
	joinReturnPath,
}: {
	joinReturnPath: string;
}) {
	const [mode, setMode] = useState<InviteeAuthMode>("sign-up");
	const neonCredentialFormProps = {
		redirectTo: joinReturnPath,
		localization: authLocalization,
	} as const;

	return (
		<div className="flex w-full flex-col gap-(--field-gap)">
			{mode === "sign-up" ? (
				<SignUpForm {...neonCredentialFormProps} />
			) : (
				<SignInForm {...neonCredentialFormProps} />
			)}
			<p className="text-center text-sm text-foreground-secondary">
				{mode === "sign-up" ? (
					<>
						Already have an account?{" "}
						<Button
							type="button"
							variant="link"
							className="h-auto p-0 text-foreground"
							onClick={() => setMode("sign-in")}
						>
							Sign in
						</Button>
					</>
				) : (
					<>
						Need an account for this invitation?{" "}
						<Button
							type="button"
							variant="link"
							className="h-auto p-0 text-foreground"
							onClick={() => setMode("sign-up")}
						>
							Create account
						</Button>
					</>
				)}
			</p>
		</div>
	);
}

/**
 * Neon Auth accept-invitation UI for `/join?invitationId=…` (GUIDE-018 I1.3).
 * Signed-out invitees stay on `/join` for credential create/sign-in (invitation
 * only). Signed-in users see `AcceptInvitationCard` — no bounce to `/auth/login`.
 * Cinematic chrome is owned by AuthIslandLayout.
 */
export function JoinShell() {
	const searchParams = useSearchParams();
	const invitationId = searchParams.get("invitationId")?.trim() ?? "";
	const joinReturnPath =
		invitationId.length > 0 ? buildJoinReturnPath(invitationId) : JOIN_PATH;

	return (
		<>
			<AuthLoading>
				<div
					className="flex items-center justify-center gap-2 py-4"
					role="status"
				>
					<Spinner size="sm" label="Loading invitation" />
				</div>
			</AuthLoading>
			<SignedIn>
				<AcceptInvitationCard />
			</SignedIn>
			<SignedOut>
				{invitationId.length > 0 ? (
					<InviteeJoinCredentials joinReturnPath={joinReturnPath} />
				) : null}
			</SignedOut>
		</>
	);
}
