import type { AuditEntry, AuditRecorder } from "@afenda/audit";
import { ok } from "@afenda/errors/result";
import {
	type HumanResourcesPrivacyPort,
	parseHumanResourcesEmployeeId,
} from "@afenda/human-resources";
import { describe, expect, it, vi } from "vitest";

import {
	evaluateHumanResourcesPrivacyDeletion,
	executeApprovedHumanResourcesPrivacyDeletion,
} from "@/lib/erp/human-resources-privacy-deletion";

function employeeFixtureId() {
	const parsed = parseHumanResourcesEmployeeId(
		"00000000-0000-4000-8000-000000000701",
	);
	if (!parsed.ok) throw new Error("Invalid employee test fixture");
	return parsed.data;
}

const employeeId = employeeFixtureId();

function privacyPort(input?: {
	organizationId?: string;
	holds?: readonly {
		legalHoldId: string;
		classifications: readonly string[];
	}[];
}): HumanResourcesPrivacyPort {
	return {
		exportSubject: vi.fn(async () =>
			ok({ exportReference: "privacy://export", recordCount: 0, records: [] }),
		),
		getSubjectPrivacyCase: vi.fn(async () =>
			ok({
				organizationId: input?.organizationId ?? "org-privacy",
				subjectEmployeeId: employeeId,
				exports: [],
				activeLegalHolds: (input?.holds ?? []).map((hold) => ({
					...hold,
					holdReference: "legal-hold",
					placedAt: "2026-07-01T00:00:00.000Z",
				})),
				recentOperations: [],
			}),
		),
		rectifySubject: vi.fn(async () => ok({ rectifiedRecordCount: 0 })),
		anonymizeSubject: vi.fn(async () => ok({ anonymizedRecordCount: 3 })),
		evaluateAnonymization: vi.fn(async () => ok({ allowed: true })),
		placeLegalHold: vi.fn(async () => ok({ legalHoldId: "hold-1" })),
		releaseLegalHold: vi.fn(async () => ok(undefined)),
		redactDownstream: vi.fn(async () => ok({ redactedSystemCount: 0 })),
	};
}

function auditRecorder() {
	return {
		record: vi.fn(async (input: unknown) => {
			const record = input as {
				organizationId: string;
				actorUserId: string;
				correlationId: string;
				module: string;
				entity: string;
				entityId: string;
				action: "CREATE";
				metadata: Record<string, unknown>;
			};
			return ok({
				id: "audit-decision-1",
				...record,
				changes: [],
				oldValue: null,
				newValue: null,
				ipAddress: null,
				userAgent: null,
				createdAt: new Date("2026-07-28T00:00:00.000Z"),
			} satisfies AuditEntry);
		}),
	} satisfies Pick<AuditRecorder, "record">;
}

function request() {
	return {
		organizationId: "org-privacy",
		actorUserId: "privacy-officer",
		correlationId: "corr-privacy-deletion",
		subjectEmployeeId: employeeId,
		requestedAt: "2026-07-28T00:00:00.000Z",
		legalBasis: "data_subject_erasure_request",
		classifications: [
			{
				classification: "recruitment_and_background" as const,
				retentionEndsAt: "2026-07-01T00:00:00.000Z",
			},
		],
	};
}

describe("HR privacy deletion production composition", () => {
	it("derives active legal holds from the platform and blocks execution", async () => {
		const privacy = privacyPort({
			holds: [
				{
					legalHoldId: "hold-active",
					classifications: ["recruitment_and_background"],
				},
			],
		});
		const audit = auditRecorder();
		const result = await executeApprovedHumanResourcesPrivacyDeletion(
			request(),
			{ privacy, audit },
		);

		expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
		expect(privacy.anonymizeSubject).not.toHaveBeenCalled();
		expect(audit.record).toHaveBeenCalledOnce();
	});

	it("fails closed when the platform privacy case crosses the tenant", async () => {
		const audit = auditRecorder();
		const result = await evaluateHumanResourcesPrivacyDeletion(request(), {
			privacy: privacyPort({ organizationId: "org-other" }),
			audit,
		});

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(audit.record).not.toHaveBeenCalled();
	});

	it("executes only the freshly approved classifications through the platform privacy port", async () => {
		const privacy = privacyPort();
		const audit = auditRecorder();
		const result = await executeApprovedHumanResourcesPrivacyDeletion(
			request(),
			{ privacy, audit },
		);

		expect(result).toMatchObject({
			ok: true,
			data: {
				affectedRecordCount: 3,
				decision: { status: "approved" },
			},
		});
		expect(privacy.anonymizeSubject).toHaveBeenCalledWith({
			organizationId: "org-privacy",
			actorUserId: "privacy-officer",
			correlationId: "corr-privacy-deletion",
			subjectEmployeeId: employeeId,
			requestedAt: "2026-07-28T00:00:00.000Z",
			legalBasis: "data_subject_erasure_request",
			classifications: ["recruitment_and_background"],
		});
		const auditPayload = JSON.stringify(audit.record.mock.calls[0]?.[0]);
		expect(auditPayload).not.toContain(employeeId);
		expect(auditPayload).toContain("subjectReferenceHash");
		expect(auditPayload).toContain("evidenceHash");
	});
});
