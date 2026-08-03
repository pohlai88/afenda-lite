import type {
	PurchasingOperationDeclaration,
	PurchasingOperationDeclarationRegistry,
} from "./types";

/**
 * Builds a validated feature operation registry.
 * Fails closed on key/publicName mismatches and duplicate ids or public names.
 */
export function definePurchasingOperationRegistry<
	const TRegistry extends PurchasingOperationDeclarationRegistry,
>(registry: TRegistry): TRegistry {
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	for (const [publicName, definition] of Object.entries(registry)) {
		if (definition.publicName !== publicName) {
			throw new Error(
				`Purchasing operation registry key ${publicName} does not match public name ${definition.publicName}`,
			);
		}
		if (operationIds.has(definition.id)) {
			throw new Error(`Duplicate Purchasing operation id: ${definition.id}`);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate Purchasing public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}
	return registry;
}

/** Composes feature registries, failing closed on cross-feature duplicates. */
export function composePurchasingOperationRegistries(
	...registries: readonly PurchasingOperationDeclarationRegistry[]
): readonly PurchasingOperationDeclaration[] {
	const definitions = registries.flatMap((registry) => Object.values(registry));
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	for (const definition of definitions) {
		if (operationIds.has(definition.id)) {
			throw new Error(
				`Duplicate composed Purchasing operation id: ${definition.id}`,
			);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate composed Purchasing public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}
	return Object.freeze(definitions);
}

export function projectPurchasingOperationIds<
	TDefinition extends PurchasingOperationDeclaration,
>(definitions: readonly TDefinition[]): readonly TDefinition["id"][] {
	return Object.freeze(definitions.map(({ id }) => id));
}

export function projectPurchasingAuthorization<
	TDefinition extends PurchasingOperationDeclaration,
>(
	definitions: readonly TDefinition[],
): Readonly<Record<TDefinition["id"], TDefinition["permission"]>> {
	return Object.freeze(
		Object.fromEntries(
			definitions.map(({ id, permission }) => [id, permission]),
		),
	) as Readonly<Record<TDefinition["id"], TDefinition["permission"]>>;
}
