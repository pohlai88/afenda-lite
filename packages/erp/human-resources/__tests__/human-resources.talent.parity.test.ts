/**
 * Memory vs Drizzle parity for talent management (competency, profile, pool).
 */

import { afterAll, describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/error-codes";
import { createPosition } from "../src/organization/position";
import {
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
} from "../src/permissions";
import {
	assessEmployeeCompetency,
	createCompetency,
	expireCompetencyAssessment,
	getCompetencyById,
	getEmployeeCompetencyProfile,
	listCompetencies,
	listJobCompetencies,
	mapCompetencyToJob,
	removeCompetencyFromJob,
	retireCompetency,
	supersedeCompetencyAssessment,
	updateCompetency,
} from "../src/talent/competency";
import {
	listCriticalRoleReadiness,
	recordCriticalRoleReadiness,
} from "../src/talent/critical-role-readiness";
import {
	approveTalentPoolMember,
	closeTalentPool,
	createTalentPool,
	nominateTalentPoolMember,
	removeTalentPoolMember,
} from "../src/talent/talent-pool";
import {
	archiveTalentProfile,
	confirmTalentProfileAssessment,
	createTalentProfile,
	getTalentProfileByEmployee,
	listTalentProfileAssessments,
	recordTalentProfileAssessment,
	updateTalentProfile,
} from "../src/talent/talent-profile";
import {
	listTalentProfileMobility,
	recordTalentProfileMobility,
} from "../src/talent/talent-profile-mobility";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
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

async function seedPosition(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; tag: string },
) {
	const orgSeed = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `corr-org-${input.tag}`,
	});
	if (orgSeed === null) {
		throw new Error("Failed to seed department/job");
	}
	const position = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-pos-${input.tag}`,
			code: `P-${input.tag}`,
			title: `Position ${input.tag}`,
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!position.ok) {
		throw new Error(`Failed to seed position: ${position.code}`);
	}
	return position.data;
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

	it("competency library update", async () => {
		const ready = createHrParityHarness(adapter);
		const code = `UPD-${suffix}`;

		const created = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-upd-${suffix}`,
				idempotencyKey: `idem-comp-upd-${suffix}`,
				code,
				name: "Before",
				scaleCode: "five_point",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const updated = await updateCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-upd2-${suffix}`,
				competencyId: created.data.id,
				name: "After",
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
		expect(updated.data.name).toBe("After");

		const loaded = await getCompetencyById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-upd-${suffix}`,
				competencyId: created.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		expect(loaded.data?.name).toBe("After");
	});

	it("job competency map, list, and remove", async () => {
		const ready = createHrParityHarness(adapter);
		const seeded = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
		});
		expect(seeded).not.toBeNull();
		if (!seeded) return;

		const competency = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-jc-${suffix}`,
				idempotencyKey: `idem-jc-${suffix}`,
				code: `JC-${suffix}`,
				name: "Job skill",
				scaleCode: "five_point",
			},
			ready,
		);
		expect(competency.ok).toBe(true);
		if (!competency.ok) return;

		const mapped = await mapCompetencyToJob(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-map-${suffix}`,
				jobId: seeded.jobId,
				competencyId: competency.data.id,
				requiredLevel: 3,
			},
			ready,
		);
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) return;
		expect(mapped.data.requiredLevel).toBe(3);

		const listed = await listJobCompetencies(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-jc-${suffix}`,
				jobId: seeded.jobId,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(
			listed.data.jobCompetencies.some((row) => row.id === mapped.data.id),
		).toBe(true);

		const removed = await removeCompetencyFromJob(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rm-jc-${suffix}`,
				jobCompetencyId: mapped.data.id,
				expectedVersion: mapped.data.version,
			},
			ready,
		);
		expect(removed.ok).toBe(true);
		if (!removed.ok) return;
		expect(removed.data.status).toBe("removed");
	});

	it("employee assessment, profile, supersede, and expiration", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `assess-${suffix}`,
		});

		const competency = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assess-comp-${suffix}`,
				idempotencyKey: `idem-assess-comp-${suffix}`,
				code: `ASSESS-${suffix}`,
				name: "Assessed skill",
				scaleCode: "five_point",
			},
			ready,
		);
		expect(competency.ok).toBe(true);
		if (!competency.ok) return;

		const assessed = await assessEmployeeCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assess-${suffix}`,
				idempotencyKey: `idem-assess-${suffix}`,
				employeeId: employee.id,
				competencyId: competency.data.id,
				assessorUserId: ACTOR,
				evidenceSource: "Manager observation Q1",
				scaleCode: "five_point",
				level: 3,
				effectiveOn: "2025-01-15",
				expiresOn: "2026-01-15",
			},
			ready,
		);
		expect(assessed.ok).toBe(true);
		if (!assessed.ok) return;
		expect(assessed.data.level).toBe(3);
		expect(assessed.data.evidenceSource).toBe("Manager observation Q1");
		expect(assessed.data.expiresOn).toBe("2026-01-15");

		const profile = await getEmployeeCompetencyProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;
		expect(profile.data.assessments).toHaveLength(1);
		expect(profile.data.assessments[0]?.id).toBe(assessed.data.id);

		const superseded = await supersedeCompetencyAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-supersede-${suffix}`,
				idempotencyKey: `idem-supersede-${suffix}`,
				assessmentId: assessed.data.id,
				assessorUserId: ACTOR,
				evidenceSource: "Calibration panel review",
				level: 4,
				effectiveOn: "2025-06-01",
				expiresOn: "2026-06-01",
				expectedVersion: assessed.data.version,
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) return;
		expect(superseded.data.level).toBe(4);
		expect(superseded.data.supersedesAssessmentId).toBe(assessed.data.id);
		expect(superseded.data.status).toBe("current");

		const expired = await expireCompetencyAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-expire-${suffix}`,
				assessmentId: superseded.data.id,
				expectedVersion: superseded.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) return;
		expect(expired.data.status).toBe("expired");

		const reAssessed = await assessEmployeeCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-reassess-${suffix}`,
				idempotencyKey: `idem-reassess-${suffix}`,
				employeeId: employee.id,
				competencyId: competency.data.id,
				assessorUserId: ACTOR,
				evidenceSource: "Renewed certification",
				scaleCode: "five_point",
				level: 4,
				effectiveOn: "2025-07-01",
			},
			ready,
		);
		expect(reAssessed.ok).toBe(true);
		if (!reAssessed.ok) return;
		expect(reAssessed.data.status).toBe("current");
	});

	it("talent profile update and archive guards", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `profile-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});

		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-${tag}`,
				idempotencyKey: `idem-profile-${tag}`,
				employeeId: employee.id,
				summary: "Initial summary",
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		const updated = await updateTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-upd-${tag}`,
				talentProfileId: profile.data.id,
				summary: "Updated summary",
				expectedVersion: profile.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
		expect(updated.data.summary).toBe("Updated summary");

		const archived = await archiveTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-arch-${tag}`,
				talentProfileId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) return;
		expect(archived.data.status).toBe("archived");

		const denied = await updateTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-denied-${tag}`,
				talentProfileId: archived.data.id,
				summary: "Should fail",
				expectedVersion: archived.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
	});

	it("potential assessment confirm sets classification with sensitive projection", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `potential-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});
		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-pot-${tag}`,
				idempotencyKey: `idem-profile-pot-${tag}`,
				employeeId: employee.id,
				summary: "Bench",
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		const draft = await recordTalentProfileAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-draft-${tag}`,
				talentProfileId: profile.data.id,
				methodCode: "manager_evidence_review",
				classification: "high_potential",
				evidenceSummary: "Strong delivery",
				assessorUserId: ACTOR,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const confirmed = await confirmTalentProfileAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-confirm-${tag}`,
				assessmentId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(confirmed.ok).toBe(true);
		if (!confirmed.ok) return;

		const sensitive = await getTalentProfileByEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-sensitive-${tag}`,
				employeeId: employee.id,
				includeSensitive: true,
			},
			ready,
		);
		expect(sensitive.ok).toBe(true);
		if (!sensitive.ok) return;
		expect(sensitive.data?.currentClassification).toBe("high_potential");

		const redacted = await getTalentProfileByEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-redacted-${tag}`,
				employeeId: employee.id,
				includeSensitive: false,
			},
			ready,
		);
		expect(redacted.ok).toBe(true);
		if (!redacted.ok) return;
		expect(redacted.data?.currentClassification).toBeNull();

		const history = await listTalentProfileAssessments(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assess-list-${tag}`,
				talentProfileId: profile.data.id,
				includeSensitive: true,
			},
			ready,
		);
		expect(history.ok).toBe(true);
		if (!history.ok) return;
		expect(
			history.data.assessments.some((a) => a.id === confirmed.data.id),
		).toBe(true);
	});

	it("mobility record supersedes prior current per dimension", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `mobility-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});
		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-mob-${tag}`,
				idempotencyKey: `idem-profile-mob-${tag}`,
				employeeId: employee.id,
				summary: "Mobile talent",
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		const first = await recordTalentProfileMobility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-mob1-${tag}`,
				idempotencyKey: `idem-mob1-${tag}`,
				talentProfileId: profile.data.id,
				dimension: "geographic",
				preferenceCode: "open",
				scopeDetail: "APAC",
				evidenceSummary: "Prior international assignments",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await recordTalentProfileMobility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-mob2-${tag}`,
				idempotencyKey: `idem-mob2-${tag}`,
				talentProfileId: profile.data.id,
				dimension: "geographic",
				preferenceCode: "limited",
				scopeDetail: "EMEA only",
				evidenceSummary: "Family constraints updated",
				effectiveFrom: "2025-06-01",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) return;
		expect(second.data.status).toBe("current");

		const listedSensitive = await listTalentProfileMobility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-mob-list-s-${tag}`,
				talentProfileId: profile.data.id,
				includeSensitive: true,
			},
			ready,
		);
		expect(listedSensitive.ok).toBe(true);
		if (!listedSensitive.ok) return;
		const currentRows = listedSensitive.data.mobilities.filter(
			(row) => row.dimension === "geographic" && row.status === "current",
		);
		expect(currentRows).toHaveLength(1);
		expect(currentRows[0]?.id).toBe(second.data.id);
		expect(
			listedSensitive.data.mobilities.some(
				(row) => row.id === first.data.id && row.status === "superseded",
			),
		).toBe(true);

		const listedRedacted = await listTalentProfileMobility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-mob-list-r-${tag}`,
				talentProfileId: profile.data.id,
				includeSensitive: false,
			},
			ready,
		);
		expect(listedRedacted.ok).toBe(true);
		if (!listedRedacted.ok) return;
		expect(listedRedacted.data.mobilities[0]?.evidenceSummary).toBe("");
	});

	it("critical role readiness record supersedes prior current per position", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `readiness-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});
		const position = await seedPosition(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-profile-read-${tag}`,
				idempotencyKey: `idem-profile-read-${tag}`,
				employeeId: employee.id,
				summary: "Critical role candidate",
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		const first = await recordCriticalRoleReadiness(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-read1-${tag}`,
				idempotencyKey: `idem-read1-${tag}`,
				talentProfileId: profile.data.id,
				positionId: position.id,
				readiness: "ready_soon",
				readinessEffectiveOn: "2025-01-01",
				evidenceSummary: "Acting coverage complete",
				assessorUserId: ACTOR,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await recordCriticalRoleReadiness(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-read2-${tag}`,
				idempotencyKey: `idem-read2-${tag}`,
				talentProfileId: profile.data.id,
				positionId: position.id,
				readiness: "ready_now",
				readinessEffectiveOn: "2025-03-01",
				evidenceSummary: "Independent leadership demonstrated",
				assessorUserId: ACTOR,
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		const listed = await listCriticalRoleReadiness(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-read-list-${tag}`,
				talentProfileId: profile.data.id,
				includeSensitive: true,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		const currentRows = listed.data.readinessRecords.filter(
			(row) => row.positionId === position.id && row.status === "current",
		);
		expect(currentRows).toHaveLength(1);
		expect(currentRows[0]?.readiness).toBe("ready_now");
	});

	it("talent pool nominate approve remove lifecycle", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `pool-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});
		const pool = await createTalentPool(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pool-${tag}`,
				idempotencyKey: `idem-pool-${tag}`,
				code: `POOL-${tag}`,
				name: "Leadership bench",
			},
			ready,
		);
		expect(pool.ok).toBe(true);
		if (!pool.ok) return;

		const nominated = await nominateTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-nom-${tag}`,
				idempotencyKey: `idem-nom-${tag}`,
				poolId: pool.data.id,
				employeeId: employee.id,
				nominatorUserId: ACTOR,
			},
			ready,
		);
		expect(nominated.ok).toBe(true);
		if (!nominated.ok) return;

		const approved = await approveTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-appr-${tag}`,
				memberId: nominated.data.id,
				approverUserId: ACTOR,
				expectedVersion: nominated.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const removed = await removeTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rem-${tag}`,
				memberId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(removed.ok).toBe(true);
		if (!removed.ok) return;
		expect(removed.data.status).toBe("removed");
	});

	it("rejects pool nomination after pool is closed", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `pool-closed-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});
		const pool = await createTalentPool(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pool-closed-${tag}`,
				idempotencyKey: `idem-pool-closed-${tag}`,
				code: `POOL-CLOSED-${tag}`,
				name: "Closed bench",
			},
			ready,
		);
		expect(pool.ok).toBe(true);
		if (!pool.ok) return;

		const closed = await closeTalentPool(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-close-${tag}`,
				poolId: pool.data.id,
				expectedVersion: pool.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;

		const denied = await nominateTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-nom-closed-${tag}`,
				idempotencyKey: `idem-nom-closed-${tag}`,
				poolId: closed.data.id,
				employeeId: employee.id,
				nominatorUserId: ACTOR,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
	});

	it("idempotency conflict on profile and pool create", async () => {
		const ready = createHrParityHarness(adapter);
		const tag = `idem-${suffix}`;
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: tag,
		});

		const profilePayload = {
			organizationId: ORG,
			actorUserId: ACTOR,
			idempotencyKey: `idem-profile-conflict-${tag}`,
			employeeId: employee.id,
			summary: "First payload",
		};
		const profileFirst = await createTalentProfile(
			{
				...profilePayload,
				correlationId: `corr-profile-idem1-${tag}`,
			},
			ready,
		);
		expect(profileFirst.ok).toBe(true);
		if (!profileFirst.ok) return;

		const profileConflict = await createTalentProfile(
			{
				...profilePayload,
				correlationId: `corr-profile-idem2-${tag}`,
				summary: "Different payload",
			},
			ready,
		);
		expect(profileConflict.ok).toBe(false);
		expect(humanResourcesCodeFromResult(profileConflict)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);

		const poolPayload = {
			organizationId: ORG,
			actorUserId: ACTOR,
			idempotencyKey: `idem-pool-conflict-${tag}`,
			code: `POOL-IDEM-${tag}`,
			name: "Bench A",
		};
		const poolFirst = await createTalentPool(
			{
				...poolPayload,
				correlationId: `corr-pool-idem1-${tag}`,
			},
			ready,
		);
		expect(poolFirst.ok).toBe(true);
		if (!poolFirst.ok) return;

		const poolConflict = await createTalentPool(
			{
				...poolPayload,
				correlationId: `corr-pool-idem2-${tag}`,
				name: "Bench B",
			},
			ready,
		);
		expect(poolConflict.ok).toBe(false);
		expect(humanResourcesCodeFromResult(poolConflict)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});
}

describe("@afenda/human-resources talent competency guards (memory)", () => {
	const ORG = `org-talent-comp-guard-${Date.now()}`;
	const ACTOR = `user-talent-comp-guard-${Date.now()}`;

	function ready() {
		return createHrParityHarness("memory");
	}

	async function seedCompetencyAndEmployee(suffix: string) {
		const harness = ready();
		const employee = await seedEmployee(harness, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});
		const competency = await createCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-guard-comp-${suffix}`,
				idempotencyKey: `idem-guard-comp-${suffix}`,
				code: `GUARD-${suffix}`,
				name: "Guard skill",
				scaleCode: "five_point",
			},
			harness,
		);
		if (!competency.ok) {
			throw new Error(competency.message);
		}
		return { harness, employee, competency: competency.data };
	}

	it("rejects assessment with scale mismatch", async () => {
		const suffix = `scale-${Date.now()}`;
		const { harness, employee, competency } =
			await seedCompetencyAndEmployee(suffix);
		const result = await assessEmployeeCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-scale-${suffix}`,
				idempotencyKey: `idem-scale-${suffix}`,
				employeeId: employee.id,
				competencyId: competency.id,
				assessorUserId: ACTOR,
				evidenceSource: "Test evidence",
				scaleCode: "behavioral_anchor",
				level: 3,
				effectiveOn: "2025-01-01",
			},
			harness,
		);
		expect(result.ok).toBe(false);
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects assessment with invalid level and expiry before effective", async () => {
		const suffix = `level-${Date.now()}`;
		const { harness, employee, competency } =
			await seedCompetencyAndEmployee(suffix);

		const invalidLevel = await assessEmployeeCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-level-${suffix}`,
				idempotencyKey: `idem-level-${suffix}`,
				employeeId: employee.id,
				competencyId: competency.id,
				assessorUserId: ACTOR,
				evidenceSource: "Test evidence",
				scaleCode: "five_point",
				level: 6,
				effectiveOn: "2025-01-01",
			},
			harness,
		);
		expect(invalidLevel.ok).toBe(false);

		const invalidExpiry = await assessEmployeeCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-expiry-${suffix}`,
				idempotencyKey: `idem-expiry-${suffix}`,
				employeeId: employee.id,
				competencyId: competency.id,
				assessorUserId: ACTOR,
				evidenceSource: "Test evidence",
				scaleCode: "five_point",
				level: 3,
				effectiveOn: "2025-06-01",
				expiresOn: "2025-01-01",
			},
			harness,
		);
		expect(invalidExpiry.ok).toBe(false);
		expect(humanResourcesCodeFromResult(invalidExpiry)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects expire on superseded assessment", async () => {
		const suffix = `expire-sup-${Date.now()}`;
		const { harness, employee, competency } =
			await seedCompetencyAndEmployee(suffix);

		const assessed = await assessEmployeeCompetency(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exp-sup-${suffix}`,
				idempotencyKey: `idem-exp-sup-${suffix}`,
				employeeId: employee.id,
				competencyId: competency.id,
				assessorUserId: ACTOR,
				evidenceSource: "Initial evidence",
				scaleCode: "five_point",
				level: 2,
				effectiveOn: "2025-01-01",
			},
			harness,
		);
		expect(assessed.ok).toBe(true);
		if (!assessed.ok) return;

		const superseded = await supersedeCompetencyAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exp-sup2-${suffix}`,
				idempotencyKey: `idem-exp-sup2-${suffix}`,
				assessmentId: assessed.data.id,
				assessorUserId: ACTOR,
				evidenceSource: "Updated evidence",
				level: 3,
				effectiveOn: "2025-03-01",
				expectedVersion: assessed.data.version,
			},
			harness,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) return;

		const expireOld = await expireCompetencyAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-exp-old-${suffix}`,
				assessmentId: assessed.data.id,
				expectedVersion: assessed.data.version + 1,
			},
			harness,
		);
		expect(expireOld.ok).toBe(false);
		expect(humanResourcesCodeFromResult(expireOld)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});
});

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
