/**
 * Hire orchestration saga (HR-COREORG-HIRE-ORCHESTRATION / Slice 6.6).
 */

import { describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { getEmployment } from "../src/core/employment";
import { hireEmployment } from "../src/core/employment-management";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../src/error-codes";
import { hireFromAcceptedOffer } from "../src/hire-orchestration/hire-from-accepted-offer";
import { hireStepIdempotencyKey } from "../src/hire-orchestration/types";
import { getOnboardingCase, listOnboardingTasks } from "../src/lifecycle/onboarding";
import { GOVERNED_ONBOARDING_CHECKLIST } from "../src/lifecycle/onboarding-checklist";
import { HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER } from "../src/module-ids";
import {
	createApplication,
	moveApplicationToInReview,
} from "../src/recruitment/application";
import { createCandidate } from "../src/recruitment/candidate";
import { acceptOffer } from "../src/recruitment/offer";
import { createAndIssueOffer } from "./helpers/offer-lifecycle-fixture";
import { createPosition } from "../src/organization/position";
import { fingerprintHireFromAcceptedOffer } from "../src/shared/fingerprint";
import { buildMutationMeta } from "../src/shared/mutation-meta";
import { createPerson } from "../src/workforce-foundation/person";
import { createWorker, getWorkerById } from "../src/workforce-foundation/worker";
import {
	approveHeadcountPlan,
	createHeadcountPlan,
	submitHeadcountPlan,
} from "../src/workforce-planning/headcount-plan";
import { addHeadcountPlanLine } from "../src/workforce-planning/headcount-plan-line";
import {
	listHeadcountReservations,
	reserveHeadcount,
} from "../src/workforce-planning/headcount-reservation";
import { candidateConsentFixture } from "./helpers/candidate-consent-fixture";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { createFailingOrganizationDimensionDirectory } from "./helpers/failing-organization-dimension-directory";
import { createHrParityHarness } from "./helpers/hr-parity-harness";
import { seedRequisitionPipeline } from "./helpers/recruitment-requisition-fixture";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG = "org-hire-orchestration-test";
const ACTOR = "user-hire-orchestration-actor";

const DEFAULT_TASKS = [
	{
		code: "identity_documents",
		title: "Identity documents",
		mandatory: true,
	},
] as const;

function suffix(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function approvePlanPipeline(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; tag: string },
) {
	const plan = await createHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-plan-${input.tag}`,
			idempotencyKey: `idem-plan-${input.tag}`,
			code: `WFP-${input.tag}`.slice(0, 64),
			title: "FY headcount",
			planningScopeKey: "org",
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
		},
		ready,
	);
	if (!plan.ok) return plan;

	const seeded = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `corr-seed-${input.tag}`,
	});
	if (!seeded) {
		return { ok: false as const, error: { code: "INTERNAL_ERROR" as const } };
	}

	const line = await addHeadcountPlanLine(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-line-${input.tag}`,
			planId: plan.data.id,
			departmentId: seeded.departmentId,
			jobId: seeded.jobId,
			plannedFte: "2.0000",
			plannedHeadcount: 2,
		},
		ready,
	);
	if (!line.ok) return line;

	let current = plan.data;
	const submitted = await submitHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-submit-${input.tag}`,
			planId: current.id,
			expectedVersion: current.version,
		},
		ready,
	);
	if (!submitted.ok) return submitted;
	current = submitted.data;

	const approved = await approveHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-approve-${input.tag}`,
			planId: current.id,
			expectedVersion: current.version,
		},
		ready,
	);
	if (!approved.ok) return approved;

	return {
		ok: true as const,
		data: { plan: approved.data, line: line.data },
	};
}

type AcceptedOfferSeed = {
	offerId: string;
	requisitionId: string;
	planLineId: string;
	tag: string;
};

async function seedAcceptedOfferPipeline(
	ready: ReturnType<typeof createHrParityHarness>,
	tag: string,
): Promise<
	| { ok: true; data: AcceptedOfferSeed }
	| { ok: false; error: { code: string } }
