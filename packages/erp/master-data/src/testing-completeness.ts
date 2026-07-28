export type MasterDataCompletionGate =
	| "package_vitest"
	| "db_schema_vitest"
	| "database_integration"
	| "architecture_scan"
	| "event_contract";

export type MasterDataTestLayerId =
	| "schema_tests"
	| "command_unit_tests"
	| "memory_store_tests"
	| "drizzle_parity_tests"
	| "transaction_tests"
	| "tenant_tests"
	| "concurrency_tests"
	| "migration_tests"
	| "architecture_tests"
	| "export_tests"
	| "event_contract_tests"
	| "search_projector_tests"
	| "import_tests"
	| "merge_tests";

export type MasterDataAggregateParityCase =
	| "create_succeeds"
	| "duplicate_code_fails"
	| "cross_org_access_fails"
	| "update_with_current_version_succeeds"
	| "stale_update_fails"
	| "invalid_lifecycle_transition_fails"
	| "valid_activation_succeeds"
	| "archive_behavior_succeeds"
	| "audit_is_produced"
	| "event_is_produced"
	| "rollback_removes_state_audit_and_event"
	| "memory_and_drizzle_domain_results_match";

export type MasterDataCompletionEvidence = Readonly<{
	id: MasterDataTestLayerId;
	requiredEvidence: string;
	gate: MasterDataCompletionGate;
	evidencePaths: readonly string[];
	completeClaimRule: "required_before_complete";
}>;

export type MasterDataAggregateParityRequirement = Readonly<{
	aggregate: string;
	cases: readonly MasterDataAggregateParityCase[];
	evidencePaths: readonly string[];
}>;

