/**
 * Talent management domain rules matrix (HR-ENT-TALENT-UNIT-TESTS / Slice 9.8).
 */

import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
} from "../src/error-codes";
import { createPosition } from "../src/organization/position";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { assertReadinessNotStale } from "../src/shared/talent-guards";
import { SUCCESSION_READINESS_MAX_AGE_DAYS } from "../src/shared/talent-status";
import {
	acknowledgeCareerPlan,
	addCareerPlanAction,
	closeCareerPlan,
	completeCareerPlanAction,
	createCareerPlan,
	getCareerPlanById,
} from "../src/talent/career-plan";
import {
	assessEmployeeCompetency,
	createCompetency,
	getCompetencyById,
	getEmployeeCompetencyProfile,
	mapCompetencyToJob,
	removeCompetencyFromJob,
	retireCompetency,
	supersedeCompetencyAssessment,
} from "../src/talent/competency";
import {
	approveSuccessionCandidate,
	assessSuccessionReadiness,
	closeSuccessionPlan,
	createSuccessionPlan,
	getPositionSuccessionCoverage,
	nominateSuccessionCandidate,
} from "../src/talent/succession-plan";
import {
	approveTalentPoolMember,
	closeTalentPool,
	createTalentPool,
	listTalentPoolMembers,
	nominateTalentPoolMember,
	removeTalentPoolMember,
} from "../src/talent/talent-pool";
import {
	archiveTalentProfile,
	confirmTalentProfileAssessment,
	createTalentProfile,
	getTalentProfileByEmployee,
	recordTalentProfileAssessment,
	updateTalentProfile,
} from "../src/talent/talent-profile";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG_A = "org-talent-a";
const ORG_B = "org-talent-b";
const ACTOR = "user-talent-actor";
const NOMINATOR = "user-talent-nominator";
const ASSESSOR = "user-talent-assessor";

function suffix(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
	ports = createMemoryMutationPorts(),
) {
	const store = createMemoryHumanResourcesStore();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
	});
}

async function seedEmployee(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		suffix: string;
		withEmployment?: boolean;
	},
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
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
	if (input.withEmployment !== false) {
		const employment = await createEmployment(
			{
				organizationId: input.organizationId,
				actorUserId: ACTOR,
				correlationId: `corr-employ-${input.suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		if (!employment.ok) {
			throw new Error(`Failed to seed employment: ${employment.code}`);
		}
	}
	return employee.data;
}

async function seedCompetency(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; code: string },
) {
	const created = await createCompetency(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-comp-${input.code}`,
			idempotencyKey: `idem-comp-${input.code}`,
			code: input.code,
			name: `Competency ${input.code}`,
			scaleCode: "five_point",
		},
		ready,
	);
	if (!created.ok) {
		throw new Error(`Failed to seed competency: ${created.code}`);
	}
	return created.data;
}

async function seedPosition(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; tag: string },
) {
	const orgSeed = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: ACTOR,
		correlationId: `corr-org-${input.tag}`,
	});
	if (orgSeed === null) {
		throw new Error("Failed to seed department/job");
	}
	const position = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
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
	return { position: position.data, jobId: orgSeed.jobId };
}

