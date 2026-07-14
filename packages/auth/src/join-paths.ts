/**
 * Canonical client invitation entry (AGENTS.md · ARCH-026 · GUIDE-018 I1.3).
 * Neon Auth email links may land on `/auth/accept-invitation` — Afenda
 * redirects that surface to this path with `invitationId` preserved.
 */

export const JOIN_PATH = "/join" as const;

export type BuildJoinUrlInput = {
	invitationId: string;
	/** Absolute origin (`https://…`). Defaults to relative `/join?…` when omitted. */
	origin?: string;
};

/**
 * Build `/join?invitationId=…` (relative or absolute).
 * Trims and rejects empty invitation ids — never invents a placeholder.
 */
export function buildJoinUrl(input: BuildJoinUrlInput): string {
	const invitationId = input.invitationId.trim();
	if (invitationId.length === 0) {
		throw new Error(
			"@afenda/auth: buildJoinUrl requires a non-empty invitationId",
		);
	}

	const query = new URLSearchParams({ invitationId });
	const path = `${JOIN_PATH}?${query.toString()}`;

	if (!input.origin) {
		return path;
	}

	const origin = new URL(input.origin).origin;
	return `${origin}${path}`;
}
