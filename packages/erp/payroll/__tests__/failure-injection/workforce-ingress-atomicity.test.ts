import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createDrizzlePayrollStore } from "../../src/composition/adapters/drizzle";
import { ingestApprovedPayrollHandoff } from "../../src/features/workforce-ingress/ingest-approved-handoff";
import type { PayrollAuthorizationPort } from "../../src/kernel/execution/authorization";
import { PAYROLL_PERMISSION_INPUT_MANAGE } from "../../src/kernel/execution/permissions";
import { buildSyntheticHandoff } from "../fixtures/approved-payroll-handoff-fixtures";
import { createMemoryMutationPorts } from "../helpers/memory-ports";
import {
	cleanupPayrollNeonTestData,
	countAcceptedPayrollHandoffs,
	countActiveAcceptedPayrollHandoffs,
	isPayrollAcceptedHandoffTableReady,
} from "../helpers/payroll-neon-cleanup";
import {
	PAYROLL_NEON_PARITY_SKIP_REASON,
	RUN_PAYROLL_NEON_PARITY,
} from "../helpers/payroll-neon-parity";

function createGrantingAuthorization(): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) =>
			permission === PAYROLL_PERMISSION_INPUT_MANAGE,
	};
}

const handoffTableReady = RUN_PAYROLL_NEON_PARITY
	? await isPayrollAcceptedHandoffTableReady()
	: false;
const runIngressNeon = RUN_PAYROLL_NEON_PARITY && handoffTableReady;

function resolveIngressSkipReason(): string {
	if (!RUN_PAYROLL_NEON_PARITY) {
		return PAYROLL_NEON_PARITY_SKIP_REASON;
	}
	if (!handoffTableReady) {
		return "skipped: payroll_accepted_handoff migration not applied on target";
	}
	return PAYROLL_NEON_PARITY_SKIP_REASON;
}

describe.skipIf(!runIngressNeon)(
	`payroll workforce ingress atomicity (${resolveIngressSkipReason()})`,
	() => {
		it("accepts one sealed row when the same idempotency key is delivered concurrently", async () => {
			const organizationId = `org-payroll-ingress-${randomUUID()}`;
			const options = {
				store: createDrizzlePayrollStore(),
				ports: createMemoryMutationPorts(),
				authorization: createGrantingAuthorization(),
			};
			const payload = buildSyntheticHandoff({
				organizationId,
				employeeId: `emp-${randomUUID().slice(0, 8)}`,
				employmentId: `employ-${randomUUID().slice(0, 8)}`,
			});
			const input = {
				organizationId,
				actorUserId: "user-ingress-atomic",
				correlationId: `corr-ingress-atomic-${randomUUID()}`,
				idempotencyKey: `idem-ingress-atomic-${randomUUID()}`,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				payload,
			};

			try {
				const [first, second] = await Promise.all([
					ingestApprovedPayrollHandoff(input, options),
					ingestApprovedPayrollHandoff(input, options),
				]);
				const successes = [first, second].filter((result) => result.ok);
				expect(successes.length).toBeGreaterThanOrEqual(1);
				expect(successes.every((result) => result.ok)).toBe(true);
				if (!(successes[0]?.ok && successes.every((result) => result.ok))) {
					return;
				}
				const acceptedIds = new Set(
					successes.map((result) => (result.ok ? result.data.id : "")),
				);
				expect(acceptedIds.size).toBe(1);
				await expect(
					countAcceptedPayrollHandoffs(organizationId),
				).resolves.toBe(1);
				await expect(
					countActiveAcceptedPayrollHandoffs(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupPayrollNeonTestData(organizationId);
			}
		});

		it("keeps one active handoff when concurrent superseding ingest races", async () => {
			const organizationId = `org-payroll-ingress-race-${randomUUID()}`;
			const employeeId = `emp-${randomUUID().slice(0, 8)}`;
			const employmentId = `employ-${randomUUID().slice(0, 8)}`;
			const options = {
				store: createDrizzlePayrollStore(),
				ports: createMemoryMutationPorts(),
				authorization: createGrantingAuthorization(),
			};

			try {
				const seed = await ingestApprovedPayrollHandoff(
					{
						organizationId,
						actorUserId: "user-ingress-race",
						correlationId: `corr-ingress-seed-${randomUUID()}`,
						idempotencyKey: `idem-ingress-seed-${randomUUID()}`,
						periodStart: "2025-01-01",
						periodEnd: "2025-01-31",
						payload: buildSyntheticHandoff({
							organizationId,
							employeeId,
							employmentId,
							baseAmount: "85000",
							sourceVersion: { compensationVersion: 1 },
						}),
					},
					options,
				);
				expect(seed.ok).toBe(true);
				if (!seed.ok) {
					return;
				}

				const newerA = {
					organizationId,
					actorUserId: "user-ingress-race",
					correlationId: `corr-ingress-a-${randomUUID()}`,
					idempotencyKey: `idem-ingress-a-${randomUUID()}`,
					periodStart: "2025-01-01",
					periodEnd: "2025-01-31",
					payload: buildSyntheticHandoff({
						organizationId,
						employeeId,
						employmentId,
						baseAmount: "90000",
						sourceVersion: { compensationVersion: 2 },
						components: [
							{
								code: "base",
								kind: "base",
								amount: "90000",
								currencyCode: "USD",
								decimalScale: 0,
								sourceType: "hr_employee_compensation",
								sourceId: "comp-race-a",
								sourceVersion: 2,
							},
						],
					}),
				};
				const newerB = {
					...newerA,
					idempotencyKey: `idem-ingress-b-${randomUUID()}`,
					correlationId: `corr-ingress-b-${randomUUID()}`,
					payload: buildSyntheticHandoff({
						organizationId,
						employeeId,
						employmentId,
						baseAmount: "91000",
						sourceVersion: { compensationVersion: 2 },
						components: [
							{
								code: "base",
								kind: "base",
								amount: "91000",
								currencyCode: "USD",
								decimalScale: 0,
								sourceType: "hr_employee_compensation",
								sourceId: "comp-race-b",
								sourceVersion: 2,
							},
						],
					}),
				};

				const [first, second] = await Promise.all([
					ingestApprovedPayrollHandoff(newerA, options),
					ingestApprovedPayrollHandoff(newerB, options),
				]);
				const outcomes = [first, second];
				const successes = outcomes.filter((result) => result.ok);
				const failures = outcomes.filter((result) => !result.ok);
				expect(successes.length + failures.length).toBe(2);
				expect(successes.length).toBeGreaterThanOrEqual(1);
				await expect(
					countActiveAcceptedPayrollHandoffs(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupPayrollNeonTestData(organizationId);
			}
		});
	},
);