describe("human-resources talent (memory)", () => {
	describe("Competency library", () => {
		it("maps competency to job and removes mapping", async () => {
			const ready = harness();
			const tag = suffix();
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `MAP-${tag}`,
			});
			const { jobId } = await seedPosition(ready, {
				organizationId: ORG_A,
				tag,
			});

			const mapped = await mapCompetencyToJob(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-map-${tag}`,
					jobId,
					competencyId: competency.id,
					requiredLevel: 3,
				},
				ready,
			);
			expect(mapped.ok).toBe(true);
			if (!mapped.ok) {
				return;
			}
			expect(mapped.data.status).toBe("active");

			const removed = await removeCompetencyFromJob(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-unmap-${tag}`,
					jobCompetencyId: mapped.data.id,
					expectedVersion: mapped.data.version,
				},
				ready,
			);
			expect(removed.ok).toBe(true);
			if (!removed.ok) {
				return;
			}
			expect(removed.data.status).toBe("removed");
		});

		it("rejects mapping to retired competency", async () => {
			const ready = harness();
			const tag = suffix();
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `RET-MAP-${tag}`,
			});
			const { jobId } = await seedPosition(ready, {
				organizationId: ORG_A,
				tag: `ret-${tag}`,
			});

			const retired = await retireCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-retire-${tag}`,
					competencyId: competency.id,
					expectedVersion: competency.version,
				},
				ready,
			);
			expect(retired.ok).toBe(true);
			if (!retired.ok) {
				return;
			}

			const denied = await mapCompetencyToJob(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-map-retired-${tag}`,
					jobId,
					competencyId: competency.id,
					requiredLevel: 2,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects double retire", async () => {
			const ready = harness();
			const tag = suffix();
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `DBL-RET-${tag}`,
			});

			const first = await retireCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ret1-${tag}`,
					competencyId: competency.id,
					expectedVersion: competency.version,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await retireCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ret2-${tag}`,
					competencyId: competency.id,
					expectedVersion: first.data.version,
				},
				ready,
			);
			expect(second.ok).toBe(false);
			if (second.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects duplicate job competency mapping", async () => {
			const ready = harness();
			const tag = suffix();
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `DUP-MAP-${tag}`,
			});
			const { jobId } = await seedPosition(ready, {
				organizationId: ORG_A,
				tag: `dup-${tag}`,
			});

			const first = await mapCompetencyToJob(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-map1-${tag}`,
					jobId,
					competencyId: competency.id,
					requiredLevel: 3,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await mapCompetencyToJob(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-map2-${tag}`,
					jobId,
					competencyId: competency.id,
					requiredLevel: 4,
				},
				ready,
			);
			expect(second.ok).toBe(false);
			if (second.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		});

		it("scopes competency lookup to organization", async () => {
			const ready = harness();
			const tag = suffix();
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `ORG-${tag}`,
			});

			const crossOrg = await getCompetencyById(
				{
					organizationId: ORG_B,
					actorUserId: ACTOR,
					correlationId: `corr-cross-${tag}`,
					competencyId: competency.id,
				},
				ready,
			);
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) {
				return;
			}
			expect(crossOrg.data).toBeNull();
		});

		it("replays competency create idempotency key", async () => {
			const ready = harness();
			const tag = suffix();
			const payload = {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-idem-${tag}`,
				idempotencyKey: `idem-comp-replay-${tag}`,
				code: `IDEM-${tag}`,
				name: "Idempotent competency",
				scaleCode: "five_point" as const,
			};

			const first = await createCompetency(payload, ready);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const replay = await createCompetency(
				{ ...payload, correlationId: `corr-idem-replay-${tag}` },
				ready,
			);
			expect(replay.ok).toBe(true);
			if (!replay.ok) {
				return;
			}
			expect(replay.data.id).toBe(first.data.id);

			const conflict = await createCompetency(
				{
					...payload,
					correlationId: `corr-idem-conflict-${tag}`,
					name: "Different name",
				},
				ready,
			);
			expect(conflict.ok).toBe(false);
			if (conflict.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(conflict)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		});
	});

	describe("Competency assessment", () => {
		it("records and supersedes employee competency assessment", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `assess-${tag}`,
			});
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `ASS-${tag}`,
			});

			const assessed = await assessEmployeeCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-assess-${tag}`,
					idempotencyKey: `idem-assess-${tag}`,
					employeeId: employee.id,
					competencyId: competency.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "manager review",
					scaleCode: "five_point",
					level: 4,
					effectiveOn: todayIso(),
				},
				ready,
			);
			expect(assessed.ok).toBe(true);
			if (!assessed.ok) {
				return;
			}
			expect(assessed.data.status).toBe("current");

			const superseded = await supersedeCompetencyAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-sup-${tag}`,
					idempotencyKey: `idem-sup-${tag}`,
					assessmentId: assessed.data.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "annual review",
					level: 5,
					effectiveOn: todayIso(),
					expectedVersion: assessed.data.version,
				},
				ready,
			);
			expect(superseded.ok).toBe(true);
			if (!superseded.ok) {
				return;
			}
			expect(superseded.data.status).toBe("current");
			expect(superseded.data.level).toBe(5);

			const profile = await getEmployeeCompetencyProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-profile-${tag}`,
					employeeId: employee.id,
				},
				ready,
			);
			expect(profile.ok).toBe(true);
			if (!profile.ok) {
				return;
			}
			expect(
				profile.data.assessments.some((a) => a.id === superseded.data.id),
			).toBe(true);
		});

		it("rejects scale mismatch on assessment", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `scale-${tag}`,
			});
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `SCALE-${tag}`,
			});

			const denied = await assessEmployeeCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-scale-${tag}`,
					idempotencyKey: `idem-scale-${tag}`,
					employeeId: employee.id,
					competencyId: competency.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "review",
					scaleCode: "three_point",
					level: 2,
					effectiveOn: todayIso(),
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});

		it("rejects future effective date on assessment", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `future-${tag}`,
			});
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `FUT-${tag}`,
			});

			const future = new Date();
			future.setUTCDate(future.getUTCDate() + 7);

			const denied = await assessEmployeeCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-future-${tag}`,
					idempotencyKey: `idem-future-${tag}`,
					employeeId: employee.id,
					competencyId: competency.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "review",
					scaleCode: "five_point",
					level: 3,
					effectiveOn: future.toISOString().slice(0, 10),
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});

		it("rejects second current assessment without supersede", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `dup-assess-${tag}`,
			});
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `DUP-ASS-${tag}`,
			});

			const first = await assessEmployeeCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-dup1-${tag}`,
					idempotencyKey: `idem-dup1-${tag}`,
					employeeId: employee.id,
					competencyId: competency.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "review",
					scaleCode: "five_point",
					level: 3,
					effectiveOn: todayIso(),
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await assessEmployeeCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-dup2-${tag}`,
					idempotencyKey: `idem-dup2-${tag}`,
					employeeId: employee.id,
					competencyId: competency.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "review 2",
					scaleCode: "five_point",
					level: 4,
					effectiveOn: todayIso(),
				},
				ready,
			);
			expect(second.ok).toBe(false);
			if (second.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		});

		it("rejects assessment on retired competency", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `ret-assess-${tag}`,
			});
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `RET-ASS-${tag}`,
			});
			const retired = await retireCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ret-assess-${tag}`,
					competencyId: competency.id,
					expectedVersion: competency.version,
				},
				ready,
			);
			expect(retired.ok).toBe(true);
			if (!retired.ok) {
				return;
			}

			const denied = await assessEmployeeCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-assess-ret-${tag}`,
					idempotencyKey: `idem-assess-ret-${tag}`,
					employeeId: employee.id,
					competencyId: competency.id,
					assessorUserId: ASSESSOR,
					evidenceSource: "review",
					scaleCode: "five_point",
					level: 2,
					effectiveOn: todayIso(),
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("replays assessment create idempotency key", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `idem-assess-${tag}`,
			});
			const competency = await seedCompetency(ready, {
				organizationId: ORG_A,
				code: `IDEM-ASS-${tag}`,
			});
			const payload = {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-idem-assess-${tag}`,
				idempotencyKey: `idem-assess-replay-${tag}`,
				employeeId: employee.id,
				competencyId: competency.id,
				assessorUserId: ASSESSOR,
				evidenceSource: "review",
				scaleCode: "five_point" as const,
				level: 3,
				effectiveOn: todayIso(),
			};

			const first = await assessEmployeeCompetency(payload, ready);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const replay = await assessEmployeeCompetency(
				{ ...payload, correlationId: `corr-idem-assess-replay-${tag}` },
				ready,
			);
			expect(replay.ok).toBe(true);
			if (!replay.ok) {
				return;
			}
			expect(replay.data.id).toBe(first.data.id);
		});
	});

	describe("Talent profile", () => {
		it("confirms draft profile assessment", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `prof-${tag}`,
			});
			const profile = await createTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-profile-${tag}`,
					idempotencyKey: `idem-profile-${tag}`,
					employeeId: employee.id,
					summary: "High potential",
				},
				ready,
			);
			expect(profile.ok).toBe(true);
			if (!profile.ok) {
				return;
			}

			const draft = await recordTalentProfileAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-draft-${tag}`,
					talentProfileId: profile.data.id,
					methodCode: "manager_evidence_review",
					classification: "high_potential",
					evidenceSummary: "Strong delivery",
					assessorUserId: ASSESSOR,
				},
				ready,
			);
			expect(draft.ok).toBe(true);
			if (!draft.ok) {
				return;
			}
			expect(draft.data.status).toBe("draft");

			const confirmed = await confirmTalentProfileAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-confirm-${tag}`,
					assessmentId: draft.data.id,
					expectedVersion: draft.data.version,
				},
				ready,
			);
			expect(confirmed.ok).toBe(true);
			if (!confirmed.ok) {
				return;
			}
			expect(confirmed.data.status).toBe("confirmed");
		});

		it("rejects confirming non-draft assessment", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `confirm-${tag}`,
			});
			const profile = await createTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-profile-c-${tag}`,
					idempotencyKey: `idem-profile-c-${tag}`,
					employeeId: employee.id,
					summary: "Bench",
				},
				ready,
			);
			expect(profile.ok).toBe(true);
			if (!profile.ok) {
				return;
			}

			const draft = await recordTalentProfileAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-draft-c-${tag}`,
					talentProfileId: profile.data.id,
					methodCode: "manager_evidence_review",
					classification: "solid",
					evidenceSummary: "Consistent performer",
					assessorUserId: ASSESSOR,
				},
				ready,
			);
			expect(draft.ok).toBe(true);
			if (!draft.ok) {
				return;
			}

			const confirmed = await confirmTalentProfileAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-confirm1-${tag}`,
					assessmentId: draft.data.id,
					expectedVersion: draft.data.version,
				},
				ready,
			);
			expect(confirmed.ok).toBe(true);
			if (!confirmed.ok) {
				return;
			}

			const denied = await confirmTalentProfileAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-confirm2-${tag}`,
					assessmentId: draft.data.id,
					expectedVersion: confirmed.data.version,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects profile assessment without evidence", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `evidence-${tag}`,
			});
			const profile = await createTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-profile-e-${tag}`,
					idempotencyKey: `idem-profile-e-${tag}`,
					employeeId: employee.id,
					summary: "Bench",
				},
				ready,
			);
			expect(profile.ok).toBe(true);
			if (!profile.ok) {
				return;
			}

			const denied = await recordTalentProfileAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-no-evidence-${tag}`,
					talentProfileId: profile.data.id,
					methodCode: "manager_evidence_review",
					classification: "solid",
					evidenceSummary: "   ",
					assessorUserId: ASSESSOR,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});

		it("rejects update on archived profile", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `arch-${tag}`,
			});
			const profile = await createTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-profile-a-${tag}`,
					idempotencyKey: `idem-profile-a-${tag}`,
					employeeId: employee.id,
					summary: "Archive candidate",
				},
				ready,
			);
			expect(profile.ok).toBe(true);
			if (!profile.ok) {
				return;
			}

			const archived = await archiveTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-archive-${tag}`,
					talentProfileId: profile.data.id,
					expectedVersion: profile.data.version,
				},
				ready,
			);
			expect(archived.ok).toBe(true);
			if (!archived.ok) {
				return;
			}

			const denied = await updateTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-update-arch-${tag}`,
					talentProfileId: profile.data.id,
					summary: "Should fail",
					expectedVersion: archived.data.version,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("scopes talent profile lookup to organization", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `cross-prof-${tag}`,
			});
			await createTalentProfile(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-profile-cross-${tag}`,
					idempotencyKey: `idem-profile-cross-${tag}`,
					employeeId: employee.id,
					summary: "Org A profile",
				},
				ready,
			);

			const crossOrg = await getTalentProfileByEmployee(
				{
					organizationId: ORG_B,
					actorUserId: ACTOR,
					correlationId: `corr-get-cross-${tag}`,
					employeeId: employee.id,
					includeSensitive: false,
				},
				ready,
			);
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) {
				return;
			}
			expect(crossOrg.data).toBeNull();
		});
	});

	describe("Talent pool", () => {
		it("runs nominate → approve → remove member lifecycle", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `pool-${tag}`,
			});
			const pool = await createTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-pool-${tag}`,
					idempotencyKey: `idem-pool-${tag}`,
					code: `POOL-${tag}`,
					name: "Leadership bench",
				},
				ready,
			);
			expect(pool.ok).toBe(true);
			if (!pool.ok) {
				return;
			}

			const nominated = await nominateTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-${tag}`,
					idempotencyKey: `idem-nom-${tag}`,
					poolId: pool.data.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}
			expect(nominated.data.status).toBe("nominated");

			const approved = await approveTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-appr-${tag}`,
					memberId: nominated.data.id,
					approverUserId: ACTOR,
					expectedVersion: nominated.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}
			expect(approved.data.status).toBe("approved");

			const removed = await removeTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-rem-${tag}`,
					memberId: approved.data.id,
					expectedVersion: approved.data.version,
				},
				ready,
			);
			expect(removed.ok).toBe(true);
			if (!removed.ok) {
				return;
			}
			expect(removed.data.status).toBe("removed");
		});

		it("rejects nomination without nominator", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `nom-${tag}`,
			});
			const pool = await createTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-pool-nom-${tag}`,
					idempotencyKey: `idem-pool-nom-${tag}`,
					code: `POOL-NOM-${tag}`,
					name: "Bench",
				},
				ready,
			);
			expect(pool.ok).toBe(true);
			if (!pool.ok) {
				return;
			}

			const denied = await nominateTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-empty-${tag}`,
					idempotencyKey: `idem-nom-empty-${tag}`,
					poolId: pool.data.id,
					employeeId: employee.id,
					nominatorUserId: "   ",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});

		it("rejects duplicate active pool member", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `dup-pool-${tag}`,
			});
			const pool = await createTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-pool-dup-${tag}`,
					idempotencyKey: `idem-pool-dup-${tag}`,
					code: `POOL-DUP-${tag}`,
					name: "Bench",
				},
				ready,
			);
			expect(pool.ok).toBe(true);
			if (!pool.ok) {
				return;
			}

			const first = await nominateTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom1-${tag}`,
					idempotencyKey: `idem-nom1-${tag}`,
					poolId: pool.data.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await nominateTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom2-${tag}`,
					idempotencyKey: `idem-nom2-${tag}`,
					poolId: pool.data.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
				},
				ready,
			);
			expect(second.ok).toBe(false);
			if (second.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		});

		it("rejects nomination after pool is closed", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `closed-pool-${tag}`,
			});
			const pool = await createTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-pool-closed-${tag}`,
					idempotencyKey: `idem-pool-closed-${tag}`,
					code: `POOL-CLOSED-${tag}`,
					name: "Closed bench",
				},
				ready,
			);
			expect(pool.ok).toBe(true);
			if (!pool.ok) {
				return;
			}

			const closed = await closeTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-close-pool-${tag}`,
					poolId: pool.data.id,
					expectedVersion: pool.data.version,
				},
				ready,
			);
			expect(closed.ok).toBe(true);
			if (!closed.ok) {
				return;
			}

			const denied = await nominateTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-closed-${tag}`,
					idempotencyKey: `idem-nom-closed-${tag}`,
					poolId: pool.data.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects approving non-nominated member", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `appr-pool-${tag}`,
			});
			const pool = await createTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-pool-appr-${tag}`,
					idempotencyKey: `idem-pool-appr-${tag}`,
					code: `POOL-APPR-${tag}`,
					name: "Bench",
				},
				ready,
			);
			expect(pool.ok).toBe(true);
			if (!pool.ok) {
				return;
			}

			const nominated = await nominateTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-appr-${tag}`,
					idempotencyKey: `idem-nom-appr-${tag}`,
					poolId: pool.data.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}

			const approved = await approveTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-appr1-${tag}`,
					memberId: nominated.data.id,
					approverUserId: ACTOR,
					expectedVersion: nominated.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}

			const denied = await approveTalentPoolMember(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-appr2-${tag}`,
					memberId: nominated.data.id,
					approverUserId: ACTOR,
					expectedVersion: approved.data.version,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("replays talent pool create idempotency key", async () => {
			const ready = harness();
			const tag = suffix();
			const payload = {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-pool-idem-${tag}`,
				idempotencyKey: `idem-pool-replay-${tag}`,
				code: `POOL-IDEM-${tag}`,
				name: "Idempotent pool",
			};

			const first = await createTalentPool(payload, ready);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const replay = await createTalentPool(
				{ ...payload, correlationId: `corr-pool-idem-replay-${tag}` },
				ready,
			);
			expect(replay.ok).toBe(true);
			if (!replay.ok) {
				return;
			}
			expect(replay.data.id).toBe(first.data.id);

			const listed = await listTalentPoolMembers(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-list-pool-${tag}`,
					poolId: first.data.id,
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (!listed.ok) {
				return;
			}
			expect(listed.data.members).toHaveLength(0);
		});
	});

	describe("Career plan", () => {
		it("runs draft → acknowledge → action → complete → close", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `career-${tag}`,
			});

			const created = await createCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-cp-${tag}`,
					idempotencyKey: `idem-cp-${tag}`,
					employeeId: employee.id,
					ownerUserId: ACTOR,
					code: `CP-${tag}`,
					title: "Grow to principal",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}
			expect(created.data.status).toBe("draft");

			const acknowledged = await acknowledgeCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ack-${tag}`,
					careerPlanId: created.data.id,
					expectedVersion: created.data.version,
				},
				ready,
			);
			expect(acknowledged.ok).toBe(true);
			if (!acknowledged.ok) {
				return;
			}
			expect(acknowledged.data.status).toBe("acknowledged");

			const action = await addCareerPlanAction(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-action-${tag}`,
					careerPlanId: acknowledged.data.id,
					title: "Complete leadership course",
					dueOn: "2026-12-31",
				},
				ready,
			);
			expect(action.ok).toBe(true);
			if (!action.ok) {
				return;
			}

			const completed = await completeCareerPlanAction(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-complete-${tag}`,
					actionId: action.data.id,
					expectedVersion: action.data.version,
				},
				ready,
			);
			expect(completed.ok).toBe(true);
			if (!completed.ok) {
				return;
			}
			expect(completed.data.status).toBe("done");

			const closed = await closeCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-close-cp-${tag}`,
					careerPlanId: acknowledged.data.id,
					expectedVersion: acknowledged.data.version,
				},
				ready,
			);
			expect(closed.ok).toBe(true);
			if (!closed.ok) {
				return;
			}
			expect(closed.data.status).toBe("closed");
		});

		it("rejects acknowledging non-draft career plan", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `ack-${tag}`,
			});
			const plan = await createCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-cp-ack-${tag}`,
					idempotencyKey: `idem-cp-ack-${tag}`,
					employeeId: employee.id,
					ownerUserId: ACTOR,
					code: `CP-ACK-${tag}`,
					title: "Plan",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const acknowledged = await acknowledgeCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ack1-${tag}`,
					careerPlanId: plan.data.id,
					expectedVersion: plan.data.version,
				},
				ready,
			);
			expect(acknowledged.ok).toBe(true);
			if (!acknowledged.ok) {
				return;
			}

			const denied = await acknowledgeCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ack2-${tag}`,
					careerPlanId: plan.data.id,
					expectedVersion: acknowledged.data.version,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects adding action on closed career plan", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `closed-cp-${tag}`,
			});
			const plan = await createCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-cp-closed-${tag}`,
					idempotencyKey: `idem-cp-closed-${tag}`,
					employeeId: employee.id,
					ownerUserId: ACTOR,
					code: `CP-CLOSED-${tag}`,
					title: "Plan",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const closed = await closeCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-close-${tag}`,
					careerPlanId: plan.data.id,
					expectedVersion: plan.data.version,
				},
				ready,
			);
			expect(closed.ok).toBe(true);
			if (!closed.ok) {
				return;
			}

			const denied = await addCareerPlanAction(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-action-closed-${tag}`,
					careerPlanId: plan.data.id,
					title: "Too late",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("replays career plan create idempotency key", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `idem-cp-${tag}`,
			});
			const payload = {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-cp-idem-${tag}`,
				idempotencyKey: `idem-cp-replay-${tag}`,
				employeeId: employee.id,
				ownerUserId: ACTOR,
				code: `CP-IDEM-${tag}`,
				title: "Idempotent plan",
			};

			const first = await createCareerPlan(payload, ready);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const replay = await createCareerPlan(
				{ ...payload, correlationId: `corr-cp-idem-replay-${tag}` },
				ready,
			);
			expect(replay.ok).toBe(true);
			if (!replay.ok) {
				return;
			}
			expect(replay.data.id).toBe(first.data.id);
		});

		it("scopes career plan lookup to organization", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `cross-cp-${tag}`,
			});
			const plan = await createCareerPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-cp-cross-${tag}`,
					idempotencyKey: `idem-cp-cross-${tag}`,
					employeeId: employee.id,
					ownerUserId: ACTOR,
					code: `CP-CROSS-${tag}`,
					title: "Org A plan",
				},
				ready,
			);
			expect(plan.ok).toBe(true);
			if (!plan.ok) {
				return;
			}

			const crossOrg = await getCareerPlanById(
				{
					organizationId: ORG_B,
					actorUserId: ACTOR,
					correlationId: `corr-get-cp-cross-${tag}`,
					careerPlanId: plan.data.id,
				},
				ready,
			);
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) {
				return;
			}
			expect(crossOrg.data).toBeNull();
		});
	});

	describe("Succession and readiness staleness", () => {
		it("treats readiness at max age as fresh and beyond max age as stale", () => {
			const asOf = todayIso();
			const atMaxAge = daysAgoIso(SUCCESSION_READINESS_MAX_AGE_DAYS);
			const beyondMaxAge = daysAgoIso(SUCCESSION_READINESS_MAX_AGE_DAYS + 1);

			const fresh = assertReadinessNotStale({
				readinessEffectiveOn: atMaxAge,
				asOfDate: asOf,
			});
			expect(fresh.ok).toBe(true);

			const stale = assertReadinessNotStale({
				readinessEffectiveOn: beyondMaxAge,
				asOfDate: asOf,
			});
			expect(stale.ok).toBe(false);
			if (stale.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(stale)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
			expect(stale.code).toBe("BAD_REQUEST");
		});

		async function seedSuccessionPlan(
			ready: ReturnType<typeof harness>,
			tag: string,
			options?: { allowsExternalCandidates?: boolean },
		) {
			const { position } = await seedPosition(ready, {
				organizationId: ORG_A,
				tag: `succ-${tag}`,
			});
			const plan = await createSuccessionPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-sp-${tag}`,
					idempotencyKey: `idem-sp-${tag}`,
					code: `SP-${tag}`,
					title: "CEO succession",
					positionId: position.id,
					allowsExternalCandidates: options?.allowsExternalCandidates,
				},
				ready,
			);
			if (!plan.ok) {
				throw new Error(`Failed to seed succession plan: ${plan.code}`);
			}
			return { plan: plan.data, position };
		}

		it("nominates employee candidate on draft plan", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `succ-nom-${tag}`,
			});
			const { plan } = await seedSuccessionPlan(ready, tag);

			const nominated = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-succ-nom-${tag}`,
					idempotencyKey: `idem-succ-nom-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_soon",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "Strong bench candidate",
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}
			expect(nominated.data.status).toBe("nominated");
		});

		it("rejects external candidate when plan disallows externals", async () => {
			const ready = harness();
			const tag = suffix();
			const { plan } = await seedSuccessionPlan(ready, tag, {
				allowsExternalCandidates: false,
			});

			const denied = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-ext-${tag}`,
					idempotencyKey: `idem-ext-${tag}`,
					successionPlanId: plan.id,
					externalCandidateRef: "EXT-001",
					nominatorUserId: NOMINATOR,
					readiness: "ready_soon",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "External leader",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects nomination on closed succession plan", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `succ-closed-${tag}`,
			});
			const { plan } = await seedSuccessionPlan(ready, `closed-${tag}`);

			const closed = await closeSuccessionPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-sp-close-${tag}`,
					successionPlanId: plan.id,
					expectedVersion: plan.version,
				},
				ready,
			);
			expect(closed.ok).toBe(true);
			if (!closed.ok) {
				return;
			}

			const denied = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-closed-sp-${tag}`,
					idempotencyKey: `idem-nom-closed-sp-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_soon",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "Too late",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects nomination without active employment", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `no-employ-${tag}`,
				withEmployment: false,
			});

			const { plan } = await seedSuccessionPlan(ready, `no-employ-${tag}`);
			const denied = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-no-employ-${tag}`,
					idempotencyKey: `idem-nom-no-employ-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_soon",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "Inactive employment",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		});

		it("rejects readiness assessment with future effective date", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `succ-future-${tag}`,
			});
			const { plan } = await seedSuccessionPlan(ready, `future-${tag}`);
			const nominated = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-future-${tag}`,
					idempotencyKey: `idem-nom-future-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_soon",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "Candidate",
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}

			const future = new Date();
			future.setUTCDate(future.getUTCDate() + 5);

			const denied = await assessSuccessionReadiness(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-assess-future-${tag}`,
					candidateId: nominated.data.id,
					readiness: "ready_now",
					readinessEffectiveOn: future.toISOString().slice(0, 10),
					evidenceSummary: "Future dated",
					expectedVersion: nominated.data.version,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		});

		it("approves nominated succession candidate", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `succ-appr-${tag}`,
			});
			const { plan } = await seedSuccessionPlan(ready, `appr-${tag}`);
			const nominated = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-appr-${tag}`,
					idempotencyKey: `idem-nom-appr-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_now",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "Ready now",
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}

			const approved = await approveSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-appr-succ-${tag}`,
					candidateId: nominated.data.id,
					expectedVersion: nominated.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}
			expect(approved.data.status).toBe("approved");
		});

		it("excludes stale readiness from position succession coverage counts", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `stale-${tag}`,
			});
			const { plan, position } = await seedSuccessionPlan(
				ready,
				`stale-${tag}`,
			);
			const nominated = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-stale-${tag}`,
					idempotencyKey: `idem-nom-stale-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_now",
					readinessEffectiveOn: daysAgoIso(
						SUCCESSION_READINESS_MAX_AGE_DAYS + 1,
					),
					evidenceSummary: "Stale readiness",
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}

			const approved = await approveSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-appr-stale-${tag}`,
					candidateId: nominated.data.id,
					expectedVersion: nominated.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}

			const coverage = await getPositionSuccessionCoverage(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-coverage-stale-${tag}`,
					positionId: position.id,
				},
				ready,
			);
			expect(coverage.ok).toBe(true);
			if (!coverage.ok) {
				return;
			}
			expect(coverage.data.totalActiveCandidateCount).toBeGreaterThanOrEqual(1);
			expect(coverage.data.readyNowCandidateCount).toBe(0);
		});

		it("includes fresh readiness in position succession coverage counts", async () => {
			const ready = harness();
			const tag = suffix();
			const employee = await seedEmployee(ready, {
				organizationId: ORG_A,
				suffix: `fresh-${tag}`,
			});
			const { plan, position } = await seedSuccessionPlan(
				ready,
				`fresh-${tag}`,
			);
			const nominated = await nominateSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-nom-fresh-${tag}`,
					idempotencyKey: `idem-nom-fresh-${tag}`,
					successionPlanId: plan.id,
					employeeId: employee.id,
					nominatorUserId: NOMINATOR,
					readiness: "ready_now",
					readinessEffectiveOn: todayIso(),
					evidenceSummary: "Fresh readiness",
				},
				ready,
			);
			expect(nominated.ok).toBe(true);
			if (!nominated.ok) {
				return;
			}

			const approved = await approveSuccessionCandidate(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-appr-fresh-${tag}`,
					candidateId: nominated.data.id,
					expectedVersion: nominated.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}

			const coverage = await getPositionSuccessionCoverage(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-coverage-fresh-${tag}`,
					positionId: position.id,
				},
				ready,
			);
			expect(coverage.ok).toBe(true);
			if (!coverage.ok) {
				return;
			}
			expect(coverage.data.readyNowCandidateCount).toBe(1);
		});
	});

	describe("Authorization", () => {
		it("requires competency.manage to create competency", async () => {
			const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]);
			const tag = suffix();

			const denied = await createCompetency(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-authz-comp-${tag}`,
					idempotencyKey: `idem-authz-comp-${tag}`,
					code: `AUTHZ-${tag}`,
					name: "Denied",
					scaleCode: "five_point",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		});

		it("requires succession.admin to create succession plan", async () => {
			const seedReady = harness();
			const tag = suffix();
			const { position } = await seedPosition(seedReady, {
				organizationId: ORG_A,
				tag: `authz-sp-${tag}`,
			});
			const ready = harness([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
			]);

			const denied = await createSuccessionPlan(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-authz-sp-${tag}`,
					idempotencyKey: `idem-authz-sp-${tag}`,
					code: `AUTHZ-SP-${tag}`,
					title: "Denied plan",
					positionId: position.id,
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		});

		it("requires talent.admin to create talent pool", async () => {
			const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]);
			const tag = suffix();

			const denied = await createTalentPool(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-authz-pool-${tag}`,
					idempotencyKey: `idem-authz-pool-${tag}`,
					code: `AUTHZ-POOL-${tag}`,
					name: "Denied pool",
				},
				ready,
			);
			expect(denied.ok).toBe(false);
			if (denied.ok) {
				return;
			}
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		});
	});
});
