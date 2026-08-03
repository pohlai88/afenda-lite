import type {
	CorporateAdministrationOperationDeclaration,
	CorporateAdministrationOperationDeclarationRegistry,
} from "./types";

/**
 * Builds a validated feature operation registry.
 * Fails closed on key/publicName mismatches and duplicate ids or public names.
 */
export function defineCorporateAdministrationOperationRegistry<
	const TRegistry extends CorporateAdministrationOperationDeclarationRegistry,
>(registry: TRegistry): TRegistry {
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	for (const [publicName, definition] of Object.entries(registry)) {
		if (definition.publicName !== publicName) {
			throw new Error(
				`Corporate Administration operation registry key ${publicName} does not match public name ${definition.publicName}`,
			);
		}
		if (operationIds.has(definition.id)) {
			throw new Error(
				`Duplicate Corporate Administration operation id: ${definition.id}`,
			);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate Corporate Administration public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}
	return registry;
}

/** Composes feature registries, failing closed on cross-feature duplicates. */
export function composeCorporateAdministrationOperationRegistries(
	...registries: readonly CorporateAdministrationOperationDeclarationRegistry[]
): readonly CorporateAdministrationOperationDeclaration[] {
	const definitions = registries.flatMap((registry) => Object.values(registry));
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	for (const definition of definitions) {
		if (operationIds.has(definition.id)) {
			throw new Error(
				`Duplicate composed Corporate Administration operation id: ${definition.id}`,
			);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate composed Corporate Administration public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}
	return Object.freeze(definitions);
}

export function projectCorporateAdministrationOperationIds<
	TDefinition extends CorporateAdministrationOperationDeclaration,
>(definitions: readonly TDefinition[]): readonly TDefinition["id"][] {
	return Object.freeze(definitions.map(({ id }) => id));
}

export function projectCorporateAdministrationAuthorization<
	TDefinition extends CorporateAdministrationOperationDeclaration,
>(
	definitions: readonly TDefinition[],
): Readonly<Record<TDefinition["id"], TDefinition["permission"]>> {
	return Object.freeze(
		Object.fromEntries(
			definitions.map(({ id, permission }) => [id, permission]),
		),
	) as Readonly<Record<TDefinition["id"], TDefinition["permission"]>>;
}