> {
	const approved = await approvePlanPipeline(ready, {
		organizationId: ORG,
		actorUserId: ACTOR,
		tag,
	});
	if (!approved.ok) {
		return approved;
	}

	const position = await createPosition(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-pos-${tag}`,
			code: `POS-${tag}`.slice(0, 64),
			title: `Position ${tag}`,
			departmentId: approved.data.line.departmentId,
			jobId: approved.data.line.jobId,
		},
		ready,
	);
	if (!position.ok) {
		return position;
	}

	const requisition = await seedRequisitionPipeline(ready, {
		organizationId: ORG,
		actorUserId: ACTOR,
		tag,
		targetStatus: "open",
		jobId: approved.data.line.jobId,
		positionId: position.data.id,
		departmentId: approved.data.line.departmentId,
	});
	if (!requisition.ok) {
		return requisition;
	}

	const reserved = await reserveHeadcount(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-res-${tag}`,
			idempotencyKey: `idem-res-${tag}`,
			planLineId: approved.data.line.id,
			requisitionId: requisition.data.id,
			reservedFte: "1.0000",
			reservedHeadcount: 1,
		},
		ready,
	);
	if (!reserved.ok) {
		return reserved;
	}

	const candidate = await createCandidate(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-cand-${tag}`,
			idempotencyKey: `idem-cand-${tag}`,
			displayName: "Hire Candidate",
			email: `hire-${tag}@example.com`,
			...candidateConsentFixture(),
		},
		ready,
	);
	if (!candidate.ok) return candidate;

	const application = await createApplication(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-app-${tag}`,
			candidateId: candidate.data.id,
			requisitionId: requisition.data.id,
		},
		ready,
	);
	if (!application.ok) return application;

	const inReview = await moveApplicationToInReview(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-review-${tag}`,
			applicationId: application.data.id,
			expectedVersion: application.data.version,
		},
		ready,
	);
	if (!inReview.ok) return inReview;

	const issued = await createAndIssueOffer(ready, {
		organizationId: ORG,
		actorUserId: ACTOR,
		applicationId: inReview.data.id,
		termsSummary: "Standard offer terms",
		expiresOn: "2026-12-31",
		correlationPrefix: `corr-offer-${tag}`,
	});
	if (!issued.ok) return issued;

	const accepted = await acceptOffer(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-accept-${tag}`,
			idempotencyKey: `idem-accept-${tag}`,
			offerId: issued.data.id,
			expectedVersion: issued.data.version,
			asOfDate: "2026-03-01",
		},
		ready,
	);
	if (!accepted.ok) return accepted;

	return {
		ok: true,
		data: {
			offerId: issued.data.id,
			requisitionId: requisition.data.id,
			planLineId: approved.data.line.id,
			tag,
		},
	};
}

function hireInput(
	seed: AcceptedOfferSeed,
	overrides?: Partial<{
		idempotencyKey: string;
		employeeNumber: string;
		correlationId: string;
	}>,
) {
	return {
		organizationId: ORG,
		actorUserId: ACTOR,
		correlationId: overrides?.correlationId ?? `corr-hire-${seed.tag}`,
		idempotencyKey: overrides?.idempotencyKey ?? `idem-hire-${seed.tag}`,
		offerId: seed.offerId,
		employeeNumber: overrides?.employeeNumber ?? `EMP-${seed.tag}`,
		startsOn: "2026-04-01",
		tasks: [...DEFAULT_TASKS],
		...TEST_ORGANIZATION_DIMENSION_KEYS,
	};
}

