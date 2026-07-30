import { ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";

import {
	decideHumanResourcesSubjectDeletion,
	executeHumanResourcesDeletionDecision,
	type HumanResourcesDeletionDecisionInput,
	type HumanResourcesPrivacyDeletionPort,
} from "../src/privacy/deletion-decision";
import type { HumanResourcesPrivacyProcessorBoundary } from "../src/privacy/processor-boundary";

const boundary: HumanResourcesPrivacyProcessorBoundary = {
	organizationId: "org-privacy",
	boundaryVersion: "boundary-v3",
	controllerReference: "controller://org-privacy",
	primaryProcessor: {
		processorId: "platform-privacy",
		role: "processor",
		parentProcessorId: null,
		contractReference: "dpa://platform-v3",
		verifiedAt: "2026-07-01T00:00:00.000Z",
		status: "active",
		purpose: "platform privacy execution",
		classifications: [
			"workforce_core",
			"pay_and_benefits",
			"recruitment_and_background",
		],
		deletionCapability: "delete",
	},
	subprocessors: [
		{
			processorId: "vault-subprocessor",
			role: "subprocessor",
			parentProcessorId: "platform-privacy",
			contractReference: "dpa://vault-v2",
			verifiedAt: "2026-07-02T00:00:00.000Z",
			status: "active",
			purpose: "encrypted HR record storage",
			classifications: [
				"workforce_core",
				"pay_and_benefits",
				"recruitment_and_background",
			],
			deletionCapability: "delete",
		},
	],
};

const EXPIRED_RECRUITMENT_CLASSIFICATION = {
	classification: "recruitment_and_background",
	retentionEndsAt: "2026-07-01T00:00:00.000Z",
} as const;

function decisionInput(
	overrides: Partial<HumanResourcesDeletionDecisionInput> = {},
): HumanResourcesDeletionDecisionInput {
	return {
		organizationId: "org-privacy",
		actorUserId: "privacy-officer",
		correlationId: "privacy-correlation-1",
		subjectEmployeeId: "employee-sensitive-1",
		requestedAt: "2026-07-28T00:00:00.000Z",
		legalBasis: "data_subject_erasure_request",
		classifications: [
			EXPIRED_RECRUITMENT_CLASSIFICATION,
			{
				classification: "workforce_core",
				retentionEndsAt: "2026-07-01T00:00:00.000Z",
			},
			{
				classification: "pay_and_benefits",
				retentionEndsAt: "2026-07-01T00:00:00.000Z",
			},
		],
		activeLegalHolds: [],
		...overrides,
	};
}

function deletionPort(
	overrides: Partial<HumanResourcesPrivacyDeletionPort> = {},
): HumanResourcesPrivacyDeletionPort {
	return {
		getProcessorBoundary: vi.fn(async () => ok(boundary)),
		recordDeletionDecision: vi.fn(async () =>
			ok({ evidenceReference: "audit://privacy/decision-1" }),
		),
		executeDeletionDecision: vi.fn(async () =>
			ok({
				affectedRecordCount: 2,
				executionReference: "privacy://execution-1",
			}),
		),
		...overrides,
	};
}

describe("Human Resources privacy verification kernel", () => {
	it("decides delete, anonymize, and retained legal-record classifications", async () => {
		const port = deletionPort();
		const result = await decideHumanResourcesSubjectDeletion(
			decisionInput(),
			port,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.status).toBe("partially_approved");
		expect(result.data.dispositions).toEqual([
			{
				classification: "recruitment_and_background",
				disposition: "delete",
				reason: "retention_satisfied",
			},
			{
				classification: "workforce_core",
				disposition: "anonymize",
				reason: "retention_satisfied",
			},
			{
				classification: "pay_and_benefits",
				disposition: "retain",
				reason: "legal_record_required",
			},
		]);
		expect(result.data.processorBoundaryVersion).toBe("boundary-v3");
		expect(result.data.evidenceHash).toHaveLength(64);
		expect(result.data.subjectReferenceHash).toHaveLength(64);
		expect(JSON.stringify(result.data)).not.toContain("employee-sensitive-1");
		expect(port.recordDeletionDecision).toHaveBeenCalledWith(
			expect.objectContaining({
				actorUserId: "privacy-officer",
				status: "partially_approved",
			}),
		);
	});

	it("fails closed for active retention, missing evidence, and legal hold", async () => {
		const result = await decideHumanResourcesSubjectDeletion(
			decisionInput({
				classifications: [
					{
						classification: "workforce_core",
						retentionEndsAt: "2027-01-01T00:00:00.000Z",
					},
					{
						classification: "medical_and_leave",
						retentionEndsAt: null,
					},
				],
				activeLegalHolds: [
					{
						legalHoldId: "hold-1",
						classifications: ["workforce_core"],
					},
				],
			}),
			deletionPort(),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.status).toBe("denied");
		expect(result.data.dispositions).toEqual([
			expect.objectContaining({ reason: "legal_hold", disposition: "retain" }),
			expect.objectContaining({
				reason: "retention_evidence_missing",
				disposition: "retain",
			}),
		]);
	});

	it("denies a disposition unsupported by any active subprocessor", async () => {
		const unsupportedBoundary = {
			...boundary,
			subprocessors: boundary.subprocessors.map((processor) => ({
				...processor,
				deletionCapability: "retain_only" as const,
			})),
		};
		const result = await decideHumanResourcesSubjectDeletion(
			decisionInput({ classifications: [EXPIRED_RECRUITMENT_CLASSIFICATION] }),
			deletionPort({
				getProcessorBoundary: vi.fn(async () => ok(unsupportedBoundary)),
			}),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data).toMatchObject({
			status: "denied",
			dispositions: [
				{
					classification: "recruitment_and_background",
					disposition: "retain",
					reason: "processor_boundary_unsupported",
				},
			],
		});
	});

	it("rejects unverified or cross-tenant processor boundaries", async () => {
		const unverified = await decideHumanResourcesSubjectDeletion(
			decisionInput(),
			deletionPort({
				getProcessorBoundary: vi.fn(async () =>
					ok({
						...boundary,
						primaryProcessor: {
							...boundary.primaryProcessor,
							contractReference: "",
						},
					}),
				),
			}),
		);
		expect(unverified).toMatchObject({ ok: false, code: "CONFLICT" });

		const crossed = await decideHumanResourcesSubjectDeletion(
			decisionInput(),
			deletionPort({
				getProcessorBoundary: vi.fn(async () =>
					ok({ ...boundary, organizationId: "org-other" }),
				),
			}),
		);
		expect(crossed).toMatchObject({ ok: false, code: "FORBIDDEN" });
	});

	it("delegates approved execution to the platform port and blocks denied decisions", async () => {
		const port = deletionPort();
		const approved = await decideHumanResourcesSubjectDeletion(
			decisionInput({ classifications: [EXPIRED_RECRUITMENT_CLASSIFICATION] }),
			port,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		const executed = await executeHumanResourcesDeletionDecision(
			approved.data,
			port,
		);
		expect(executed).toEqual(
			ok({
				affectedRecordCount: 2,
				executionReference: "privacy://execution-1",
			}),
		);
		expect(port.executeDeletionDecision).toHaveBeenCalledWith(
			expect.objectContaining({
				decisionId: approved.data.decisionId,
				evidenceReference: approved.data.evidenceReference,
			}),
		);

		const denied = await decideHumanResourcesSubjectDeletion(
			decisionInput({
				classifications: [
					{ classification: "workforce_core", retentionEndsAt: null },
				],
			}),
			port,
		);
		expect(denied.ok).toBe(true);
		if (!denied.ok) {
			return;
		}
		const blocked = await executeHumanResourcesDeletionDecision(
			denied.data,
			port,
		);
		expect(blocked).toMatchObject({ ok: false, code: "CONFLICT" });
		expect(port.executeDeletionDecision).toHaveBeenCalledTimes(1);
	});
});
