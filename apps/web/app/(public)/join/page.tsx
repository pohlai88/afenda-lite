import {
	JOIN_PATH,
	type JoinInvitationQuery,
	parseJoinInvitationQuery,
} from "@afenda/auth";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { JoinShell } from "@/features/auth/join-shell";
import { PublicMessageShell } from "@/features/auth/public-message-shell";
import { SignInButton } from "@/features/auth/sign-in-button";

type JoinPageProps = {
	searchParams: Promise<{ invitationId?: string | string[] }>;
};

export const metadata: Metadata = {
	title: "Join",
};

function joinMessageFooter(): ReactNode {
	return <SignInButton variant="outline" className="mt-2" />;
}

function renderJoinState(query: JoinInvitationQuery): ReactNode {
	switch (query.kind) {
		case "missing":
			return (
				<PublicMessageShell
					title="Invitation required"
					footer={joinMessageFooter()}
					asLandmark={false}
				>
					<p>
						Open the link from your invitation email. Expected shape:{" "}
						<code className="text-foreground">{JOIN_PATH}?invitationId=…</code>
					</p>
				</PublicMessageShell>
			);
		case "invalid":
			return (
				<PublicMessageShell
					title="Invalid invitation link"
					footer={joinMessageFooter()}
					asLandmark={false}
				>
					<p>
						This invitation link is not valid. Open the link from your
						invitation email, or sign in if you already have an account.
					</p>
				</PublicMessageShell>
			);
		case "present":
			return <JoinShell />;
		default: {
			const _exhaustive: never = query;
			return _exhaustive;
		}
	}
}

/**
 * Canonical invitation entry — `/join?invitationId=…` (ARCH-026 · PL-S4).
 * Structural query parse only; Neon owns accept/session; no membership write.
 */
export default async function JoinPage({ searchParams }: JoinPageProps) {
	const { invitationId } = await searchParams;
	return renderJoinState(parseJoinInvitationQuery(invitationId));
}
