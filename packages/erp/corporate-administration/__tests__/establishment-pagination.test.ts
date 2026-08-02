import { opaqueCursorSchema } from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	decodeLegalEstablishmentCursor,
	decodePremiseCursor,
	encodeLegalEstablishmentCursor,
	legalEstablishmentCursorScope,
	premiseCursorScope,
} from "../src/features/establishments/pagination";
import {
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
	organizationIdSchema,
} from "../src/kernel/brands";

describe("Corporate Administration establishment pagination cursors", () => {
	it("round-trips an operation- and scope-bound establishment cursor", () => {
		const scope = legalEstablishmentCursorScope({
			organizationId: organizationIdSchema.parse("org-ca-establishment-cursor"),
			legalCompanyId: legalCompanyIdSchema.parse(
				"00000000-0000-4000-8000-000000000691",
			),
			asOf: "2026-06-01",
			status: "active",
			pagination: { limit: 10 },
		});
		const key = [
			"branch",
			"MY",
			"BRANCH001",
			legalEstablishmentIdSchema.parse("00000000-0000-4000-8000-000000000692"),
		] as const;

		expect(
			decodeLegalEstablishmentCursor(
				encodeLegalEstablishmentCursor(scope, key),
				scope,
			),
		).toEqual({ ok: true, data: key });
	});

	it("rejects malformed, cross-operation, and cross-tenant cursors", () => {
		const organizationId = organizationIdSchema.parse(
			"org-ca-establishment-cursor",
		);
		const legalCompanyId = legalCompanyIdSchema.parse(
			"00000000-0000-4000-8000-000000000691",
		);
		const establishmentScope = legalEstablishmentCursorScope({
			organizationId,
			legalCompanyId,
			asOf: "2026-06-01",
			pagination: { limit: 10 },
		});
		const cursor = encodeLegalEstablishmentCursor(establishmentScope, [
			"branch",
			"MY",
			"BRANCH001",
			legalEstablishmentIdSchema.parse("00000000-0000-4000-8000-000000000692"),
		]);

		expect(
			decodePremiseCursor(
				cursor,
				premiseCursorScope({
					organizationId,
					legalCompanyId,
					asOf: "2026-06-01",
					pagination: { limit: 10 },
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(
			decodeLegalEstablishmentCursor(
				cursor,
				legalEstablishmentCursorScope({
					organizationId: organizationIdSchema.parse(
						"org-ca-establishment-cursor-other",
					),
					legalCompanyId,
					asOf: "2026-06-01",
					pagination: { limit: 10 },
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(
			decodePremiseCursor(
				opaqueCursorSchema.parse("not-a-cursor"),
				premiseCursorScope({
					organizationId,
					legalCompanyId,
					asOf: "2026-06-01",
					pagination: { limit: 10 },
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
	});
});
