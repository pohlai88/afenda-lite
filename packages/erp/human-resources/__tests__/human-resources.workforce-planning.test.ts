/**
 * Workforce planning domain invariants (HR-WFP-01).
 */

import { describe, expect, it } from "vitest";
import { createPosition } from "../src/features/organization/position";
import {
	createApplication,
	moveApplicationToInReview,
} from "../src/features/recruitment/application";
import { createCandidate } from "../src/features/recruitment/candidate";
import {
	acceptOffer,
	declineOffer,
	expireOffer,
	withdrawOffer,
} from "../src/features/recruitment/offer";
import {
	cancelRequisition,
	closeRequisition,
	createDraftRequisition,
	placeRequisitionOnHold,
	submitRequisition,
} from "../src/features/recruitment/requisition";
import {
	approveHeadcountPlan,
	createHeadcountPlan,
	getWorkforcePlanVariance,
	submitHeadcountPlan,
	updateHeadcountPlan,
} from "../src/features/workforce-planning/headcount-plan";
import {
	addHeadcountPlanLine,
	updateHeadcountPlanLine,
} from "../src/features/workforce-planning/headcount-plan-line";
import {
	consumeHeadcountReservation,
	getHeadcountAvailability,
	getRecruitmentHeadcountHandoff,
	listHeadcountReservations,
	releaseHeadcountReservation,
	reserveHeadcount,
} from "../src/features/workforce-planning/headcount-reservation";
import { createAssignment } from "../src/features/workforce-records/employment/assignment";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import { createEmployment } from "../src/features/workforce-records/employment/employment";
import {
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} from "../src/kernel/authorization/permissions";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../src/kernel/execution/error-codes";
import { candidateConsentFixture } from "./helpers/candidate-consent-fixture";
import { createHrParityHarness } from "./helpers/hr-parity-harness";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createAndIssueOffer } from "./helpers/offer-lifecycle-fixture";
import {
	seedDefaultHiringManager,
	seedRequisitionPipeline,
} from "./helpers/recruitment-requisition-fixture";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG = "org-wfp-test";
const ORG_B = "org-wfp-test-b";
const ACTOR = "user-wfp-actor";

function suffix(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createDraftPlanWithLine(
	ready: ReturnType<typeof createHrParityHarness>,
	input: {
		organizationId: string;
		actorUserId: string;
		tag: string;
		plannedFte?: string;
		plannedHeadcount?: number;
	},
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
	if (!plan.ok) {
		return plan;
	}

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
			plannedFte: input.plannedFte ?? "2.0000",
			plannedHeadcount: input.plannedHeadcount ?? 2,
		},
		ready,
	);
	if (!line.ok) {
		return line;
	}

	return { ok: true as const, data: { plan: plan.data, line: line.data } };
}

