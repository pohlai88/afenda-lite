import { describe, expect, it } from "vitest";

import {
	isCreateIdempotencyUniqueViolation,
	isPayrollRunIdentityUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../src/kernel/execution/persistence-errors";

describe("@afenda/payroll persistence errors", () => {
	it("fails closed for hostile Postgres-shaped getters", () => {
		const hostile = Object.defineProperties(
			{},
			{
				code: {
					get() {
						throw new Error("unsafe code getter");
					},
				},
				message: {
					get() {
						throw new Error("unsafe message getter");
					},
				},
			},
		);

		expect(() => isPostgresUniqueViolation(hostile)).not.toThrow();

		const result = mapPersistenceFailure(hostile, "Failed to persist payroll");

		expect(result).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
	});

	it("classifies unique constraints from metadata, not raw messages", () => {
		expect(
			isCreateIdempotencyUniqueViolation({
				code: "23505",
				constraint: "payroll_calendar_org_create_idempotency_uidx",
			}),
		).toBe(true);
		expect(
			isPayrollRunIdentityUniqueViolation({
				code: "23505",
				constraint_name: "payroll_run_org_identity_uidx",
			}),
		).toBe(true);
		expect(
			isCreateIdempotencyUniqueViolation({
				code: "23505",
				message:
					'duplicate key value violates unique constraint "payroll_calendar_org_create_idempotency_uidx"',
			}),
		).toBe(false);
	});
});
