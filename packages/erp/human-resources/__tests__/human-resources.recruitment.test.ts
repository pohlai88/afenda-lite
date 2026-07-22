import {
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import { createPosition } from "../src/organization/position";
import {
	HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_INTERVIEW_RECORD,
	HUMAN_RESOURCES_PERMISSION_OFFER_APPROVE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_REQUISITION_CREATE,
} from "../src/permissions";
import {
	createApplication,
	moveApplicationToInReview,
} from "../src/recruitment/application";
import { createCandidate } from "../src/recruitment/candidate";
import {
	getInterviewEvaluation,
	listInterviews,
	recordInterviewEvaluation,
	scheduleInterview,
} from "../src/recruitment/interview";
import {
	acceptOffer,
	amendOfferDraft,
	createOffer,
	expireOffer,
	issueOffer,
	withdrawOffer,
} from "../src/recruitment/offer";
import {
	amendRequisition,
	approveRequisition,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../src/recruitment/requisition";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG_A = "org-recruit-a";
const ORG_B = "org-recruit-b";
const ACTOR = "user-recruit-1";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return { store, ports, authorization };
}

async function seedOpenRequisition(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; code: string },
) {
	const orgSeed = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: ACTOR,
		correlationId: `corr-org-${input.code}`,
	});
	if (orgSeed === null) {
		throw new Error("Failed to seed department/job");
	}

	const position = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-pos-${input.code}`,
			code: `P-${input.code}`,
			title: `Position ${input.code}`,
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!position.ok) {
		return position;
	}

	const draft = await createDraftRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-req-${input.code}`,
			idempotencyKey: `idem-req-${input.code}`,
			code: input.code,
			title: `Req ${input.code}`,
			jobId: orgSeed.jobId,
			positionId: position.data.id,
			departmentId: orgSeed.departmentId,
		},
		ready,
	);
	if (!draft.ok) {
		return draft;
	}

	const submitted = await submitRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-sub-${input.code}`,
			requisitionId: draft.data.id,
			expectedVersion: draft.data.version,
		},
		ready,
	);
	if (!submitted.ok) {
		return submitted;
	}

	const approved = await approveRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-apr-${input.code}`,
			requisitionId: submitted.data.id,
			expectedVersion: submitted.data.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return openRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-open-${input.code}`,
			requisitionId: approved.data.id,
			expectedVersion: approved.data.version,
		},
		ready,
	);
}

async function seedCandidate(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; email: string },
) {
	return createCandidate(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-cand-${input.email}`,
			idempotencyKey: `idem-cand-${input.email}`,
			displayName: "Candidate One",
			email: input.email,
		},
		ready,
	);
}

async function seedOfferReadyApplication(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; code: string; email: string },
) {
	const requisition = await seedOpenRequisition(ready, {
		organizationId: input.organizationId,
		code: input.code,
	});
	if (!requisition.ok) {
		return { ok: false as const, error: requisition };
	}
	const candidate = await seedCandidate(ready, {
		organizationId: input.organizationId,
		email: input.email,
	});
	if (!candidate.ok) {
		return { ok: false as const, error: candidate };
	}
	const application = await createApplication(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-app-${input.code}`,
			candidateId: candidate.data.id,
			requisitionId: requisition.data.id,
		},
		ready,
	);
	if (!application.ok) {
		return { ok: false as const, error: application };
	}
	const inReview = await moveApplicationToInReview(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-review-${input.code}`,
			applicationId: application.data.id,
			expectedVersion: application.data.version,
		},
		ready,
	);
	if (!inReview.ok) {
		return { ok: false as const, error: inReview };
	}
	return {
		ok: true as const,
		requisition: requisition.data,
		candidate: candidate.data,
		application: inReview.data,
	};
}

