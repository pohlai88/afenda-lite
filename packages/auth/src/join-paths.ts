import { env } from "@afenda/env";

/**
 * Canonical client invitation entry (AGENTS.md · ARCH-026 · GUIDE-018 I1.3).
 * Neon Auth email links may land on `/auth/accept-invitation` — Afenda
 * redirects that surface to this path with `invitationId` preserved.
 */

export const JOIN_PATH = "/join" as const;

/** Structural ceiling for opaque Neon invitation ids (not a UUID gate). */
export const JOIN_INVITATION_ID_MAX_LENGTH = 256 as const;

/** C0 controls + DEL — char codes avoid Biome `noControlCharactersInRegex`. */
function joinInvitationHasControlChars(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code <= 0x1f || code === 0x7f) {
			return true;
		}
	}
	return false;
}

export type BuildJoinUrlInput = {
	invitationId: string;
	/** Absolute origin (`https://…`). Defaults to relative `/join?…` when omitted. */
	origin?: string;
};

/**
 * Join query parse result — structural only.
 * Neon invitation ids are opaque (not UUID-gated); never log the token.
 */
export type JoinInvitationQuery =
	| { kind: "missing" }
	| { kind: "invalid" }
	| { kind: "present"; invitationId: string };

/**
 * Validate `invitationId` searchParam without logging the value.
 * Missing/blank → missing; array/non-string/control/over-length → invalid;
 * opaque printable string (incl. probe `test`) → present for Neon handoff.
 */
export function parseJoinInvitationQuery(
	invitationId: unknown,
): JoinInvitationQuery {
	if (invitationId === undefined || invitationId === null) {
		return { kind: "missing" };
	}
	if (Array.isArray(invitationId)) {
		return { kind: "invalid" };
	}
	if (typeof invitationId !== "string") {
		return { kind: "invalid" };
	}

	const trimmed = invitationId.trim();
	if (trimmed.length === 0) {
		return { kind: "missing" };
	}
	if (trimmed.length > JOIN_INVITATION_ID_MAX_LENGTH) {
		return { kind: "invalid" };
	}
	if (joinInvitationHasControlChars(trimmed)) {
		return { kind: "invalid" };
	}

	return { kind: "present", invitationId: trimmed };
}

/**
 * Invitation emails must use the production app origin so accept links
 * are never minted from a localhost Operator Origin while APP_URL is prod.
 */
export function requireAppOrigin(): string {
	return new URL(env.APP_URL).origin;
}

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

/**
 * Absolute `/join?invitationId=…` under production `APP_URL` origin.
 * Neon Auth delivers invite mail via Zoho SMTP (ARCH-026); this helper only
 * mints the accept link — it does not send mail.
 */
export function buildInviteJoinUrl(invitationId: string): string {
	return buildJoinUrl({ invitationId, origin: requireAppOrigin() });
}
