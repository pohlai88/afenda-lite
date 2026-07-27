import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as drizzleAdapter from "../src/adapters/drizzle";
import {
	buildPendingOutboxRecord,
	canTransitionOutboxStatus,
	decideProjectionVersion,
	defineMasterDataAuditFact,
	defineMasterDataEventEnvelope,
	defineMasterDataOutboxRecord,
	defineMasterSearchDocument,
	defineMutationCommit,
	defineSearchRebuildCheckpoint,
	defineSearchRebuildPlan,
	defineSearchReconciliationMismatch,
	EVENT_PUBLICATION_FAILURE_CODES,
	expectedAggregateTypeForEvent,
	INTEGRATION_PROJECTION_FAILURE_CODES,
	INTEGRATION_PROJECTIONS_MODULE_MANIFEST,
	integrationOutboxWriteFailed,
	integrationProjectionInvalid,
	integrationTransactionFailed,
	isMasterDataAggregateType,
	isMasterDataEventType,
	MASTER_DATA_AGGREGATE_TYPES,
	MASTER_DATA_AUDIT_ENTITY_TYPES,
	MASTER_DATA_AUDIT_MODULE_ID,
	MASTER_DATA_EVENT_AGGREGATE_POLICY,
	MASTER_DATA_EVENT_PAYLOAD_MAP_PARITY,
	MASTER_DATA_EVENT_SCHEMA_VERSION,
	MASTER_DATA_EVENT_TYPES,
	MASTER_MUTATION_OPERATION_IDS,
	MASTER_SEARCH_DOCUMENT_ENTITY_TYPES,
	MASTER_SEARCH_PROJECTION_SCHEMA_VERSION,
	OUTBOX_CLAIM_RECOVERY_CODES,
	OUTBOX_STATUS_TRANSITIONS,
	OUTBOX_STATUSES,
	PROJECTION_VERSION_DECISIONS,
	SEARCH_LIFECYCLE_PROJECTION_ACTIONS,
	SEARCH_PROJECTION_FAILURE_CODES,
	SEARCH_PROJECTION_IGNORE_REASONS,
	SEARCH_PROJECTION_REMOVE_OUTCOMES,
	SEARCH_PROJECTION_UPSERT_OUTCOMES,
	SEARCH_REBUILD_STATUSES,
	SEARCH_RECONCILIATION_MISMATCH_KINDS,
	searchActionForMasterStatus,
	shouldApplyProjection,
} from "../src/index";

const packageRoot = join(import.meta.dirname, "..");

const PUBLIC_INTEGRATION_PROJECTION_CONSTANTS = [
	EVENT_PUBLICATION_FAILURE_CODES,
	INTEGRATION_PROJECTIONS_MODULE_MANIFEST,
	INTEGRATION_PROJECTION_FAILURE_CODES,
	MASTER_DATA_AGGREGATE_TYPES,
	MASTER_DATA_AUDIT_ENTITY_TYPES,
	MASTER_DATA_AUDIT_MODULE_ID,
	MASTER_DATA_EVENT_AGGREGATE_POLICY,
	MASTER_DATA_EVENT_PAYLOAD_MAP_PARITY,
	MASTER_DATA_EVENT_SCHEMA_VERSION,
	MASTER_DATA_EVENT_TYPES,
	MASTER_MUTATION_OPERATION_IDS,
	MASTER_SEARCH_DOCUMENT_ENTITY_TYPES,
	MASTER_SEARCH_PROJECTION_SCHEMA_VERSION,
	OUTBOX_CLAIM_RECOVERY_CODES,
	OUTBOX_STATUSES,
	OUTBOX_STATUS_TRANSITIONS,
	PROJECTION_VERSION_DECISIONS,
	SEARCH_LIFECYCLE_PROJECTION_ACTIONS,
	SEARCH_PROJECTION_FAILURE_CODES,
	SEARCH_PROJECTION_IGNORE_REASONS,
	SEARCH_PROJECTION_REMOVE_OUTCOMES,
	SEARCH_PROJECTION_UPSERT_OUTCOMES,
	SEARCH_REBUILD_STATUSES,
	SEARCH_RECONCILIATION_MISMATCH_KINDS,
] as const;

const PUBLIC_INTEGRATION_PROJECTION_FUNCTIONS = [
	buildPendingOutboxRecord,
	canTransitionOutboxStatus,
	decideProjectionVersion,
	defineMasterDataAuditFact,
	defineMasterDataEventEnvelope,
	defineMasterDataOutboxRecord,
	defineMasterSearchDocument,
	defineMutationCommit,
	defineSearchRebuildCheckpoint,
	defineSearchRebuildPlan,
	defineSearchReconciliationMismatch,
	expectedAggregateTypeForEvent,
	integrationOutboxWriteFailed,
	integrationProjectionInvalid,
	integrationTransactionFailed,
	isMasterDataAggregateType,
	isMasterDataEventType,
	searchActionForMasterStatus,
	shouldApplyProjection,
] as const;

describe("integration projections public contract", () => {
	it("keeps governed integration contracts available from the package root", () => {
		for (const publicConstant of PUBLIC_INTEGRATION_PROJECTION_CONSTANTS) {
			expect(publicConstant).toBeDefined();
		}

		for (const publicFunction of PUBLIC_INTEGRATION_PROJECTION_FUNCTIONS) {
			expect(publicFunction).toBeTypeOf("function");
		}
	});

	it("keeps Drizzle integration helpers on the declared adapter subpath", () => {
		expect(drizzleAdapter.prepareDrizzleAuditWrite).toBeTypeOf("function");
		expect(drizzleAdapter.buildPendingOutboxRecord).toBeTypeOf("function");
	});

	it("does not publish a separate integration-projections package subpath", () => {
		const packageJson = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf8"),
		) as { exports?: Record<string, unknown> };

		expect(packageJson.exports).not.toHaveProperty("./integration-projections");
	});

	it("keeps search projector contracts on the canonical integration path", () => {
		expect(
			readFileSync(
				join(
					packageRoot,
					"src/capabilities/integration-projections/integration/search-projectors.ts",
				),
				"utf8",
			),
		).toContain("SEARCH_PROJECTION_IGNORE_REASONS");
		expect(() =>
			readFileSync(
				join(
					packageRoot,
					"src/capabilities/integration-projections/search-projectors.ts",
				),
				"utf8",
			),
		).toThrow();
	});
});
