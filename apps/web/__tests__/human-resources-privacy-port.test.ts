import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources";
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

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { createHumanResourcesPrivacyPort } from "@/lib/erp/human-resources-privacy-port";
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

describe("Human Resources privacy composition port", () => {
	const organizationA = randomUUID();
	const organizationB = randomUUID();
	const subjectEmployeeId =
		"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
	const actorUserId = randomUUID();
	const correlationId = randomUUID();
	const requestedAt = "2026-07-25T00:00:00.000Z";

	const subjectRecords = [
		{
			recordId: randomUUID(),
			entity: "hr_employee",
			organizationId: organizationA,
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

	it("wires privacy at the HR command-options composition root", () => {
		privacyServiceRef.current = createPlatformPrivacyService({
			inventory: createOrgScopedInventory(new Map()),
			audit: createAuditPort(),
		});

		const options = createHumanResourcesCommandOptions();
		expect(options.privacy).toBeDefined();
		expect(typeof options.privacy?.exportSubject).toBe("function");
	});

	it("exports a tenant-scoped subject and records an audited export", async () => {
		const store = createPrivacyOperationStore();
		privacyServiceRef.current = createPlatformPrivacyService({
			store,
			inventory: createOrgScopedInventory(
				new Map([[organizationA, subjectRecords]]),
			),
			audit: createAuditPort(),
			createId: () => "export-1",
		});
		const port = createHumanResourcesPrivacyPort();

		const result = await port.exportSubject({
			organizationId: organizationA,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "data_subject_request",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.recordCount).toBe(1);
		expect(result.data.exportReference).toBe(
			`privacy://organizations/${organizationA}/exports/export-1`,
		);
		expect(auditCalls).toEqual([
			expect.objectContaining({
				organizationId: organizationA,
				action: "EXPORT",
				module: "privacy",
				entity: "privacy_export",
				entityId: "export-1",
			}),
		]);
		expect(result.data.records).toHaveLength(1);
		expect(result.data.records[0]?.organizationId).toBe(organizationA);
	});

	it("returns a privacy case summary for the subject", async () => {
		const store = createPrivacyOperationStore();
		store.placeLegalHold({
			legalHoldId: "hold-case",
			organizationId: organizationA,
			moduleId: "human-resources",
			subjectId: subjectEmployeeId,
			holdReference: "employee_relations_case",
			classifications: ["employee_relations_and_legal"],
			placedAt: requestedAt,
		});
		privacyServiceRef.current = createPlatformPrivacyService({
			store,
			inventory: createOrgScopedInventory(
				new Map([[organizationA, subjectRecords]]),
			),
			audit: createAuditPort(),
			createId: () => "export-case",
		});
		const port = createHumanResourcesPrivacyPort();

		await port.exportSubject({
			organizationId: organizationA,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "data_subject_request",
		});

		const result = await port.getSubjectPrivacyCase({
			organizationId: organizationA,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "privacy_case_read",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.subjectEmployeeId).toBe(subjectEmployeeId);
		expect(result.data.exports.length).toBeGreaterThan(0);
		expect(result.data.activeLegalHolds).toEqual([
			expect.objectContaining({
				legalHoldId: "hold-case",
				holdReference: "employee_relations_case",
			}),
		]);
	});

	it("fails closed when exporting the same subject under another tenant", async () => {
		privacyServiceRef.current = createPlatformPrivacyService({
			inventory: createOrgScopedInventory(
				new Map([[organizationA, subjectRecords]]),
			),
			audit: createAuditPort(),
		});
		const port = createHumanResourcesPrivacyPort();

		const result = await port.exportSubject({
			organizationId: organizationB,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "data_subject_request",
		});

		expect(result.ok).toBe(false);
		expect(auditCalls).toHaveLength(0);
	});

	it("blocks anonymization evaluation while legal hold is active", async () => {
		const store = createPrivacyOperationStore();
		store.placeLegalHold({
			legalHoldId: "hold-active",
			organizationId: organizationA,
			moduleId: "human-resources",
			subjectId: subjectEmployeeId,
			holdReference: "employee_relations_case",
			classifications: ["employee_relations_and_legal"],
			placedAt: requestedAt,
		});

		privacyServiceRef.current = createPlatformPrivacyService({
			store,
			inventory: createOrgScopedInventory(
				new Map([[organizationA, subjectRecords]]),
			),
			audit: createAuditPort(),
		});
		const port = createHumanResourcesPrivacyPort();

		const result = await port.evaluateAnonymization({
			organizationId: organizationA,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "anonymization_request",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.allowed).toBe(false);
		expect(result.data.reasonCode).toBe("employee_relations_case");
	});

	it("blocks anonymization execution while legal hold is active", async () => {
		const store = createPrivacyOperationStore();
		store.placeLegalHold({
			legalHoldId: "hold-active",
			organizationId: organizationA,
			moduleId: "human-resources",
			subjectId: subjectEmployeeId,
			holdReference: "employee_relations_case",
			classifications: ["employee_relations_and_legal"],
			placedAt: requestedAt,
		});

		privacyServiceRef.current = createPlatformPrivacyService({
			store,
			inventory: createOrgScopedInventory(
				new Map([[organizationA, subjectRecords]]),
			),
			audit: createAuditPort(),
		});
		const port = createHumanResourcesPrivacyPort();

		const result = await port.anonymizeSubject({
			organizationId: organizationA,
			actorUserId,
			correlationId,
			subjectEmployeeId,
			requestedAt,
			legalBasis: "anonymization_request",
			classifications: ["workforce_core"],
		});

		expect(result.ok).toBe(false);
		expect(auditCalls).toHaveLength(0);
	});

	it("rejects release of a legal hold owned by another tenant", async () => {
		const store = createPrivacyOperationStore();
		store.placeLegalHold({
			legalHoldId: "hold-1",
			organizationId: organizationA,
			moduleId: "human-resources",
			subjectId: subjectEmployeeId,
			holdReference: "case-123",
			classifications: ["workforce_core"],
			placedAt: requestedAt,
		});

		privacyServiceRef.current = createPlatformPrivacyService({
			store,
			inventory: createOrgScopedInventory(
				new Map([[organizationA, subjectRecords]]),
			),
			audit: createAuditPort(),
		});
		const port = createHumanResourcesPrivacyPort();

		const result = await port.releaseLegalHold({
			organizationId: organizationB,
			actorUserId,
			correlationId,
			legalHoldId: "hold-1",
			reason: "matter closed",
			releasedAt: requestedAt,
		});

		expect(result.ok).toBe(false);
		expect(auditCalls).toHaveLength(0);
	});
});
