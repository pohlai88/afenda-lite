import type { PayrollPermission } from "../execution/permissions";

/** Feature ids that may own Payroll operations. */
export const PAYROLL_OPERATION_OWNERS = [
	"payroll-setup",
	"employee-assignments",
	"workforce-ingress",
	"variable-inputs",
	"payroll-runs",
	"payslips",
	"reconciliation",
] as const;
export type PayrollOperationOwner = (typeof PAYROLL_OPERATION_OWNERS)[number];

export interface PayrollOperationDeclaration {
	readonly id: `payroll.${string}`;
	readonly kind: "command" | "query";
	readonly owner: PayrollOperationOwner;
	readonly permission: PayrollPermission;
	/** Public facade function name exposing this operation. */
	readonly publicName: string;
}

export type PayrollOperationDeclarationRegistry = Readonly<
	Record<string, PayrollOperationDeclaration>
>;

/**
 * Builds a validated feature operation registry.
 * Fails closed on key/publicName mismatches and duplicate ids or public names.
 */
export function definePayrollOperationRegistry<
	const TRegistry extends PayrollOperationDeclarationRegistry,
>(registry: TRegistry): TRegistry {
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	for (const [publicName, definition] of Object.entries(registry)) {
		if (definition.publicName !== publicName) {
			throw new Error(
				`Payroll operation registry key ${publicName} does not match public name ${definition.publicName}`,
			);
		}
		if (operationIds.has(definition.id)) {
			throw new Error(`Duplicate Payroll operation id: ${definition.id}`);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate Payroll public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}
	return registry;
}

/** Composes feature registries, failing closed on cross-feature duplicates. */
export function composePayrollOperationRegistries(
	...registries: readonly PayrollOperationDeclarationRegistry[]
): readonly PayrollOperationDeclaration[] {
	const definitions = registries.flatMap((registry) => Object.values(registry));
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	for (const definition of definitions) {
		if (operationIds.has(definition.id)) {
			throw new Error(
				`Duplicate composed Payroll operation id: ${definition.id}`,
			);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate composed Payroll public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}
	return Object.freeze(definitions);
}
