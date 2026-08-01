import type { HumanResourcesOperationRegistry } from "./types";

export function defineHumanResourcesOperationRegistry<
	const TRegistry extends HumanResourcesOperationRegistry,
>(registry: TRegistry): Readonly<TRegistry> {
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();

	for (const [publicName, definition] of Object.entries(registry)) {
		if (definition.publicName !== publicName) {
			throw new Error(
				`HR operation registry key ${publicName} does not match public name ${definition.publicName}`,
			);
		}
		if (operationIds.has(definition.id)) {
			throw new Error(`Duplicate HR operation id: ${definition.id}`);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate HR public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}

	return Object.freeze(registry);
}

export function projectHumanResourcesOperationIds<
	const TRegistry extends HumanResourcesOperationRegistry,
>(registry: TRegistry): readonly TRegistry[keyof TRegistry]["id"][] {
	return Object.freeze(
		Object.values(registry).map((definition) => definition.id),
	);
}

export function composeHumanResourcesOperationRegistries(
	...registries: readonly HumanResourcesOperationRegistry[]
): readonly HumanResourcesOperationRegistry[string][] {
	const definitions = registries.flatMap((registry) => Object.values(registry));
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();

	for (const definition of definitions) {
		if (operationIds.has(definition.id)) {
			throw new Error(`Duplicate composed HR operation id: ${definition.id}`);
		}
		if (publicNames.has(definition.publicName)) {
			throw new Error(
				`Duplicate composed HR public operation name: ${definition.publicName}`,
			);
		}
		operationIds.add(definition.id);
		publicNames.add(definition.publicName);
	}

	return Object.freeze(definitions);
}

type HumanResourcesAuthorizationProjection<
	TRegistry extends HumanResourcesOperationRegistry,
> = {
	readonly [TDefinition in TRegistry[keyof TRegistry] as TDefinition["id"]]: TDefinition["permission"];
};

export function projectHumanResourcesAuthorization<
	const TRegistry extends HumanResourcesOperationRegistry,
>(registry: TRegistry): HumanResourcesAuthorizationProjection<TRegistry> {
	const projection = Object.freeze(
		Object.fromEntries(
			Object.values(registry).map((definition) => [
				definition.id,
				definition.permission,
			]),
		),
	);

	// The projection is constructed from every validated definition exactly once;
	// Object.fromEntries cannot retain that key remapping in its standard type.
	return projection as HumanResourcesAuthorizationProjection<TRegistry>;
}
