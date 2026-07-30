import { Buffer } from "node:buffer";

import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import type { AuditCursorPosition } from "./types";

export const MAX_AUDIT_CURSOR_LENGTH = 1024 as const;

const auditCursorPayloadSchema = z
	.object({
		version: z.literal(1),
		createdAt: z.string().datetime(),
		id: z.string().trim().min(1).max(256),
	})
	.strict();

export function encodeAuditCursor(position: AuditCursorPosition): string {
	return Buffer.from(
		JSON.stringify({
			version: 1,
			createdAt: position.createdAt.toISOString(),
			id: position.id,
		}),
		"utf8",
	).toString("base64url");
}

export function decodeAuditCursor(input: unknown): Result<AuditCursorPosition> {
	const encoded = z
		.string()
		.min(1)
		.max(MAX_AUDIT_CURSOR_LENGTH)
		.safeParse(input);
	if (!encoded.success) {
		return fail("BAD_REQUEST", "Invalid audit cursor");
	}

	try {
		const decoded: unknown = JSON.parse(
			Buffer.from(encoded.data, "base64url").toString("utf8"),
		);
		const payload = auditCursorPayloadSchema.safeParse(decoded);
		if (!payload.success) {
			return fail("BAD_REQUEST", "Invalid audit cursor");
		}
		return ok({
			createdAt: new Date(payload.data.createdAt),
			id: payload.data.id,
		});
	} catch {
		return fail("BAD_REQUEST", "Invalid audit cursor");
	}
}
