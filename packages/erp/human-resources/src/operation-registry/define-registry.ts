import {
	defaultHumanResourcesOperationSensitivity,
	type HUMAN_RESOURCES_POLICY_SENSITIVITY_DEFAULTS,
} from "./sensitivity-defaults";
import {
	HUMAN_RESOURCES_CAPABILITY_OBSERVABILITY_AREAS,
	type HumanResourcesOperationDeclaration,
	type HumanResourcesOperationDeclarationRegistry,
	type HumanResourcesOperationRegistry,
} from "./types";

type NormalizedHumanResourcesOperation<
	TDeclaration extends HumanResourcesOperationDeclaration,
> = Omit<TDeclaration, "observabilityArea" | "resourceKind" | "sensitivity"> & {
	readonly observabilityArea: TDeclaration extends {
		readonly observabilityArea: infer TArea;
	}
		? TArea
		: (typeof HUMAN_RESOURCES_CAPABILITY_OBSERVABILITY_AREAS)[TDeclaration["owner"]];
	readonly sensitivity: TDeclaration extends {
		readonly sensitivity: infer TSensitivity;
	}
		? TSensitivity
		: TDeclaration["authorizationPolicy"] extends keyof typeof HUMAN_RESOURCES_POLICY_SENSITIVITY_DEFAULTS
			? (typeof HUMAN_RESOURCES_POLICY_SENSITIVITY_DEFAULTS)[TDeclaration["authorizationPolicy"]]
			: null;
	readonly resourceKind: TDeclaration extends {
		readonly resourceKind: infer TResourceKind;
	}
		? TResourceKind
		: null;
};

type NormalizedHumanResourcesOperationRegistry<
	TRegistry extends HumanResourcesOperationDeclarationRegistry,
> = {
	readonly [TKey in keyof TRegistry]: NormalizedHumanResourcesOperation<
		TRegistry[TKey]
	>;
};

export function defineHumanResourcesOperationRegistry<
	const TRegistry extends HumanResourcesOperationDeclarationRegistry,
>(registry: TRegistry): NormalizedHumanResourcesOperationRegistry<TRegistry> {
	const operationIds = new Set<string>();
	const publicNames = new Set<string>();
	const normalizedEntries: [
		string,
		HumanResourcesOperationDeclaration & { observabilityArea: string },
	][] = [];

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
		normalizedEntries.push([
			publicName,
			Object.freeze({
				...definition,
				observabilityArea:
					definition.observabilityArea ??
					HUMAN_RESOURCES_CAPABILITY_OBSERVABILITY_AREAS[definition.owner],
				sensitivity:
					definition.sensitivity === undefined
						? defaultHumanResourcesOperationSensitivity(
								definition.authorizationPolicy,
							)
						: definition.sensitivity,
				resourceKind: definition.resourceKind ?? null,
			}),
		]);
	}

	const normalized = Object.freeze(Object.fromEntries(normalizedEntries));
	// Every entry is reconstructed above from its declaration with one required,
	// capability-derived observability area while preserving its literal fields.
	return normalized as NormalizedHumanResourcesOperationRegistry<TRegistry>;
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
