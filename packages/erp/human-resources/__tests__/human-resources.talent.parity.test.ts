/**
 * Memory vs Drizzle parity for talent management (competency, profile, pool).
 */

import { afterAll, describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
} from "../src/permissions";
import {
	createCompetency,
	getCompetencyById,
	listCompetencies,
	retireCompetency,
} from "../src/talent/competency";
import { createTalentPool } from "../src/talent/talent-pool";
import {
	confirmTalentProfileAssessment,
	createTalentProfile,
	getTalentProfileByEmployee,
	recordTalentProfileAssessment,
} from "../src/talent/talent-profile";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import {
	createMappingIdentityResolver,
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

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
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-talent-parity-${suffix}`);
	const ACTOR = `user-hr-talent-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
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

describe("@afenda/human-resources talent sensitive authorization (memory)", () => {
	const ORG = `org-talent-auth-${Date.now()}`;

	function authOptions(permissions: readonly string[]) {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		return createTestHumanResourcesCommandOptions({
			store,
			ports,
			identityResolver: createStoreBackedIdentityResolver(store),
			authorization: createGrantingHumanResourcesAuthorization(
				permissions as Parameters<
					typeof createGrantingHumanResourcesAuthorization
				>[0],
			),
		});
	}

	async function seedAuthEmployee(
		ready: ReturnType<typeof authOptions>,
		suffix: string,
	) {
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: `corr-emp-${suffix}`,
				idempotencyKey: `idem-emp-${suffix}`,
				employeeNumber: `E-${suffix}`,
				legalName: `Worker ${suffix}`,
			},
			ready,
		);
		if (!employee.ok) {
			throw new Error(employee.message);
		}
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: `corr-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		if (!employment.ok) {
			throw new Error(employment.message);
		}
		return employee.data;
	}

	it("denies talent profile read without sensitive read permission", async () => {
		const adminReady = authOptions([
			"human-resources.employee.create",
			"human-resources.employment.manage",
			"human-resources.talent.admin",
		]);
		const employee = await seedAuthEmployee(adminReady, "deny-read");
		await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-profile-deny",
				idempotencyKey: "idem-profile-deny",
				employeeId: employee.id,
				summary: "Bench",
			},
			adminReady,
		);

		const denied = await getTalentProfileByEmployee(
			{
				organizationId: ORG,
				actorUserId: "user-outsider",
				correlationId: "corr-deny",
				employeeId: employee.id,
				includeSensitive: false,
			},
			authOptions([HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]),
		);
		expect(denied.ok).toBe(false);
	});

	it("nulls classification when includeSensitive is false", async () => {
		const adminReady = authOptions([
			"human-resources.employee.create",
			"human-resources.employment.manage",
			"human-resources.talent.admin",
			HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
		]);
		const employee = await seedAuthEmployee(adminReady, "classify");
		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-profile-classify",
				idempotencyKey: "idem-profile-classify",
				employeeId: employee.id,
				summary: "High potential",
			},
			adminReady,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		const assessment = await recordTalentProfileAssessment(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-assess",
				talentProfileId: profile.data.id,
				methodCode: "manager_evidence_review",
				classification: "high_potential",
				evidenceSummary: "Strong delivery",
				assessorUserId: "user-admin",
			},
			adminReady,
		);
		expect(assessment.ok).toBe(true);
		if (!assessment.ok) return;
		const confirmed = await confirmTalentProfileAssessment(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-confirm",
				assessmentId: assessment.data.id,
				expectedVersion: assessment.data.version,
			},
			adminReady,
		);
		expect(confirmed.ok).toBe(true);

		await mapActorToEmployee(adminReady.store, {
			organizationId: ORG,
			userId: "user-subject",
			employeeId: employee.id,
			actorUserId: "user-admin",
		});

		const subjectReady = createTestHumanResourcesCommandOptions({
			store: adminReady.store,
			ports: adminReady.ports,
			identityResolver: createMappingIdentityResolver({
				"user-subject": employee.id,
			}),
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
			]),
		});

		const redacted = await getTalentProfileByEmployee(
			{
				organizationId: ORG,
				actorUserId: "user-subject",
				correlationId: "corr-redacted",
				employeeId: employee.id,
				includeSensitive: false,
			},
			subjectReady,
		);
		expect(redacted.ok).toBe(true);
		if (!redacted.ok) return;
		expect(redacted.data?.currentClassification).toBeNull();

		const sensitive = await getTalentProfileByEmployee(
			{
				organizationId: ORG,
				actorUserId: "user-subject",
				correlationId: "corr-sensitive",
				employeeId: employee.id,
				includeSensitive: true,
			},
			subjectReady,
		);
		expect(sensitive.ok).toBe(true);
		if (!sensitive.ok) return;
		expect(sensitive.data?.currentClassification).toBe("high_potential");
	});
});

describe.skipIf(!runDrizzleParity)(
	"@afenda/human-resources talent parity (drizzle/neon)",
	() => {
		defineTalentParitySuite("drizzle");
	},
);
