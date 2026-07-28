import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	MASTER_DATA_COMPLETION_GATE_COMMANDS,
	MASTER_DATA_MUTABLE_AGGREGATE_PARITY_REQUIREMENTS,
	MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
	MASTER_DATA_REQUIRED_TEST_LAYERS,
} from "../src";

const packageRoot = join(import.meta.dirname, "..");

const requiredLayerIds = [
	"schema_tests",
	"command_unit_tests",
	"memory_store_tests",
	"drizzle_parity_tests",
	"transaction_tests",
	"tenant_tests",
	"concurrency_tests",
	"migration_tests",
	"architecture_tests",
	"export_tests",
	"event_contract_tests",
	"search_projector_tests",
	"import_tests",
	"merge_tests",
] as const;

const requiredGateCommands = [
	"pnpm --filter @afenda/master-data lint",
	"pnpm --filter @afenda/master-data typecheck",
	"pnpm --filter @afenda/master-data test",
	"pnpm test:master-data:parity",
	'pnpm --filter @afenda/db test -- -t "master-data schema|master-data extension|tenancy"',
	"pnpm audit:tenancy-nulls",
] as const;

const majorMutableAggregates = [
	"organization_dimension",
	"party",
	"item_group",
	"item",
	"warehouse",
	"payment_term",
	"tax_registration",
	"item_template",
	"item_variant",
] as const;

function resolveEvidencePath(path: string): string {
	return join(packageRoot, path);
}

describe("@afenda/master-data testing completeness contract", () => {
	it("requires every completion test layer before the package can be called complete", () => {
		expect(MASTER_DATA_REQUIRED_TEST_LAYERS.map((layer) => layer.id)).toEqual(
			requiredLayerIds,
		);

		for (const layer of MASTER_DATA_REQUIRED_TEST_LAYERS) {
			expect(layer.completeClaimRule).toBe("required_before_complete");
			expect(layer.requiredEvidence.length).toBeGreaterThan(0);
			expect(layer.evidencePaths.length).toBeGreaterThan(0);
			for (const evidencePath of layer.evidencePaths) {
				expect(
					existsSync(resolveEvidencePath(evidencePath)),
					`${layer.id} evidence path exists: ${evidencePath}`,
				).toBe(true);
			}
		}
	});

	it("does not allow unit tests alone to satisfy completion", () => {
		const gates = new Set(
			MASTER_DATA_REQUIRED_TEST_LAYERS.map((layer) => layer.gate),
		);

		expect(gates.has("package_vitest")).toBe(true);
		expect(gates.has("database_integration")).toBe(true);
		expect(gates.has("db_schema_vitest")).toBe(true);
		expect(gates.has("architecture_scan")).toBe(true);
		expect(gates.has("event_contract")).toBe(true);
		expect(MASTER_DATA_COMPLETION_GATE_COMMANDS).toEqual(requiredGateCommands);
	});

	it("requires the same minimum parity cases for every major mutable aggregate", () => {
		expect(
			MASTER_DATA_MUTABLE_AGGREGATE_PARITY_REQUIREMENTS.map(
				(row) => row.aggregate,
			),
		).toEqual(majorMutableAggregates);

		for (const requirement of MASTER_DATA_MUTABLE_AGGREGATE_PARITY_REQUIREMENTS) {
			expect(requirement.cases).toEqual(
				MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
			);
			for (const evidencePath of requirement.evidencePaths) {
				expect(
					existsSync(resolveEvidencePath(evidencePath)),
					`${requirement.aggregate} evidence path exists: ${evidencePath}`,
				).toBe(true);
			}
		}
	});
});