async function seedReservedIssuedOffer(
	ready: ReturnType<typeof createHrParityHarness>,
	tag: string,
) {
	const approved = await approvePlanPipeline(ready, {
		organizationId: ORG,
		actorUserId: ACTOR,
		tag,
	});
	if (!approved.ok) {
		return approved;
	}

	const requisition = await seedRequisitionPipeline(ready, {
		organizationId: ORG,
		actorUserId: ACTOR,
		tag,
		targetStatus: "open",
	});
	if (!requisition.ok) {
		return requisition;
	}

	const reserved = await reserveHeadcount(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-s65-res-${tag}`,
			idempotencyKey: `idem-s65-res-${tag}`,
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
			correlationId: `corr-s65-cand-${tag}`,
			idempotencyKey: `idem-s65-cand-${tag}`,
			displayName: "Candidate",
			email: `s65-${tag}@example.com`,
			...candidateConsentFixture(),
		},
		ready,
	);
	if (!candidate.ok) {
		return candidate;
	}

	const application = await createApplication(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-s65-app-${tag}`,
			candidateId: candidate.data.id,
			requisitionId: requisition.data.id,
		},
		ready,
	);
	if (!application.ok) {
		return application;
	}

	const inReview = await moveApplicationToInReview(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-s65-review-${tag}`,
			applicationId: application.data.id,
			expectedVersion: application.data.version,
		},
		ready,
	);
	if (!inReview.ok) {
		return inReview;
	}

	const issued = await createAndIssueOffer(ready, {
		organizationId: ORG,
		actorUserId: ACTOR,
		applicationId: inReview.data.id,
		termsSummary: "Slice 6.5 reservation gate",
		expiresOn: "2030-12-31",
		correlationPrefix: `corr-s65-offer-${tag}`,
	});
	if (!issued.ok) {
		return issued;
	}

	return {
		ok: true as const,
		data: { reserved: reserved.data, issued: issued.data },
	};
}

async function approvePlanPipeline(
	ready: ReturnType<typeof createHrParityHarness>,
	input: {
		organizationId: string;
		actorUserId: string;
		tag: string;
		plannedFte?: string;
		plannedHeadcount?: number;
	},
) {
	const draft = await createDraftPlanWithLine(ready, input);
	if (!draft.ok) {
		return draft;
	}

	let { plan } = draft.data;
	const submitted = await submitHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-submit-${input.tag}`,
			planId: plan.id,
			expectedVersion: plan.version,
		},
		ready,
	);
	if (!submitted.ok) {
		return submitted;
	}
	plan = submitted.data;

	const approved = await approveHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-approve-${input.tag}`,
			planId: plan.id,
			expectedVersion: plan.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return {
		ok: true as const,
		data: { plan: approved.data, line: draft.data.line },
	};
}

describe("@afenda/human-resources workforce planning (HR-WFP-01)", () => {
	it("creates a draft headcount plan with a line", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const created = await createDraftPlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.plan.status).toBe("draft");
		expect(created.data.line.plannedFte).toBe("2.0000");
	});

	it("rejects invalid plan period", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const plan = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-bad-period-${tag}`,
				idempotencyKey: `idem-bad-period-${tag}`,
				code: `BAD-${tag}`.slice(0, 64),
				title: "Bad period",
				planningScopeKey: "org",
				periodStart: "2026-12-31",
				periodEnd: "2026-01-01",
			},
			ready,
		);
		expect(plan.ok).toBe(false);
	});

	it("rejects duplicate approved scope", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const first = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `dup-a-${tag}`,
		});
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const second = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `dup-b-${tag}`,
		});
		expect(second.ok).toBe(false);
	});

	it("rejects negative planned FTE", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const plan = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-neg-${tag}`,
				idempotencyKey: `idem-neg-${tag}`,
				code: `NEG-${tag}`.slice(0, 64),
				title: "Negative",
				planningScopeKey: `scope-${tag}`,
				periodStart: "2027-01-01",
				periodEnd: "2027-12-31",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) {
			return;
		}

		const line = await addHeadcountPlanLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-neg-line-${tag}`,
				planId: plan.data.id,
				plannedFte: "-1.0000",
				plannedHeadcount: 0,
			},
			ready,
		);
		expect(line.ok).toBe(false);
	});

	it("rejects over-reservation against approved capacity", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			plannedFte: "1.0000",
			plannedHeadcount: 1,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-over-${tag}`,
				idempotencyKey: `idem-over-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "2.0000",
				reservedHeadcount: 2,
			},
			ready,
		);
		expect(reserved.ok).toBe(false);
		if (!reserved.ok) {
			expect(humanResourcesCodeFromResult(reserved)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}
	});

	it("retries reservation idempotently and conflicts on payload mismatch", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const base = {
			organizationId: ORG,
			actorUserId: ACTOR,
			idempotencyKey: `idem-res-${tag}`,
			planLineId: approved.data.line.id,
			requisitionId: requisition.data.id,
			reservedFte: "1.0000",
			reservedHeadcount: 1,
		};

		const first = await reserveHeadcount(
			{ ...base, correlationId: `corr-res-1-${tag}` },
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const replay = await reserveHeadcount(
			{ ...base, correlationId: `corr-res-2-${tag}` },
			ready,
		);
		expect(replay.ok).toBe(true);
		if (replay.ok) {
			expect(replay.data.id).toBe(first.data.id);
		}

		const conflict = await reserveHeadcount(
			{
				...base,
				correlationId: `corr-res-conflict-${tag}`,
				reservedHeadcount: 2,
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(humanResourcesCodeFromResult(conflict)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("releases reservation when requisition is cancelled", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-release-${tag}`,
				idempotencyKey: `idem-res-release-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const cancelled = await cancelRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cancel-${tag}`,
				requisitionId: requisition.data.id,
				expectedVersion: requisition.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-${tag}`,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("released");
		}

		const availability = await getHeadcountAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-avail-${tag}`,
				planLineId: approved.data.line.id,
			},
			ready,
		);
		expect(availability.ok).toBe(true);
		if (availability.ok) {
			expect(availability.data.lines[0]?.availableHeadcount).toBe(2);
		}
	});

	it("computes workforce variance from active employment assignments", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			plannedFte: "2.0000",
			plannedHeadcount: 2,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-actual-employee-${tag}`,
				idempotencyKey: `idem-actual-employee-${tag}`,
				employeeNumber: `WFP-ACT-${tag}`.slice(0, 64),
				legalName: "Actual Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			return;
		}

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-actual-employment-${tag}`,
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) {
			return;
		}

		const position = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-actual-position-${tag}`,
				code: `POS-${tag}`.slice(0, 64),
				title: "Actual Position",
				departmentId: approved.data.line.departmentId,
				jobId: approved.data.line.jobId,
				status: "active",
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) {
			return;
		}

		const assignment = await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-actual-assignment-${tag}`,
				employmentId: employment.data.id,
				positionId: position.data.id,
				legalEntityKey: "legal-a",
				businessUnitKey: "business-a",
				locationKey: "hq",
				costCentreKey: "cost-a",
				projectKey: "project-a",
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const variance = await getWorkforcePlanVariance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-variance-actual-${tag}`,
				planId: approved.data.plan.id,
				asOf: "2026-07-01",
			},
			ready,
		);
		expect(variance.ok).toBe(true);
		if (!variance.ok) {
			return;
		}
		expect(variance.data.asOf).toBe("2026-07-01");
		expect(variance.data.lines[0]?.actualHeadcount).toBe(1);
		expect(variance.data.lines[0]?.actualFte).toBe("1.0000");
		expect(variance.data.lines[0]?.varianceHeadcount).toBe(1);
		expect(variance.data.lines[0]?.varianceFte).toBe("1.0000");
		expect(variance.data.lines[0]?.availableHeadcount).toBe(2);
	});

	it("consumes reservation on offer acceptance", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-consume-${tag}`,
				idempotencyKey: `idem-res-consume-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const candidate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cand-${tag}`,
				idempotencyKey: `idem-cand-${tag}`,
				displayName: "Candidate",
				email: `cand-${tag}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) {
			return;
		}

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
		expect(application.ok).toBe(true);
		if (!application.ok) {
			return;
		}

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
		expect(inReview.ok).toBe(true);
		if (!inReview.ok) {
			return;
		}

		const issued = await createAndIssueOffer(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			applicationId: inReview.data.id,
			termsSummary: "Standard offer terms",
			expiresOn: "2026-12-31",
			correlationPrefix: `corr-offer-${tag}`,
		});
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}

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
		expect(accepted.ok).toBe(true);
		if (!accepted.ok) {
			return;
		}

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-listed-${tag}`,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations).toHaveLength(1);
			expect(listed.data.reservations[0]?.id).toBe(reserved.data.id);
			expect(listed.data.reservations[0]?.status).toBe("consumed");
		}
	});

	it("Slice 6.5 — decline leaves reservation active", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedReservedIssuedOffer(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const declined = await declineOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-decline-${tag}`,
				offerId: seeded.data.issued.id,
				expectedVersion: seeded.data.issued.version,
			},
			ready,
		);
		expect(declined.ok).toBe(true);
		if (!declined.ok) {
			return;
		}

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-list-decline-${tag}`,
				requisitionId: seeded.data.reserved.requisitionId,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("active");
		}
	});

	it("Slice 6.5 — withdraw leaves reservation active", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedReservedIssuedOffer(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const withdrawn = await withdrawOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-withdraw-${tag}`,
				offerId: seeded.data.issued.id,
				expectedVersion: seeded.data.issued.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) {
			return;
		}

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-list-withdraw-${tag}`,
				requisitionId: seeded.data.reserved.requisitionId,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("active");
		}
	});

	it("Slice 6.5 — expire leaves reservation active", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const seeded = await seedReservedIssuedOffer(ready, tag);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const expired = await expireOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-expire-${tag}`,
				offerId: seeded.data.issued.id,
				expectedVersion: seeded.data.issued.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) {
			return;
		}

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s65-list-expire-${tag}`,
				requisitionId: seeded.data.reserved.requisitionId,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("active");
		}
	});

	it("rejects duplicate reservation consume", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-res-${tag}`,
				idempotencyKey: `idem-dup-res-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const first = await consumeHeadcountReservation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-consume-1-${tag}`,
				reservationId: reserved.data.id,
				expectedVersion: reserved.data.version,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.status).toBe("consumed");

		const duplicate = await consumeHeadcountReservation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-consume-2-${tag}`,
				reservationId: first.data.id,
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(duplicate.ok).toBe(false);
		if (!duplicate.ok) {
			expect(humanResourcesCodeFromResult(duplicate)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("rejects consume of released reservation", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rel-res-${tag}`,
				idempotencyKey: `idem-rel-res-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const released = await releaseHeadcountReservation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rel-${tag}`,
				reservationId: reserved.data.id,
				expectedVersion: reserved.data.version,
			},
			ready,
		);
		expect(released.ok).toBe(true);
		if (!released.ok) {
			return;
		}
		expect(released.data.status).toBe("released");

		const consumed = await consumeHeadcountReservation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rel-consume-${tag}`,
				reservationId: released.data.id,
				expectedVersion: released.data.version,
			},
			ready,
		);
		expect(consumed.ok).toBe(false);
		if (!consumed.ok) {
			expect(humanResourcesCodeFromResult(consumed)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("rejects cross-tenant reservation consume", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-xt-res-${tag}`,
				idempotencyKey: `idem-xt-res-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const crossTenant = await consumeHeadcountReservation(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: `corr-xt-consume-${tag}`,
				reservationId: reserved.data.id,
				expectedVersion: reserved.data.version,
			},
			ready,
		);
		expect(crossTenant.ok).toBe(false);
		if (!crossTenant.ok) {
			expect(humanResourcesCodeFromResult(crossTenant)).toBe(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	});

	it("rejects stale approval version", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const draft = await createDraftPlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const submitted = await submitHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-stale-submit-${tag}`,
				planId: draft.data.plan.id,
				expectedVersion: draft.data.plan.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const stale = await approveHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-stale-approve-${tag}`,
				planId: submitted.data.id,
				expectedVersion: draft.data.plan.version,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
	});

	it("rejects cross-org reservation references", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG_B,
			actorUserId: ACTOR,
			tag: `b-${tag}`,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cross-${tag}`,
				idempotencyKey: `idem-cross-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(false);
		if (!reserved.ok) {
			expect(humanResourcesCodeFromResult(reserved)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
	});

	it("rejects unauthorized approval", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();

		const draft = await createDraftPlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const submitted = await submitHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-unauth-submit-${tag}`,
				planId: draft.data.plan.id,
				expectedVersion: draft.data.plan.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const limitedAuth = createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
			HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
		]);
		const denied = await approveHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-unauth-approve-${tag}`,
				planId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			{ store: ready.store, ports: ready.ports, authorization: limitedAuth },
		);
		expect(denied.ok).toBe(false);
	});

	it("blocks edits to approved plan lines", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const headerEdit = await updateHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-immut-header-${tag}`,
				planId: approved.data.plan.id,
				title: "Changed",
				expectedVersion: approved.data.plan.version,
			},
			ready,
		);
		expect(headerEdit.ok).toBe(false);

		const lineEdit = await updateHeadcountPlanLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-immut-line-${tag}`,
				planLineId: approved.data.line.id,
				plannedHeadcount: 99,
				expectedVersion: approved.data.line.version,
			},
			ready,
		);
		expect(lineEdit.ok).toBe(false);
	});

	it("rolls back plan create when audit fails", async () => {
		const { store } = createHrParityHarness("memory");
		const portsFail = createMemoryMutationPorts({ auditFailAfter: 0 });
		const portsOk = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
			HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
		]);
		const tag = suffix();

		const failed = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rb-${tag}`,
				idempotencyKey: `idem-rb-${tag}`,
				code: `RB-${tag}`.slice(0, 64),
				title: "Rollback",
				planningScopeKey: `rb-${tag}`,
				periodStart: "2028-01-01",
				periodEnd: "2028-12-31",
			},
			{ store, ports: portsFail, authorization },
		);
		expect(failed.ok).toBe(false);

		const replay = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rb-2-${tag}`,
				idempotencyKey: `idem-rb-${tag}`,
				code: `RB-${tag}`.slice(0, 64),
				title: "Rollback",
				planningScopeKey: `rb-${tag}`,
				periodStart: "2028-01-01",
				periodEnd: "2028-12-31",
			},
			{ store, ports: portsOk, authorization },
		);
		expect(replay.ok).toBe(true);
	});

	it("exposes recruitment headcount handoff read model", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-handoff-${tag}`,
				idempotencyKey: `idem-handoff-${tag}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);

		const handoff = await getRecruitmentHeadcountHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-handoff-get-${tag}`,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(handoff.ok).toBe(true);
		if (handoff.ok) {
			expect(handoff.data.activeReservation?.status).toBe("active");
			expect(handoff.data.approvedPlan?.status).toBe("approved");
		}
	});
});