export const MASTER_DATA_REQUIRED_TEST_LAYERS = [
	{
		id: "schema_tests",
		requiredEvidence: "Zod acceptance and rejection boundaries",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/extension-schemas.test.ts",
			"__tests__/platform-references.test.ts",
			"__tests__/command-contracts.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "command_unit_tests",
		requiredEvidence: "Authorization, normalization, lifecycle, and CAS",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/authorization-matrix.test.ts",
			"__tests__/core-organization-masters.test.ts",
			"__tests__/lifecycle-governance.test.ts",
			"__tests__/master-data.domain.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "memory_store_tests",
		requiredEvidence: "Domain behavior and in-process atomicity",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/extensions.domain.test.ts",
			"__tests__/same-tx-inventory.test.ts",
			"__tests__/helpers/memory-master-data-store.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "drizzle_parity_tests",
		requiredEvidence: "Same observable outcome as memory store",
		gate: "database_integration",
		evidencePaths: [
			"__tests__/parity/parity-harness.ts",
			"__tests__/parity/party.parity.test.ts",
			"__tests__/parity/item.parity.test.ts",
			"__tests__/parity/item-group.parity.test.ts",
			"__tests__/parity/warehouse.parity.test.ts",
			"__tests__/parity/payment-term.parity.test.ts",
			"__tests__/parity/tax-registration.parity.test.ts",
			"__tests__/parity/organization-dimension.parity.test.ts",
			"__tests__/parity/variants.parity.test.ts",
			"__tests__/parity/import.parity.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "transaction_tests",
		requiredEvidence: "Entity, audit, and event roll back together",
		gate: "database_integration",
		evidencePaths: [
			"__tests__/same-tx-inventory.test.ts",
			"__tests__/integration/mutation-atomicity.integration.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "tenant_tests",
		requiredEvidence: "Cross-org reads and writes rejected",
		gate: "database_integration",
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/organization-dimension.domain.test.ts",
			"__tests__/import-bulk.test.ts",
			"__tests__/tenant-loader-guard.test.ts",
			"__tests__/integration/tenant-isolation.integration.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "concurrency_tests",
		requiredEvidence: "Stale versions fail deterministically",
		gate: "database_integration",
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/change-request.domain.test.ts",
			"__tests__/lifecycle-governance.test.ts",
			"__tests__/integration/cas-concurrency.integration.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "migration_tests",
		requiredEvidence: "Every listed table exists and constraints match",
		gate: "db_schema_vitest",
		evidencePaths: [
			"../../data-plane/db/__tests__/master-data-schema.test.ts",
			"../../data-plane/db/__tests__/master-data-extension-contract.test.ts",
			"../../data-plane/db/__tests__/tenancy.test.ts",
			"src/database-constraints.ts",
			"__tests__/database-constraints.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "architecture_tests",
		requiredEvidence: "No forbidden imports or raw table exports",
		gate: "architecture_scan",
		evidencePaths: [
			"__tests__/package-kernel.test.ts",
			"__tests__/cross-module-reference-contract.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "export_tests",
		requiredEvidence: "Root and subpath exports remain intentional",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/package-kernel.test.ts",
			"__tests__/extension-public-contract.test.ts",
			"__tests__/integration-projections-public-contract.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "event_contract_tests",
		requiredEvidence: "Payload conforms to @afenda/events",
		gate: "event_contract",
		evidencePaths: [
			"__tests__/integration-projections-public-contract.test.ts",
			"__tests__/extension-transaction-contract.test.ts",
			"../../data-plane/events",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "search_projector_tests",
		requiredEvidence: "Idempotency, replay, and stale event handling",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/search-projectors.test.ts",
			"__tests__/integration-projections-public-contract.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "import_tests",
		requiredEvidence:
			"Dry run, validation, approval, partial failure, and resume",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/import-bulk.test.ts",
			"__tests__/parity/import.parity.test.ts",
			"__tests__/integration/import-concurrency.integration.test.ts",
			"__tests__/refs-auth.test.ts",
			"__tests__/data-governance-workflows.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
	{
		id: "merge_tests",
		requiredEvidence: "Canonical resolution, cycles, and conflict handling",
		gate: "package_vitest",
		evidencePaths: [
			"__tests__/merge.domain.test.ts",
			"__tests__/change-request.domain.test.ts",
			"__tests__/lifecycle-governance.test.ts",
		],
		completeClaimRule: "required_before_complete",
	},
] as const satisfies readonly MasterDataCompletionEvidence[];

export const MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES = [
	"create_succeeds",
	"duplicate_code_fails",
	"cross_org_access_fails",
	"update_with_current_version_succeeds",
	"stale_update_fails",
	"invalid_lifecycle_transition_fails",
	"valid_activation_succeeds",
	"archive_behavior_succeeds",
	"audit_is_produced",
	"event_is_produced",
	"rollback_removes_state_audit_and_event",
	"memory_and_drizzle_domain_results_match",
] as const satisfies readonly MasterDataAggregateParityCase[];

export const MASTER_DATA_MUTABLE_AGGREGATE_PARITY_REQUIREMENTS = [
	{
		aggregate: "organization_dimension",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/organization-dimension.domain.test.ts",
			"__tests__/parity/organization-dimension.parity.test.ts",
			"src/capabilities/core-organization-masters/organization-dimension.ts",
		],
	},
	{
		aggregate: "party",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/change-request.domain.test.ts",
			"__tests__/parity/party.parity.test.ts",
			"src/capabilities/core-organization-masters/party.ts",
		],
	},
	{
		aggregate: "item_group",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/parity/item-group.parity.test.ts",
			"src/capabilities/core-organization-masters/item-group.ts",
		],
	},
	{
		aggregate: "item",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/extensions.domain.test.ts",
			"__tests__/parity/item.parity.test.ts",
			"src/capabilities/core-organization-masters/item.ts",
		],
	},
	{
		aggregate: "warehouse",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/warehouse-external-ids.test.ts",
			"__tests__/parity/warehouse.parity.test.ts",
			"src/capabilities/core-organization-masters/warehouse.ts",
		],
	},
	{
		aggregate: "payment_term",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/parity/payment-term.parity.test.ts",
			"src/capabilities/core-organization-masters/payment-term.ts",
		],
	},
	{
		aggregate: "tax_registration",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/master-data.domain.test.ts",
			"__tests__/parity/tax-registration.parity.test.ts",
			"src/capabilities/core-organization-masters/tax-registration.ts",
		],
	},
	{
		aggregate: "item_template",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/item-variant.domain.test.ts",
			"__tests__/parity/variants.parity.test.ts",
			"src/capabilities/core-organization-masters/item-template-variant.ts",
		],
	},
	{
		aggregate: "item_variant",
		cases: MASTER_DATA_REQUIRED_AGGREGATE_PARITY_CASES,
		evidencePaths: [
			"__tests__/item-variant.domain.test.ts",
			"__tests__/parity/variants.parity.test.ts",
			"src/capabilities/core-organization-masters/item-template-variant.ts",
		],
	},
] as const satisfies readonly MasterDataAggregateParityRequirement[];

export const MASTER_DATA_COMPLETION_GATE_COMMANDS = [
	"pnpm --filter @afenda/master-data lint",
	"pnpm --filter @afenda/master-data typecheck",
	"pnpm --filter @afenda/master-data test",
	"pnpm test:master-data:parity",
	'pnpm --filter @afenda/db test -- -t "master-data schema|master-data extension|tenancy"',
	"pnpm audit:tenancy-nulls",
] as const;
