import { describe, expect, it } from "vitest";
import {
	idempotencyConflictResult,
	staleReservationResult,
	translateCorporateAdministrationInfrastructureError,
} from "../src/adapters/drizzle/errors";

describe("Corporate Administration infrastructure error translation", () => {
	it("maps same-key different-fingerprint reuse and stale reservations to idempotency conflict", () => {
		expect(idempotencyConflictResult()).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: {
				reason: "CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
				field: "idempotencyKey",
			},
		});
		expect(staleReservationResult()).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: {
				reason: "CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
				field: "reservationToken",
			},
		});
	});

	it("distinguishes unique constraint, serialization, transaction, and unavailable failures", () => {
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "23505" }),
		).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: { reason: "CORPORATE_ADMINISTRATION_CONFLICT" },
		});
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "40001" }),
		).toMatchObject({
			ok: false,
			code: "CONFLICT",
			details: {
				reason: "CORPORATE_ADMINISTRATION_CONFLICT",
				field: "transaction",
			},
		});
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "25P02" }),
		).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
				field: "transaction",
			},
		});
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "42P01" }),
		).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
				field: "transaction",
			},
		});
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "08006" }),
		).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
				field: "database",
			},
		});
	});

	it("leaves database internals, unknown codes, and programming errors visible", () => {
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "XX000" }),
		).toBeUndefined();
		expect(
			translateCorporateAdministrationInfrastructureError({ code: "ZZ999" }),
		).toBeUndefined();
		expect(
			translateCorporateAdministrationInfrastructureError(
				new TypeError("programmer mistake"),
			),
		).toBeUndefined();
	});

	it("does not expose SQL text, constraint internals, connection strings, or query parameters", () => {
		const translated = translateCorporateAdministrationInfrastructureError({
			code: "23505",
			constraint: "ca_mutation_receipt_scope_uidx",
			query: "insert into ca_mutation_receipt values ($1)",
			parameters: ["postgres://user:password@example/db", "secret"],
			message: "duplicate key value violates unique constraint",
		});

		const serialized = JSON.stringify(translated);
		expect(serialized).not.toContain("insert into");
		expect(serialized).not.toContain("ca_mutation_receipt_scope_uidx");
		expect(serialized).not.toContain("postgres://");
		expect(serialized).not.toContain("secret");
	});
});
