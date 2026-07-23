/**
 * G15 — Drizzle concurrency on overlapping time policy and approval authority assignments.
 */
import { randomUUID } from "node:crypto";

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT, HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE } from "../src/error-codes";
import {
	activateTimePolicy,
	assignTimeApprovalAuthority,
	assignTimePolicy,
	createTimePolicy,
} from "../src/time/policy";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { createHrParityHarness } from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();
const runConcurrency =
	hasDatabase && process.env.REQUIRE_DATABASE_TESTS === "1";

describe.skipIf(!runConcurrency)("Time policy concurrency (Drizzle)", () => {
	const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
	const ORG = `org-hr-time-concurrency-${suffix}`;
	const ACTOR = `user-hr-time-concurrency-${suffix}`;
	const MANAGER = `user-hr-time-mgr-concurrency-${suffix}`;

	afterAll(async () => {
		await cleanupHumanResourcesNeonOrgs([ORG]);
	});

	async function seedEmployment() {
		const ready = createHrParityHarness("drizzle");
		const seedKey = randomUUID();
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				idempotencyKey: `idem-emp-${seedKey}`,
				employeeNumber: `E-${seedKey.slice(0, 8)}`,
				legalName: "Concurrency Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			throw new Error("seed employee failed");
		}
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) {
			throw new Error("seed employment failed");
		}
		return { ready, employmentId: employment.data.id };
	}

	async function seedActivePolicy(ready: ReturnType<typeof createHrParityHarness>) {
		const policyKey = randomUUID();
		const created = await createTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				idempotencyKey: `idem-policy-${policyKey}`,
				code: `POL-${policyKey.slice(0, 8)}`,
				name: "Concurrency Policy",
				effectiveFrom: "2025-01-01",
				minimumRestMinutes: 660,
				automaticBreakAfterMinutes: null,
				automaticBreakMinutes: 0,
				approvalSteps: ["line_manager"],
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			throw new Error("create policy failed");
		}
		const activated = await activateTimePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			throw new Error("activate policy failed");
		}
		return activated.data.id;
	}

	it("allows only one overlapping time policy assignment under concurrent assign", async () => {
		const { ready, employmentId } = await seedEmployment();
		const policyId = await seedActivePolicy(ready);

		const [first, second] = await Promise.all([
			assignTimePolicy(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: randomUUID(),
					policyId,
					employmentId,
					effectiveFrom: "2025-01-01",
				},
				ready,
			),
			assignTimePolicy(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: randomUUID(),
					policyId,
					employmentId,
					effectiveFrom: "2025-01-01",
				},
				ready,
			),
		]);

		const outcomes = [first, second];
		const successes = outcomes.filter((result) => result.ok);
		const failures = outcomes.filter((result) => !result.ok);

		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);
		expect(humanResourcesCodeFromResult(failures[0]!)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("allows only one overlapping approval authority assignment under concurrent assign", async () => {
		const { ready } = await seedEmployment();

		const [first, second] = await Promise.all([
			assignTimeApprovalAuthority(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: randomUUID(),
					targetActorUserId: MANAGER,
					authority: "line_manager",
					effectiveFrom: "2025-01-01",
				},
				ready,
			),
			assignTimeApprovalAuthority(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: randomUUID(),
					targetActorUserId: MANAGER,
					authority: "line_manager",
					effectiveFrom: "2025-01-01",
				},
				ready,
			),
		]);

		const outcomes = [first, second];
		const successes = outcomes.filter((result) => result.ok);
		const failures = outcomes.filter((result) => !result.ok);

		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);
		const failureCode = humanResourcesCodeFromResult(failures[0]!);
		expect(
			failureCode === HUMAN_RESOURCES_ERROR_CONFLICT ||
				failureCode === HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
		).toBe(true);
	});
});