describe("@afenda/human-resources recruitment", () => {
	it("runs requisition → offer accept happy path with handoff and events", async () => {
		const ready = harness();
		const seeded = await seedOfferReadyApplication(ready, {
			organizationId: ORG_A,
			code: "REQ-HAPPY",
			email: "happy@example.com",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const interview = await scheduleInterview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-int",
				applicationId: seeded.application.id,
				scheduledAt: "2030-01-15T10:00:00.000Z",
				interviewerActorId: ACTOR,
			},
			ready,
		);
		expect(interview.ok).toBe(true);
		if (!interview.ok) return;

		const evaluation = await recordInterviewEvaluation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-eval",
				interviewId: interview.data.id,
				result: "advance",
				privateNotes: "strong communicator",
				expectedVersion: interview.data.version,
			},
			ready,
		);
		expect(evaluation.ok).toBe(true);

		const listed = await listInterviews(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-int",
				applicationId: seeded.application.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.interviews).toHaveLength(1);
			expect(
				JSON.stringify(listed.data.interviews).includes("strong communicator"),
			).toBe(false);
		}

		const offer = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-offer",
				applicationId: seeded.application.id,
				termsSummary: "Full-time offer",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(offer.ok).toBe(true);
		if (!offer.ok) return;

		const issued = await issueOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-issue",
				offerId: offer.data.id,
				expectedVersion: offer.data.version,
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;

		const accepted = await acceptOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-accept",
				offerId: issued.data.id,
				idempotencyKey: "idem-accept-happy",
				expectedVersion: issued.data.version,
				asOfDate: "2030-06-01",
			},
			ready,
		);
		expect(accepted.ok).toBe(true);
		if (!accepted.ok) return;

		expect(accepted.data.candidateId).toBe(seeded.candidate.id);
		expect(accepted.data.requisitionId).toBe(seeded.requisition.id);
		expect(accepted.data.offer.status).toBe("accepted");
		expect(
			ready.ports.outbox.calls.some(
				(c) => c.type === HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
			),
		).toBe(true);
		expect(
			ready.ports.outbox.calls.some(
				(c) => c.type === HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
			),
		).toBe(true);

		const replay = await acceptOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-accept-replay",
				offerId: issued.data.id,
				idempotencyKey: "idem-accept-happy",
				expectedVersion: accepted.data.offer.version,
				asOfDate: "2030-06-01",
			},
			ready,
		);
		expect(replay.ok).toBe(true);
		if (replay.ok) {
			expect(replay.data.offerId).toBe(accepted.data.offerId);
		}
		expect(
			ready.ports.outbox.calls.filter(
				(c) => c.type === HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
			),
		).toHaveLength(1);
	});

	it("rejects invalid requisition transition", async () => {
		const ready = harness();
		const draft = await createDraftRequisition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-bad-trans",
				idempotencyKey: "idem-bad-trans",
				code: "REQ-BAD",
				title: "Bad",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const opened = await openRequisition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-open-bad",
				requisitionId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			ready,
		);
		expect(opened.ok).toBe(false);
		if (!opened.ok) {
			expect(humanResourcesCodeFromResult(opened)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("prevents duplicate active application", async () => {
		const ready = harness();
		const requisition = await seedOpenRequisition(ready, {
			organizationId: ORG_A,
			code: "REQ-DUP",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;
		const candidate = await seedCandidate(ready, {
			organizationId: ORG_A,
			email: "dup@example.com",
		});
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) return;

		const first = await createApplication(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-1",
				candidateId: candidate.data.id,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await createApplication(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-2",
				candidateId: candidate.data.id,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects offer on ineligible application and second active offer", async () => {
		const ready = harness();
		const requisition = await seedOpenRequisition(ready, {
			organizationId: ORG_A,
			code: "REQ-OFFER",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;
		const candidate = await seedCandidate(ready, {
			organizationId: ORG_A,
			email: "offer@example.com",
		});
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) return;

		const application = await createApplication(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-app",
				candidateId: candidate.data.id,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(application.ok).toBe(true);
		if (!application.ok) return;

		const tooEarly = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-early",
				applicationId: application.data.id,
				termsSummary: "Too early",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(tooEarly.ok).toBe(false);
		if (!tooEarly.ok) {
			expect(humanResourcesCodeFromResult(tooEarly)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const inReview = await moveApplicationToInReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-review",
				applicationId: application.data.id,
				expectedVersion: application.data.version,
			},
			ready,
		);
		expect(inReview.ok).toBe(true);
		if (!inReview.ok) return;

		const firstOffer = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-1",
				applicationId: inReview.data.id,
				termsSummary: "First",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(firstOffer.ok).toBe(true);

		const secondOffer = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-2",
				applicationId: inReview.data.id,
				termsSummary: "Second",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(secondOffer.ok).toBe(false);
		if (!secondOffer.ok) {
			expect(humanResourcesCodeFromResult(secondOffer)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects accept of expired or withdrawn offers", async () => {
		const ready = harness();
		const seeded = await seedOfferReadyApplication(ready, {
			organizationId: ORG_A,
			code: "REQ-TERM",
			email: "term@example.com",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const offer = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-offer",
				applicationId: seeded.application.id,
				termsSummary: "Expiring",
				expiresOn: "2020-01-01",
			},
			ready,
		);
		expect(offer.ok).toBe(true);
		if (!offer.ok) return;
		const issued = await issueOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-issue",
				offerId: offer.data.id,
				expectedVersion: offer.data.version,
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;

		const expiredAccept = await acceptOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-accept",
				offerId: issued.data.id,
				idempotencyKey: "idem-expired",
				expectedVersion: issued.data.version,
				asOfDate: "2030-01-01",
			},
			ready,
		);
		expect(expiredAccept.ok).toBe(false);
		if (!expiredAccept.ok) {
			expect(humanResourcesCodeFromResult(expiredAccept)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const expired = await expireOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-expire",
				offerId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);

		const seeded2 = await seedOfferReadyApplication(ready, {
			organizationId: ORG_A,
			code: "REQ-WD",
			email: "withdraw@example.com",
		});
		expect(seeded2.ok).toBe(true);
		if (!seeded2.ok) return;
		const offer2 = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-wd-offer",
				applicationId: seeded2.application.id,
				termsSummary: "Withdraw me",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(offer2.ok).toBe(true);
		if (!offer2.ok) return;
		const issued2 = await issueOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-wd-issue",
				offerId: offer2.data.id,
				expectedVersion: offer2.data.version,
			},
			ready,
		);
		expect(issued2.ok).toBe(true);
		if (!issued2.ok) return;
		const withdrawn = await withdrawOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-wd",
				offerId: issued2.data.id,
				expectedVersion: issued2.data.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) return;

		const acceptWithdrawn = await acceptOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-wd-accept",
				offerId: issued2.data.id,
				idempotencyKey: "idem-wd",
				expectedVersion: withdrawn.data.version,
				asOfDate: "2030-06-01",
			},
			ready,
		);
		expect(acceptWithdrawn.ok).toBe(false);
		if (!acceptWithdrawn.ok) {
			expect(humanResourcesCodeFromResult(acceptWithdrawn)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("rejects cross-org application linkage", async () => {
		const ready = harness();
		const requisition = await seedOpenRequisition(ready, {
			organizationId: ORG_A,
			code: "REQ-XORG",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;
		const candidateB = await seedCandidate(ready, {
			organizationId: ORG_B,
			email: "xorg@example.com",
		});
		expect(candidateB.ok).toBe(true);
		if (!candidateB.ok) return;

		const linked = await createApplication(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-xorg",
				candidateId: candidateB.data.id,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(linked.ok).toBe(false);
		if (!linked.ok) {
			const code = humanResourcesCodeFromResult(linked);
			expect(
				code === HUMAN_RESOURCES_ERROR_NOT_FOUND ||
					code === HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			).toBe(true);
		}
	});

	it("forbids confidential evaluation reads without interview.record", async () => {
		const writer = harness([
			HUMAN_RESOURCES_PERMISSION_REQUISITION_CREATE,
			HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE,
			HUMAN_RESOURCES_PERMISSION_INTERVIEW_RECORD,
			HUMAN_RESOURCES_PERMISSION_OFFER_APPROVE,
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
		]);
		const seeded = await seedOfferReadyApplication(writer, {
			organizationId: ORG_A,
			code: "REQ-PRIV",
			email: "priv@example.com",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const interview = await scheduleInterview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-priv-int",
				applicationId: seeded.application.id,
				scheduledAt: "2030-02-01T09:00:00.000Z",
				interviewerActorId: ACTOR,
			},
			writer,
		);
		expect(interview.ok).toBe(true);
		if (!interview.ok) return;
		const evaluation = await recordInterviewEvaluation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-priv-eval",
				interviewId: interview.data.id,
				result: "hold",
				privateNotes: "confidential notes",
				expectedVersion: interview.data.version,
			},
			writer,
		);
		expect(evaluation.ok).toBe(true);

		const denied = {
			store: writer.store,
			ports: writer.ports,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			]),
		};
		const read = await getInterviewEvaluation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-priv-read",
				interviewId: interview.data.id,
			},
			denied,
		);
		expect(read.ok).toBe(false);
		if (!read.ok) {
			expect(humanResourcesCodeFromResult(read)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("rejects stale version on requisition amend", async () => {
		const ready = harness();
		const draft = await createDraftRequisition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale",
				idempotencyKey: "idem-stale",
				code: "REQ-STALE",
				title: "Stale",
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const stale = await amendRequisition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-2",
				requisitionId: draft.data.id,
				title: "Updated",
				expectedVersion: 99,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(humanResourcesCodeFromResult(stale)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
	});

	it("rolls back offer accept when outbox fails and retries succeed", async () => {
		const ready = harness();
		const seeded = await seedOfferReadyApplication(ready, {
			organizationId: ORG_A,
			code: "REQ-TX2",
			email: "tx@example.com",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const offer = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tx-offer",
				applicationId: seeded.application.id,
				termsSummary: "TX",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(offer.ok).toBe(true);
		if (!offer.ok) return;
		const issued = await issueOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tx-issue",
				offerId: offer.data.id,
				expectedVersion: offer.data.version,
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) return;

		const failReady = {
			store: ready.store,
			ports: createMemoryMutationPorts({ outboxFailAfter: 0 }),
			authorization: ready.authorization,
		};
		const failed = await acceptOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tx-fail",
				offerId: issued.data.id,
				idempotencyKey: "idem-tx-accept",
				expectedVersion: issued.data.version,
				asOfDate: "2030-06-01",
			},
			failReady,
		);
		expect(failed.ok).toBe(false);

		const workingPorts = createMemoryMutationPorts();
		const retry = await acceptOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-tx-retry",
				offerId: issued.data.id,
				idempotencyKey: "idem-tx-accept",
				expectedVersion: issued.data.version,
				asOfDate: "2030-06-01",
			},
			{
				store: ready.store,
				ports: workingPorts,
				authorization: ready.authorization,
			},
		);
		expect(retry.ok).toBe(true);
		if (retry.ok) {
			expect(retry.data.offer.status).toBe("accepted");
		}
		expect(
			workingPorts.outbox.calls.some(
				(c) => c.type === HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
			),
		).toBe(true);
	});

	it("allows amend of draft offer before issuance", async () => {
		const ready = harness();
		const seeded = await seedOfferReadyApplication(ready, {
			organizationId: ORG_A,
			code: "REQ-AMEND",
			email: "amend@example.com",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;
		const offer = await createOffer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-am-offer",
				applicationId: seeded.application.id,
				termsSummary: "Draft terms",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(offer.ok).toBe(true);
		if (!offer.ok) return;
		const amended = await amendOfferDraft(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-am",
				offerId: offer.data.id,
				termsSummary: "Amended terms",
				expectedVersion: offer.data.version,
			},
			ready,
		);
		expect(amended.ok).toBe(true);
		if (amended.ok) {
			expect(amended.data.termsSummary).toBe("Amended terms");
		}
	});

	it("rejects second evaluation on the same interview", async () => {
		const ready = harness();
		const seeded = await seedOfferReadyApplication(ready, {
			organizationId: ORG_A,
			code: "REQ-EVAL-DUP",
			email: "eval-dup@example.com",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const interview = await scheduleInterview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-eval-dup-int",
				applicationId: seeded.application.id,
				scheduledAt: "2030-03-01T10:00:00.000Z",
				interviewerActorId: ACTOR,
			},
			ready,
		);
		expect(interview.ok).toBe(true);
		if (!interview.ok) return;

		const first = await recordInterviewEvaluation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-eval-dup-1",
				interviewId: interview.data.id,
				result: "advance",
				expectedVersion: interview.data.version,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await recordInterviewEvaluation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-eval-dup-2",
				interviewId: interview.data.id,
				result: "reject",
				expectedVersion: interview.data.version + 1,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});
});
