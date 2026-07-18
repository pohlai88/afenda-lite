"use client";

import { JOIN_PATH } from "@afenda/auth/client";
import {
	AcceptInvitationCard,
	AuthLoading,
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

	return (
		<div className="flex w-full flex-col gap-(--field-gap)">
			{mode === "sign-up" ? (
				<SignUpForm redirectTo={joinReturnPath} />
			) : (
				<SignInForm redirectTo={joinReturnPath} />
			)}
			<p className="text-center text-sm text-foreground-secondary">
				{mode === "sign-up" ? (
					<>
						Already have an account?{" "}
						<button
							type="button"
							className="text-foreground underline"
							onClick={() => setMode("sign-in")}
						>
							Sign in
						</button>
					</>
				) : (
					<>
						Need an account for this invitation?{" "}
						<button
							type="button"
							className="text-foreground underline"
							onClick={() => setMode("sign-up")}
						>
							Create account
						</button>
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
				<p className="text-sm text-foreground-secondary" role="status">
					Loading invitation…
				</p>
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
