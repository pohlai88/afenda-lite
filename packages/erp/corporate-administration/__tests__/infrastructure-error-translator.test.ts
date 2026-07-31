import { describe, expect, it } from "vitest";

import {
	idempotencyConflictResult,
	staleReservationResult,
	translateCorporateAdministrationInfrastructureError,
} from "../src/adapters/drizzle/errors";

describe("Corporate Administration infrastructure error translation", () => {
	it("keeps domain-owned idempotency outcomes canonical", () => {
		expect(idempotencyConflictResult()).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
		expect(staleReservationResult()).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
	});

	it.each([
		["23505", "CONFLICT"],
		["40001", "CONCURRENCY_CONFLICT"],
		["40P01", "CONCURRENCY_CONFLICT"],
		["08006", "SERVICE_UNAVAILABLE"],
		["57P03", "SERVICE_UNAVAILABLE"],
		["25P02", "INTERNAL_ERROR"],
		["42P01", "INTERNAL_ERROR"],
		["23P01", "INTERNAL_ERROR"],
		["XX000", "INTERNAL_ERROR"],
	] as const)("delegates SQLSTATE %s to the canonical ingress policy", (code, expected) => {
		expect(
			translateCorporateAdministrationInfrastructureError({ code }),
		).toMatchObject({
			ok: false,
			code: expected,
		});
	});

	it("normalizes lowercase nested SQLSTATE values", () => {
		expect(
			translateCorporateAdministrationInfrastructureError({
				cause: { sqlstate: "57p03" },
			}),
		).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
		});
	});

	it("fails closed for hostile accessors and programming errors", () => {
		const hostile = Object.defineProperties(
			{},
			{
				code: {
					get() {
						throw new Error("getter failure");
					},
				},
				cause: {
					get() {
						throw new Error("cause getter failure");
					},
				},
			},
		);

		expect(() =>
			translateCorporateAdministrationInfrastructureError(hostile),
		).not.toThrow();
		expect(
			translateCorporateAdministrationInfrastructureError(hostile),
		).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(
			translateCorporateAdministrationInfrastructureError(
				new TypeError("programmer mistake"),
			),
		).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
	});

	it("does not expose SQL text, constraints, connection strings, or parameters", () => {
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
