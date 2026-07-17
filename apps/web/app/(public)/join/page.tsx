import { JOIN_PATH } from "@afenda/auth";
import type { Metadata } from "next";

import { JoinShell } from "@/features/auth/join-shell";
import { PublicMessageShell } from "@/features/auth/public-message-shell";
import { SignInButton } from "@/features/auth/sign-in-button";

type JoinPageProps = {
	searchParams: Promise<{ invitationId?: string }>;
};

export const metadata: Metadata = {
	title: "Join",
};

/**
 * Canonical invitation entry — `/join?invitationId=…` (ARCH-026 · GUIDE-018 I1.3).
 */
export default async function JoinPage({ searchParams }: JoinPageProps) {
	const { invitationId } = await searchParams;
	const id = invitationId?.trim();

	if (!id) {
		return (
			<PublicMessageShell
				title="Invitation required"
				footer={<SignInButton variant="outline" className="mt-2" />}
			>
				<p>
					Open the link from your invitation email. Expected shape:{" "}
					<code className="text-foreground">{JOIN_PATH}?invitationId=…</code>
				</p>
			</PublicMessageShell>
		);
	}

	return <JoinShell />;
}
