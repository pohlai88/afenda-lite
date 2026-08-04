import { readFileSync } from "node:fs";

import { z } from "zod";

import {
	PAYROLL_COMMAND_AUTHORIZATION,
	PAYROLL_OPERATION_DEFINITIONS,
	PAYROLL_QUERY_AUTHORIZATION,
} from "../../src/kernel/operations/registry";

/**
 * Payroll's registry-projection fixture mirrors HR's top-level shape
 * (`authorizationProjection`, `operations`, `packageName`, `schemaVersion`)
 * at HR's own reduced field set for Payroll: HR's operation governance
 * manifest (event catalog, temporal policy, privacy disposition, ...) has no
 * Payroll counterpart today — per task-5 brief this projects exactly what
 * `src/kernel/operations/registry.ts` owns: id, kind, owner, permission,
 * publicName.
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
	operations: z.array(registryOperationSchema),
	packageName: z.literal("@afenda/payroll"),
	schemaVersion: z.literal(1),
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

export function buildRegistryProjectionContract(): RegistryProjectionContract {
	const operations = Object.values(PAYROLL_OPERATION_DEFINITIONS)
		.map((definition) => ({
			id: definition.id,
			kind: definition.kind,
			owner: definition.owner,
			permission: definition.permission,
			publicName: definition.publicName,
		}))
		.toSorted((left, right) => left.id.localeCompare(right.id));

	return registryProjectionContractSchema.parse({
		authorizationProjection: {
			...PAYROLL_COMMAND_AUTHORIZATION,
			...PAYROLL_QUERY_AUTHORIZATION,
		},
		operations,
		packageName: "@afenda/payroll",
		schemaVersion: 1,
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
