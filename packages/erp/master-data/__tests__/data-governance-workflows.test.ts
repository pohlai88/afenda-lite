import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	assertChangeRequestApplyGate,
	CHANGE_REQUEST_TRANSITIONS,
	GOVERNANCE_PERMISSION_CODES,
	governanceReasonRequired,
} from "../src/capabilities/data-governance-workflows/change-request";
import {
	assertImportBatchApproved,
	DEFAULT_IMPORT_MODE,
	IMPORT_BATCH_TRANSITIONS,
	summarizeImportFindings,
} from "../src/capabilities/data-governance-workflows/import-bulk";
import {
	createDuplicateWarningPairKey,
	MERGE_CONFLICT_DECISIONS,
	summarizeMergeConflictResolutions,
} from "../src/capabilities/data-governance-workflows/merge";

const packageRoot = join(import.meta.dirname, "..");

describe("data-governance workflow capability entrypoints", () => {
	it("publishes the change-request governance surface from the capability folder", () => {
		expect(CHANGE_REQUEST_TRANSITIONS.approve.requiredPermission).toBe(
			"master_data.change_request_approve",
		);
		expect(GOVERNANCE_PERMISSION_CODES).toContain(
			"master_data.change_request_apply",
		);

		const reason = governanceReasonRequired({
			operation: "change_request.approve",
			requiredReason: "decision_reason",
		});
		expect(reason.ok).toBe(false);

		const applyGate = assertChangeRequestApplyGate({
			request: {
				id: "cr-1",
				status: "approved",
				proposalVersion: 1,
				mutableFieldAllowlistVersion: 1,
				expiresAt: null,
			},
			expectedProposalVersion: 1,
			currentAllowlistVersion: 1,
			now: new Date("2026-01-01T00:00:00.000Z"),
		});
		expect(applyGate.ok).toBe(true);
	});

	it("publishes the import workflow surface from the capability folder", () => {
		expect(DEFAULT_IMPORT_MODE).toBe("create_or_update");
		expect(IMPORT_BATCH_TRANSITIONS.approve.requiredPermission).toBe(
			"master_data.import_approve",
		);

		const summary = summarizeImportFindings([
			{
				severity: "warning",
				code: "DUPLICATE_SIGNAL",
				message: "Potential duplicate requires review",
				rowNumber: 2,
			},
		]);
		expect(summary.warningAcknowledgementRequired).toBe(true);
		expect(summary.approvalBlocked).toBe(true);

		const approved = assertImportBatchApproved({
			batchId: "batch-1",
			status: "approved",
		});
		expect(approved.ok).toBe(true);
	});

	it("publishes duplicate and merge governance from the capability folder", () => {
		expect(MERGE_CONFLICT_DECISIONS).toContain("manual_resolution_required");
		expect(
			createDuplicateWarningPairKey({
				organizationId: "org-1",
				entityType: "party",
				sourceEntityId: "party-b",
				candidateEntityId: "party-a",
			}),
		).toBe("org-1:party:party-a:party-b");

		const summary = summarizeMergeConflictResolutions([
			{
				id: "conflict-1",
				area: "tax_registrations",
				field: "taxRegistration.number",
				valueKind: "unique",
				sourceValue: {
					id: "source-tax",
					expectedVersion: 1,
					displayValue: "SRC-TAX",
				},
				targetValue: {
					id: "target-tax",
					expectedVersion: 1,
					displayValue: "TGT-TAX",
				},
				decision: "manual_resolution_required",
				reason: "Legal identity requires reviewer decision",
				sensitivityLevel: "restricted",
				resolvedBy: null,
				resolvedAt: null,
			},
		]);

		expect(summary).toMatchObject({
			totalCount: 1,
			unresolvedCount: 1,
			restrictedCount: 1,
		});
	});

	it("does not retain stale Drizzle change-request replicas", () => {
		expect(
			existsSync(
				join(
					packageRoot,
					"src/capabilities/data-governance-workflows/drizzle-change-request.ts",
				),
			),
		).toBe(false);
		expect(
			existsSync(
				join(
					packageRoot,
					"src/capabilities/data-governance-workflows/drizzle-change-request-store.ts",
				),
			),
		).toBe(true);
	});
});
