import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const privacyServiceRef = vi.hoisted(() => ({
	current: null as ReturnType<
		typeof import("@/modules/privacy/domain/platform-privacy-service").createPlatformPrivacyService
	> | null,
}));

vi.mock("@/modules/privacy/server/get-platform-privacy-service", () => ({
	getPlatformPrivacyService: () => {
		if (privacyServiceRef.current === null) {
			throw new Error("Privacy service test double was not configured.");
		}
		return privacyServiceRef.current;
	},
	resetPlatformPrivacyServiceForTests: vi.fn(),
}));

import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { createPayrollPrivacyPort } from "@/lib/erp/payroll-privacy-port";
import { createPlatformPrivacyService } from "@/modules/privacy/domain/platform-privacy-service";
import { createPrivacyOperationStore } from "@/modules/privacy/domain/privacy-operation-store";
import type {
	PrivacySubjectInventoryPort,
	PrivacySubjectRecord,
} from "@/modules/privacy/types";

function createOrgScopedInventory(
	recordsByOrg: ReadonlyMap<string, readonly PrivacySubjectRecord[]>,
): PrivacySubjectInventoryPort {
	return {
		async listSubjectRecords(input) {
			return await errorResult.ok(recordsByOrg.get(input.organizationId) ?? []);
		},
	};
}

describe("Payroll privacy composition port", () => {
	const organizationId = randomUUID();
	const subjectEmployeeId = randomUUID();
	const actorUserId = randomUUID();
	const correlationId = randomUUID();
	const requestedAt = "2026-08-05T00:00:00.000Z";

	const subjectRecords = [
		{
			recordId: randomUUID(),
			entity: "payroll_privacy_subject",
			organizationId,
		},
	] as const;

	let auditCalls: unknown[] = [];

	function createAuditPort() {
		return {
			async record(
				input: unknown,
			): Promise<Result<{ id: string; organizationId: string }>> {
				auditCalls.push(input);
				const command = input as { organizationId: string };
				return await errorResult.ok({
					id: randomUUID(),
					organizationId: command.organizationId,
				});
			},
		};
	}

	beforeEach(() => {
		auditCalls = [];
		privacyServiceRef.current = null;
	});

	it("wires privacy at the payroll command-options composition root", () => {
		privacyServiceRef.current = createPlatformPrivacyService({
			audit: createAuditPort(),
			store: createPrivacyOperationStore(),
			inventory: createOrgScopedInventory(
				new Map([[organizationId, subjectRecords]]),
			),
		});
		expect(createPayrollCommandOptions()).toBeDefined();
	});

	it("restricts, records retention, and marks expiry without erasure", async () => {
		privacyServiceRef.current = createPlatformPrivacyService({
			audit: createAuditPort(),
			store: createPrivacyOperationStore(),
			inventory: createOrgScopedInventory(
				new Map([[organizationId, subjectRecords]]),
			),
		});
		const port = createPayrollPrivacyPort();
		const context = {
			organizationId,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "processing_restriction",
		};

		const restricted = await port.restrictSubject({
			...context,
			classifications: ["payslip_evidence"],
			restrictionReference: "payroll-hold-1",
		});
		expect(restricted.ok).toBe(true);

		const evaluation = await port.evaluateRestriction(context);
		expect(evaluation.ok).toBe(true);
		if (evaluation.ok) {
			expect(evaluation.data.restricted).toBe(true);
		}

		const recorded = await port.recordRetentionEvidence({
			...context,
			legalBasis: "statutory_payslip_retention",
			classifications: ["payslip_evidence"],
			clockStartedAt: "2018-01-01T00:00:00.000Z",
			minimumRetentionMonths: 84,
		});
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			return;
		}
		expect(recorded.data.eligibleForErasure).toBe(false);

		const expired = await port.expireRetention({
			organizationId,
			actorUserId,
			correlationId,
			evidenceId: recorded.data.evidenceId,
			expiredAt: "2025-01-01T00:00:00.000Z",
		});
		expect(expired.ok).toBe(true);
		if (expired.ok) {
			expect(expired.data.eligibleForErasure).toBe(true);
		}
	});
});
