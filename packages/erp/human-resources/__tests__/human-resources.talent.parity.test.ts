/**
 * Memory vs Drizzle parity for talent management (competency, profile, pool).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	createCompetency,
	getCompetencyById,
	listCompetencies,
	retireCompetency,
} from "../src/talent/competency";
import { createTalentPool } from "../src/talent/talent-pool";
import {
	createTalentProfile,
	getTalentProfileByEmployee,
} from "../src/talent/talent-profile";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployee(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`,
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	if (!employment.ok) {
		throw new Error(`Failed to seed employment: ${employment.code}`);
	}
	return employee.data;
}

function defineTalentParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-talent-parity-${suffix}`;
	const ACTOR = `user-hr-talent-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("competency create, list, retire", async () => {
		const ready = createHrParityHarness(adapter);
		const code = `COMP-${suffix}`;

		const created = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-${suffix}`,
				idempotencyKey: `idem-comp-${suffix}`,
				code,
				name: "Leadership",
				scaleCode: "five_point",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const loaded = await getCompetencyById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-comp-${suffix}`,
				competencyId: created.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		expect(loaded.data?.code).toBe(code);

		const listed = await listCompetencies(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-comp-${suffix}`,
				page: 1,
				pageSize: 20,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.competencies.some((c) => c.id === created.data.id)).toBe(
			true,
		);

		const retired = await retireCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-retire-${suffix}`,
				competencyId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) return;
		expect(retired.data.status).toBe("retired");
	});

	it("rejects duplicate competency code", async () => {
		const ready = createHrParityHarness(adapter);
		const code = `DUP-${suffix}`;

		const first = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup1-${suffix}`,
				idempotencyKey: `idem-dup1-${suffix}`,
				code,
				name: "Dup A",
				scaleCode: "five_point",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup2-${suffix}`,
				idempotencyKey: `idem-dup2-${suffix}`,
				code,
				name: "Dup B",
				scaleCode: "five_point",
			},
			ready,
		);
		expect(second.ok).toBe(false);
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("talent profile per employee and talent pool", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});

		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-${suffix}`,
				idempotencyKey: `idem-profile-${suffix}`,
				employeeId: employee.id,
				summary: "High potential",
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		const byEmployee = await getTalentProfileByEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-get-${suffix}`,
				employeeId: employee.id,
				includeSensitive: false,
			},
			ready,
		);
		expect(byEmployee.ok).toBe(true);
		if (!byEmployee.ok) return;
		expect(byEmployee.data?.id).toBe(profile.data.id);

		const pool = await createTalentPool(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pool-${suffix}`,
				idempotencyKey: `idem-pool-${suffix}`,
				code: `POOL-${suffix}`,
				name: "Leadership bench",
			},
			ready,
		);
		expect(pool.ok).toBe(true);
		if (!pool.ok) return;
		expect(pool.data.code).toBe(`POOL-${suffix}`);
	});
}

describe("@afenda/human-resources talent parity (memory)", () => {
	defineTalentParitySuite("memory");
});

describe.skipIf(!hasDatabase)(
	"@afenda/human-resources talent parity (drizzle/neon)",
	() => {
		defineTalentParitySuite("drizzle");
	},
);
