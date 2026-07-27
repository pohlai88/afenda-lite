import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { MASTER_DATA_EVENT_TYPES } from "../src";
import {
	assertChangeRequestApplyGate,
	CHANGE_REQUEST_CANONICAL_FIELDS,
	CHANGE_REQUEST_CONTROLLED_SCOPE,
	CHANGE_REQUEST_PROHIBITED_SCOPE,
	CHANGE_REQUEST_SCOPE_CONTRACT,
	CHANGE_REQUEST_SEPARATE_GOVERNANCE_SCOPE,
	CHANGE_REQUEST_TRANSITIONS,
	GOVERNANCE_PERMISSION_CODES,
	governanceReasonRequired,
} from "../src/capabilities/data-governance-workflows/change-request";
import {
	assertImportBatchApproved,
	DEFAULT_IMPORT_MODE,
	IMPORT_BATCH_STATUSES,
	IMPORT_BATCH_TRANSITIONS,
	IMPORT_DETERMINISTIC_MATCH_KEYS,
	summarizeImportFindings,
} from "../src/capabilities/data-governance-workflows/import-bulk";
import {
	createDuplicateWarningPairKey,
	MERGE_CONFLICT_DECISIONS,
	summarizeMergeConflictResolutions,
	validateDuplicateWarningRecord,
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

	it("keeps change requests scoped to controlled master-data changes", () => {
		expect(CHANGE_REQUEST_CANONICAL_FIELDS).toEqual([
			"targetEntityType",
			"targetEntityId",
			"operationType",
			"beforeSnapshot",
			"proposedPatch",
			"reason",
			"requestedBy",
			"reviewedBy",
			"approvalStatus",
			"expectedTargetVersion",
			"decidedAt",
			"appliedAt",
		]);
		expect(CHANGE_REQUEST_CONTROLLED_SCOPE).toContain("activation");
		expect(CHANGE_REQUEST_CONTROLLED_SCOPE).toContain("merge");
		expect(CHANGE_REQUEST_CONTROLLED_SCOPE).toContain("sensitive_field_change");
		expect(CHANGE_REQUEST_CONTROLLED_SCOPE).toContain("tax_identity_change");
		expect(CHANGE_REQUEST_CONTROLLED_SCOPE).toContain(
			"external_identifier_change",
		);
		expect(CHANGE_REQUEST_SCOPE_CONTRACT.currentPublicCommandKinds).toEqual([
			"activate_party",
			"merge_parties",
		]);
		expect(CHANGE_REQUEST_SEPARATE_GOVERNANCE_SCOPE).toEqual([
			"import_batch",
			"bulk_import_apply",
			"duplicate_warning_review",
			"mass_update_batch",
		]);
		expect(CHANGE_REQUEST_PROHIBITED_SCOPE).toContain(
			"generic_workflow_engine",
		);
		expect(CHANGE_REQUEST_PROHIBITED_SCOPE).toContain("arbitrary_json_patch");
		expect(CHANGE_REQUEST_PROHIBITED_SCOPE).toContain(
			"platform_reference_mutation",
		);
	});

	it("publishes the import workflow surface from the capability folder", () => {
		expect(DEFAULT_IMPORT_MODE).toBe("create_or_update");
		expect(IMPORT_BATCH_STATUSES).toEqual([
			"parsed",
			"validated",
			"approval_pending",
			"approved",
			"applying",
			"partially_applied",
			"applied",
			"failed",
			"cancelled",
		]);
		expect(IMPORT_DETERMINISTIC_MATCH_KEYS).toEqual([
			"normalized_canonical_code",
			"approved_external_identifier",
		]);
		expect(IMPORT_BATCH_TRANSITIONS.approve.requiredPermission).toBe(
			"master_data.import_approve",
		);
		expect(IMPORT_BATCH_TRANSITIONS.startApply.requiredPermission).toBe(
			"master_data.import_apply",
		);
		expect(GOVERNANCE_PERMISSION_CODES).toEqual(
			expect.arrayContaining([
				"master_data.import_create",
				"master_data.import_validate",
				"master_data.import_approve",
				"master_data.import_apply",
				"master_data.import_cancel",
			]),
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

	it("validates duplicate warning evidence as advisory candidate records", () => {
		const detectedAt = new Date("2026-01-01T00:00:00.000Z");
		const warning = validateDuplicateWarningRecord({
			id: "dup-1",
			organizationId: "org-1",
			entityType: "party",
			sourceEntityId: "party-a",
			candidateEntityId: "party-b",
			matchingSignals: ["normalized_name", "tax_registration", "email"],
			confidence: 0.85,
			score: 0.85,
			severity: "high",
			status: "open",
			detectedAt,
			reviewedBy: null,
			reviewedAt: null,
			resolution: null,
			resolutionNote: null,
			relatedChangeRequestId: null,
			createdAt: detectedAt,
			updatedAt: detectedAt,
			version: 1,
		});
		expect(warning.ok).toBe(true);

		const invalid = validateDuplicateWarningRecord({
			id: "dup-2",
			organizationId: "org-1",
			entityType: "party",
			sourceEntityId: "party-a",
			candidateEntityId: "party-b",
			matchingSignals: ["barcode"],
			confidence: 0.6,
			score: 1.2,
			severity: "medium",
			status: "open",
			detectedAt,
			reviewedBy: null,
			reviewedAt: null,
			resolution: null,
			resolutionNote: null,
			relatedChangeRequestId: null,
			createdAt: detectedAt,
			updatedAt: detectedAt,
			version: 1,
		});
		expect(invalid.ok).toBe(false);
	});

	it("publishes specific MD-7 audit/event names instead of a generic update event", () => {
		expect(MASTER_DATA_EVENT_TYPES).toEqual(
			expect.arrayContaining([
				"master_data.organization_dimension.created",
				"master_data.organization_dimension.updated",
				"master_data.party.created",
				"master_data.party.activated",
				"master_data.party.suspended",
				"master_data.party.merged",
				"master_data.party_role.activated",
				"master_data.item.created",
				"master_data.item.activated",
				"master_data.warehouse.created",
				"master_data.change_request.approved",
				"master_data.change_request.applied",
				"master_data.import_batch.approved",
				"master_data.import_batch.applied",
			]),
		);
		expect(MASTER_DATA_EVENT_TYPES).not.toContain("master_data.updated");
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
