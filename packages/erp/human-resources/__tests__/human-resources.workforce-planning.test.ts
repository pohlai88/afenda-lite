/**
 * Workforce planning domain invariants (HR-WFP-01).
 */

import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} from "../src/permissions";
import {
	createApplication,
	moveApplicationToInReview,
} from "../src/recruitment/application";
import { createCandidate } from "../src/recruitment/candidate";
import { acceptOffer, createOffer, issueOffer } from "../src/recruitment/offer";
import {
	approveRequisition,
	cancelRequisition,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../src/recruitment/requisition";
import {
	approveHeadcountPlan,
	createHeadcountPlan,
	submitHeadcountPlan,
	updateHeadcountPlan,
} from "../src/workforce-planning/headcount-plan";
import {
	addHeadcountPlanLine,
	updateHeadcountPlanLine,
} from "../src/workforce-planning/headcount-plan-line";
import {
	getHeadcountAvailability,
	getRecruitmentHeadcountHandoff,
	listHeadcountReservations,
	reserveHeadcount,
} from "../src/workforce-planning/headcount-reservation";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";
import { createWorkforceHarness } from "./helpers/workforce-harness";

const ORG = "org-wfp-test";
const ORG_B = "org-wfp-test-b";
const ACTOR = "user-wfp-actor";

function suffix(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createDraftPlanWithLine(
	ready: ReturnType<typeof createWorkforceHarness>,
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
			code: `WFP-${input.tag}`.slice(0, 32),
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

async function approvePlanPipeline(
	ready: ReturnType<typeof createWorkforceHarness>,
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

	let plan = draft.data.plan;
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

async function openRequisitionPipeline(
	ready: ReturnType<typeof createWorkforceHarness>,
	input: { organizationId: string; actorUserId: string; tag: string },
) {
	const draft = await createDraftRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-req-${input.tag}`,
			idempotencyKey: `idem-req-${input.tag}`,
			code: `REQ-${input.tag}`.slice(0, 32),
			title: "Hire",
		},
		ready,
	);
	if (!draft.ok) {
		return draft;
	}
	let requisition = draft.data;
	for (const [cmd, corr] of [
		[submitRequisition, `corr-req-submit-${input.tag}`],
		[approveRequisition, `corr-req-approve-${input.tag}`],
		[openRequisition, `corr-req-open-${input.tag}`],
	] as const) {
		const next = await cmd(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: corr,
				requisitionId: requisition.id,
				expectedVersion: requisition.version,
			},
			ready,
		);
		if (!next.ok) {
			return next;
		}
		requisition = next.data;
	}
	return { ok: true as const, data: requisition };
}

describe("@afenda/human-resources workforce planning (HR-WFP-01)", () => {
	it("creates a draft headcount plan with a line", async () => {
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const created = await createDraftPlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.data.plan.status).toBe("draft");
		expect(created.data.line.plannedFte).toBe("2.0000");
	});

	it("rejects invalid plan period", async () => {
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const plan = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-bad-period-${tag}`,
				idempotencyKey: `idem-bad-period-${tag}`,
				code: `BAD-${tag}`.slice(0, 32),
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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const first = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `dup-a-${tag}`,
		});
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `dup-b-${tag}`,
		});
		expect(second.ok).toBe(false);
	});

	it("rejects negative planned FTE", async () => {
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const plan = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-neg-${tag}`,
				idempotencyKey: `idem-neg-${tag}`,
				code: `NEG-${tag}`.slice(0, 32),
				title: "Negative",
				planningScopeKey: `scope-${tag}`,
				periodStart: "2027-01-01",
				periodEnd: "2027-12-31",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
			plannedFte: "1.0000",
			plannedHeadcount: 1,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

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
		if (!first.ok) return;

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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

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
		if (!reserved.ok) return;

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

	it("consumes reservation on offer acceptance", async () => {
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

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
		if (!reserved.ok) return;

		const candidate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cand-${tag}`,
				idempotencyKey: `idem-cand-${tag}`,
				displayName: "Candidate",
				email: `cand-${tag}@example.com`,
			},
			ready,
		);
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) return;

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
		if (!application.ok) return;

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
		if (!inReview.ok) return;

		const offerDraft = await createOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-offer-${tag}`,
				applicationId: inReview.data.id,
				termsSummary: "Standard offer terms",
				expiresOn: "2026-12-31",
			},
			ready,
		);
		expect(offerDraft.ok).toBe(true);
		if (!offerDraft.ok) return;

		const issued = await issueOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-issue-${tag}`,
				offerId: offerDraft.data.id,
				expectedVersion: offerDraft.data.version,
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;

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
			expect(listed.data.reservations[0]?.status).toBe("consumed");
		}
	});

	it("rejects stale approval version", async () => {
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const draft = await createDraftPlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG_B,
			actorUserId: ACTOR,
			tag: `b-${tag}`,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();

		const draft = await createDraftPlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

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
		if (!submitted.ok) return;

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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

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
		const store = createWorkforceHarness("memory").store;
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
				code: `RB-${tag}`.slice(0, 32),
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
				code: `RB-${tag}`.slice(0, 32),
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
		const ready = createWorkforceHarness("memory");
		const tag = suffix();
		const approved = await approvePlanPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await openRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag,
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

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