describe("@afenda/human-resources hire orchestration (Slice 6.6)", () => {
	it("E2E: accepted offer → hire saga → onboarding with sourceOfferId", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedAcceptedOfferPipeline(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const hired = await hireFromAcceptedOffer(hireInput(seeded.data), ready);
		expect(hired.ok).toBe(true);
		if (!hired.ok) return;

		expect(hired.data.attempt.status).toBe("completed");
		expect(hired.data.handoff.offerId).toBe(seeded.data.offerId);
		expect(hired.data.personId).toBe(hired.data.attempt.personId);
		expect(hired.data.onboardingCaseId).toBe(hired.data.attempt.onboardingCaseId);

		const onboarding = await getOnboardingCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-read-${tag}`,
				onboardingCaseId: hired.data.onboardingCaseId,
			},
			ready,
		);
		expect(onboarding.ok).toBe(true);
		if (onboarding.ok) {
			expect(onboarding.data.sourceOfferId).toBe(seeded.data.offerId);
		}

		const onboardingTasks = await listOnboardingTasks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-tasks-${tag}`,
				onboardingCaseId: hired.data.onboardingCaseId,
			},
			ready,
		);
		expect(onboardingTasks.ok).toBe(true);
		if (onboardingTasks.ok) {
			expect(onboardingTasks.data.map((row) => row.code).toSorted()).toEqual(
				GOVERNED_ONBOARDING_CHECKLIST.map((row) => row.code).toSorted(),
			);
		}

		const reservations = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-list-${tag}`,
				requisitionId: seeded.data.requisitionId,
			},
			ready,
		);
		expect(reservations.ok).toBe(true);
		if (reservations.ok) {
			expect(
				reservations.data.reservations.some((row) => row.status === "active"),
			).toBe(false);
		}
	});

	it("replays same saga idempotency key without duplicating entities", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedAcceptedOfferPipeline(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const input = hireInput(seeded.data);
		const first = await hireFromAcceptedOffer(input, ready);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const replay = await hireFromAcceptedOffer(input, ready);
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;

		expect(replay.data.personId).toBe(first.data.personId);
		expect(replay.data.employeeId).toBe(first.data.employeeId);
		expect(replay.data.employmentId).toBe(first.data.employmentId);
		expect(replay.data.workerId).toBe(first.data.workerId);
		expect(replay.data.assignmentId).toBe(first.data.assignmentId);
		expect(replay.data.onboardingCaseId).toBe(first.data.onboardingCaseId);
		expect(replay.data.attempt.id).toBe(first.data.attempt.id);
	});

	it("rejects idempotency key reuse with different payload fingerprint", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedAcceptedOfferPipeline(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const sagaKey = `idem-hire-${tag}`;
		const first = await hireFromAcceptedOffer(
			hireInput(seeded.data, { idempotencyKey: sagaKey }),
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const conflict = await hireFromAcceptedOffer(
			hireInput(seeded.data, {
				idempotencyKey: sagaKey,
				employeeNumber: "EMP-OTHER",
			}),
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(humanResourcesCodeFromResult(conflict)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("compensates when assignment create fails and marks attempt failed_compensated", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedAcceptedOfferPipeline(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const failed = await hireFromAcceptedOffer(hireInput(seeded.data), {
			...ready,
			organizationDimensions: createFailingOrganizationDimensionDirectory(),
		});
		expect(failed.ok).toBe(false);
		if (!failed.ok) {
			expect(humanResourcesCodeFromResult(failed)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}

		const store = ready.store;
		if (store === undefined) {
			throw new Error("Expected memory store on harness");
		}

		const attemptRecord = await store.findHireAttemptByIdempotencyKey({
			organizationId: ORG,
			idempotencyKey: `idem-hire-${seeded.data.tag}`,
		});
		expect(attemptRecord.ok).toBe(true);
		if (!attemptRecord.ok || attemptRecord.data === null) return;

		const attempt = attemptRecord.data.attempt;
		expect(attempt.status).toBe("failed_compensated");
		expect(attempt.personId).not.toBeNull();
		expect(attempt.employeeId).not.toBeNull();
		expect(attempt.employmentId).not.toBeNull();
		expect(attempt.workerId).not.toBeNull();
		expect(attempt.assignmentId).toBeNull();
		expect(attempt.compensationLog.length).toBeGreaterThan(0);

		if (attempt.employmentId !== null) {
			const employment = await getEmployment(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-emp-${tag}`,
					employmentId: attempt.employmentId,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (employment.ok) {
				expect(employment.data.status).toBe("terminated");
			}
		}

		if (attempt.workerId !== null) {
			const worker = await getWorkerById(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-worker-${tag}`,
					workerId: attempt.workerId,
				},
				ready,
			);
			expect(worker.ok).toBe(true);
			if (worker.ok) {
				expect(worker.data.status).toBe("inactive");
			}
		}
	});

	it("resumes from partial progress stored on hire attempt", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedAcceptedOfferPipeline(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const store = ready.store;
		if (store === undefined) {
			throw new Error("Expected memory store on harness");
		}

		const sagaKey = `idem-hire-resume-${tag}`;
		const correlationId = `corr-hire-resume-${tag}`;
		const requestFingerprint = fingerprintHireFromAcceptedOffer({
			offerId: seeded.data.offerId,
			employeeNumber: `EMP-RESUME-${tag}`,
			startsOn: "2026-04-01",
			positionId: null,
			legalName: "",
			preferredName: null,
			...TEST_ORGANIZATION_DIMENSION_KEYS,
			tasks: [...DEFAULT_TASKS],
		});

		const meta = buildMutationMeta({
			correlationId,
			operation: HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
		});

		const created = await store.createHireAttempt(
			{
				organizationId: ORG,
				offerId: seeded.data.offerId,
				correlationId,
				idempotencyKey: sagaKey,
				requestFingerprint,
				createdBy: ACTOR,
			},
			ready.ports,
			meta,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: hireStepIdempotencyKey(sagaKey, "person"),
				legalName: "Hire Candidate",
				preferredName: null,
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) return;

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: hireStepIdempotencyKey(sagaKey, "employee"),
				employeeNumber: `EMP-RESUME-${tag}`,
				legalName: "Hire Candidate",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await hireEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				employeeId: employee.data.id,
				startsOn: "2026-04-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: hireStepIdempotencyKey(sagaKey, "worker"),
				workerType: "employee",
				personId: person.data.id,
				employeeId: employee.data.id,
				effectiveFrom: "2026-04-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) return;

		const progressed = await store.updateHireAttemptProgress(
			{
				organizationId: ORG,
				attemptId: created.data.id,
				expectedVersion: created.data.version,
				currentStep: "worker_created",
				personId: person.data.id,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				workerId: worker.data.id,
				status: "in_progress",
				actorUserId: ACTOR,
			},
			ready.ports,
			meta,
		);
		expect(progressed.ok).toBe(true);
		if (!progressed.ok) return;

		const resumed = await hireFromAcceptedOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: sagaKey,
				offerId: seeded.data.offerId,
				employeeNumber: `EMP-RESUME-${tag}`,
				startsOn: "2026-04-01",
				tasks: [...DEFAULT_TASKS],
				...TEST_ORGANIZATION_DIMENSION_KEYS,
			},
			ready,
		);
		expect(resumed.ok).toBe(true);
		if (!resumed.ok) return;

		expect(resumed.data.attempt.status).toBe("completed");
		expect(resumed.data.personId).toBe(person.data.id);
		expect(resumed.data.workerId).toBe(worker.data.id);
		expect(resumed.data.assignmentId).not.toBeNull();
		expect(resumed.data.onboardingCaseId).not.toBeNull();
	});
});
