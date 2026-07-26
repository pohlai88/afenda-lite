import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../error-codes";

type AttendanceConnectorCursorPayload = {
	organizationId: string;
	token: string;
};

function encodePayload(payload: AttendanceConnectorCursorPayload): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(
	cursor: string,
): Result<AttendanceConnectorCursorPayload> {
	try {
		const parsed = JSON.parse(
			Buffer.from(cursor, "base64url").toString("utf8"),
		) as AttendanceConnectorCursorPayload;
		if (
			typeof parsed.organizationId !== "string" ||
			parsed.organizationId.length === 0 ||
			typeof parsed.token !== "string" ||
			parsed.token.length === 0
		) {
			return fail(
				"VALIDATION_ERROR",
				"Attendance connector cursor is malformed.",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}
		return ok(parsed);
	} catch {
		return fail(
			"VALIDATION_ERROR",
			"Attendance connector cursor is malformed.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
}

export function resolveAttendanceConnectorPullCursor(input: {
	organizationId: string;
	cursor?: string;
}): Result<{ pullCursor?: string }> {
	if (input.cursor === undefined) {
		return ok({});
	}
	const decoded = decodePayload(input.cursor);
	if (!decoded.ok) {
		return decoded;
	}
	if (decoded.data.organizationId !== input.organizationId) {
		return fail(
			"CONFLICT",
			"Attendance connector cursor belongs to a different organization.",
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		);
	}
	return ok({ pullCursor: decoded.data.token });
}

export function bindAttendanceConnectorCursor(input: {
	organizationId: string;
	nextToken?: string;
}): string | undefined {
	if (input.nextToken === undefined || input.nextToken.length === 0) {
		return undefined;
	}
	return encodePayload({
		organizationId: input.organizationId,
		token: input.nextToken,
	});
}