describe("@afenda/human-resources headcount reservation status gate (Slice 6.1)", () => {
	it("allows reserve on approved and open requisitions only", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approvedPlan = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approvedPlan.ok).toBe(true);
		if (!approvedPlan.ok) {
			return;
		}

		const approvedReq = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `appr-${tag}`,
			targetStatus: "approved",
			title: "Hire approved",
			code: `REQ-APPR-${tag}`,
		});
		expect(approvedReq.ok).toBe(true);
		if (!approvedReq.ok) {
			return;
		}

		const onApproved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-appr-${tag}`,
				idempotencyKey: `idem-res-appr-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: approvedReq.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(onApproved.ok).toBe(true);

		const openReq = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `open-${tag}`,
			targetStatus: "open",
		});
		expect(openReq.ok).toBe(true);
		if (!openReq.ok) {
			return;
		}

		const onOpen = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-open-${tag}`,
				idempotencyKey: `idem-res-open-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: openReq.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(onOpen.ok).toBe(true);
	});

	it("rejects reserve on draft, submitted, and on_hold requisitions", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approvedPlan = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approvedPlan.ok).toBe(true);
		if (!approvedPlan.ok) {
			return;
		}

		const manager = await seedDefaultHiringManager(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `gate-${tag}`,
		});
		expect(manager.ok).toBe(true);
		if (!manager.ok) {
			return;
		}

		const draft = await createDraftRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-draft-gate-${tag}`,
				idempotencyKey: `idem-draft-gate-${tag}`,
				code: `REQ-DRAFT-${tag}`.slice(0, 64),
				title: "Draft gate",
				hiringManagerEmployeeId: manager.employeeId,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		const draftReserve = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-draft-${tag}`,
				idempotencyKey: `idem-res-draft-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: draft.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(draftReserve.ok).toBe(false);
		if (!draftReserve.ok) {
			expect(humanResourcesCodeFromResult(draftReserve)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const submitted = await submitRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-submit-gate-${tag}`,
				requisitionId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const submittedReserve = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-submitted-${tag}`,
				idempotencyKey: `idem-res-submitted-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: submitted.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(submittedReserve.ok).toBe(false);
		if (!submittedReserve.ok) {
			expect(humanResourcesCodeFromResult(submittedReserve)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const openReq = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `hold-${tag}`,
			targetStatus: "open",
		});
		expect(openReq.ok).toBe(true);
		if (!openReq.ok) {
			return;
		}

		const onHold = await placeRequisitionOnHold(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-hold-gate-${tag}`,
				requisitionId: openReq.data.id,
				expectedVersion: openReq.data.version,
			},
			ready,
		);
		expect(onHold.ok).toBe(true);
		if (!onHold.ok) {
			return;
		}

		const holdReserve = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-hold-${tag}`,
				idempotencyKey: `idem-res-hold-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: onHold.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(holdReserve.ok).toBe(false);
		if (!holdReserve.ok) {
			expect(humanResourcesCodeFromResult(holdReserve)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("releases reservation when requisition is closed", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approvedPlan = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approvedPlan.ok).toBe(true);
		if (!approvedPlan.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-close-${tag}`,
				idempotencyKey: `idem-res-close-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}

		const closed = await closeRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-close-${tag}`,
				requisitionId: requisition.data.id,
				expectedVersion: requisition.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-close-${tag}`,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("released");
		}
	});

	it("rejects duplicate active reservation for the same requisition", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approvedPlan = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approvedPlan.ok).toBe(true);
		if (!approvedPlan.ok) {
			return;
		}

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		const first = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-1-${tag}`,
				idempotencyKey: `idem-dup-1-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const duplicate = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-2-${tag}`,
				idempotencyKey: `idem-dup-2-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(duplicate.ok).toBe(false);
		if (!duplicate.ok) {
			expect(humanResourcesCodeFromResult(duplicate)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("denies cross-org headcount reserve against foreign requisition", async () => {
		const ready = createHrParityHarness("memory");
		const tag = suffix();
		const approvedPlan = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approvedPlan.ok).toBe(true);
		if (!approvedPlan.ok) {
			return;
		}

		const requisitionB = await seedRequisitionPipeline(ready, {
			organizationId: ORG_B,
			actorUserId: ACTOR,
			tag,
			targetStatus: "open",
		});
		expect(requisitionB.ok).toBe(true);
		if (!requisitionB.ok) {
			return;
		}

		const denied = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cross-res-${tag}`,
				idempotencyKey: `idem-cross-res-${tag}`,
				planLineId: approvedPlan.data.line.id,
				requisitionId: requisitionB.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			const code = humanResourcesCodeFromResult(denied);
			expect(
				code === HUMAN_RESOURCES_ERROR_NOT_FOUND ||
					code === HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			).toBe(true);
		}
	});
});
