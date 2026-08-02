import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import {
	type CanonicalJsonValue,
	createCanonicalFingerprint,
} from "../canonical-json";
import { type OpaqueCursor, opaqueCursorSchema } from "../pagination";

export const CORPORATE_ADMINISTRATION_CURSOR_OPERATIONS = [
	"legal_companies",
	"company_names",
	"company_identifiers",
	"companies_by_status",
	"company_activities_as_of",
	"legal_company_timeline",
	"governance_bodies_as_of",
	"governance_memberships_as_of",
	"required_statutory_offices",
	"officer_appointments_as_of",
	"expiring_officer_declarations",
	"active_officer_disqualifications",
	"conflicts_for_matter",
	"governance_meetings",
	"legal_establishments_as_of",
	"premises_as_of",
] as const;

const cursorOperationSchema = z.enum(
	CORPORATE_ADMINISTRATION_CURSOR_OPERATIONS,
);

const cursorEnvelopeSchema = z
	.object({
		version: z.literal(1),
		operation: cursorOperationSchema,
		scopeFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
		key: z.array(z.unknown()),
	})
	.strict();

export type CorporateAdministrationCursorOperation = z.infer<
	typeof cursorOperationSchema
>;

export function encodeCorporateAdministrationCursor(
	operation: CorporateAdministrationCursorOperation,
	scope: CanonicalJsonValue,
	key: readonly unknown[],
): OpaqueCursor {
	return opaqueCursorSchema.parse(
		Buffer.from(
			JSON.stringify({
				version: 1,
				operation,
				scopeFingerprint: createCanonicalFingerprint(scope),
				key,
			}),
			"utf8",
		).toString("base64url"),
	);
}

export function decodeCorporateAdministrationCursor<
	T extends z.ZodType<readonly unknown[]>,
>(
	cursor: OpaqueCursor | undefined,
	operation: CorporateAdministrationCursorOperation,
	scope: CanonicalJsonValue,
	keySchema: T,
): Result<z.infer<T> | null> {
	if (cursor === undefined) {
		return errorResult.ok(null);
	}
	try {
		const envelope = cursorEnvelopeSchema.safeParse(
			JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
		);
		if (
			!envelope.success ||
			envelope.data.operation !== operation ||
			envelope.data.scopeFingerprint !== createCanonicalFingerprint(scope)
		) {
			return invalidCursor();
		}
		const key = keySchema.safeParse(envelope.data.key);
		return key.success ? errorResult.ok(key.data) : invalidCursor();
	} catch {
		return invalidCursor();
	}
}

function invalidCursor(): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Corporate Administration pagination cursor is invalid.",
	});
}
