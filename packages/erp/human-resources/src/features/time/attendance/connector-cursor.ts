import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";

interface AttendanceConnectorCursorPayload {
	organizationId: string;
	token: string;
}

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
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
		return errorResult.ok(parsed);
	} catch {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
}

export function resolveAttendanceConnectorPullCursor(input: {
	organizationId: string;
	cursor?: string;
}): Result<{ pullCursor?: string }> {
	if (input.cursor === undefined) {
		return errorResult.ok({});
	}
	const decoded = decodePayload(input.cursor);
	if (!decoded.ok) {
		return decoded;
	}
	if (decoded.data.organizationId !== input.organizationId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		});
	}
	return errorResult.ok({ pullCursor: decoded.data.token });
}

export function bindAttendanceConnectorCursor(input: {
	organizationId: string;
	nextToken?: string;
}): string | undefined {
	if (input.nextToken === undefined || input.nextToken.length === 0) {
		return;
	}
	return encodePayload({
		organizationId: input.organizationId,
		token: input.nextToken,
	});
}
