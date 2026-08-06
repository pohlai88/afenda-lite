import { readFileSync } from "node:fs";

import { z } from "zod";

import {
	PAYROLL_COMMAND_AUTHORIZATION,
	PAYROLL_OPERATION_DEFINITIONS,
	PAYROLL_QUERY_AUTHORIZATION,
} from "../../src/kernel/operations/registry";
import { buildPublicContract } from "./public-contract";

/**
 * Payroll's registry-projection fixture mirrors HR's top-level shape
 * (`authorizationProjection`, `errorCodeSets`, `eventCatalog`, `operations`,
 * `packageName`, `schemaVersion`, `temporalPolicyOverrides`) so
 * `governance:erp-symmetry` can diff shapes across both ERP packages.
 * Per-operation fields project exactly what `src/kernel/operations/registry.ts`
 * owns (id, kind, owner, permission, publicName). `eventCatalog` and
 * `temporalPolicyOverrides` recompute empty because Payroll has no committed
 * event-catalog or temporal-policy register; `errorCodeSets` is derived from
 * the public-contract projection (also empty until per-signature error-code
 * extraction lands in that helper).
 */

const registryOperationSchema = z.object({
	id: z.string().min(1),
	kind: z.enum(["command", "query"]),
	owner: z.string().min(1),
	permission: z.string().min(1),
	publicName: z.string().min(1),
});

const registryProjectionContractSchema = z.object({
	authorizationProjection: z.record(z.string(), z.string()),
	errorCodeSets: z.record(z.string(), z.array(z.string().min(1))),
	eventCatalog: z.array(z.string().min(1)),
	operations: z.array(registryOperationSchema),
	packageName: z.literal("@afenda/payroll"),
	schemaVersion: z.literal(1),
	temporalPolicyOverrides: z.record(z.string(), z.string()),
});

export type RegistryProjectionContract = z.infer<
	typeof registryProjectionContractSchema
>;

export interface RegistryProjectionIssue {
	readonly code:
		| "duplicate-operation"
		| "missing-authorization"
		| "permission-projection-drift";
	readonly id: string;
}

export function buildRegistryProjectionContract(
	packageRoot: string,
): RegistryProjectionContract {
	const operations = Object.values(PAYROLL_OPERATION_DEFINITIONS)
		.map((definition) => ({
			id: definition.id,
			kind: definition.kind,
			owner: definition.owner,
			permission: definition.permission,
			publicName: definition.publicName,
		}))
		.toSorted((left, right) => left.id.localeCompare(right.id));
	const publicContract = buildPublicContract(packageRoot);

	return registryProjectionContractSchema.parse({
		authorizationProjection: {
			...PAYROLL_COMMAND_AUTHORIZATION,
			...PAYROLL_QUERY_AUTHORIZATION,
		},
		errorCodeSets: publicContract.errorCodeSets,
		eventCatalog: [],
		operations,
		packageName: "@afenda/payroll",
		schemaVersion: 1,
		temporalPolicyOverrides: {},
	});
}

export function readRegistryProjectionFixture(
	file: string,
): RegistryProjectionContract {
	return registryProjectionContractSchema.parse(
		JSON.parse(readFileSync(file, "utf8")),
	);
}

export function validateRegistryProjectionContract(
	contract: RegistryProjectionContract,
): readonly RegistryProjectionIssue[] {
	const issues: RegistryProjectionIssue[] = [];
	const ids = new Set<string>();
	for (const operation of contract.operations) {
		if (ids.has(operation.id)) {
			issues.push({ code: "duplicate-operation", id: operation.id });
		}
		ids.add(operation.id);
		if (operation.permission.length === 0) {
			issues.push({ code: "missing-authorization", id: operation.id });
		}
		if (
			contract.authorizationProjection[operation.id] !== operation.permission
		) {
			issues.push({ code: "permission-projection-drift", id: operation.id });
		}
	}
	return issues.toSorted((left, right) =>
		`${left.code}:${left.id}`.localeCompare(`${right.code}:${right.id}`),
	);
}
