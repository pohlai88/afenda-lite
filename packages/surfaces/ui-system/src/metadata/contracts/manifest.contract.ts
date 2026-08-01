import {
	type ComponentConsumerEnforcement,
	type ComponentContractInput,
	type ComponentContractOwnership,
	defineComponentContract,
	type NonEmptyReadonlyArray,
	type UsageRule,
} from "../contract";

export const UI_COMPONENT_CONTRACT_STANDARD =
	"afenda.ui-component-contract/v1" as const;

export type ManifestContractInput = Omit<
	ComponentContractInput,
	"standard" | "ownership" | "semanticBoundaries"
> &
	Readonly<{
		ownership: ComponentContractOwnership;
		/** Interpretations or decisions that the component must not imply. */
		semanticBoundaries: NonEmptyReadonlyArray<string>;
	}>;

function normalizeClause(value: string): string {
	const normalized = value.trim().replace(/\s+/g, " ");
	if (normalized.length === 0) {
		throw new Error("Component contract clauses must not be empty.");
	}
	return normalized;
}

function normalizeClauses(
	values: NonEmptyReadonlyArray<string>,
): NonEmptyReadonlyArray<string> {
	const normalized: [string, ...string[]] = [
		normalizeClause(values[0]),
		...values.slice(1).map(normalizeClause),
	];
	const seen = new Set<string>();
	for (const clause of normalized) {
		const duplicateKey = clause.toLocaleLowerCase("en-US");
		if (seen.has(duplicateKey)) {
			throw new Error(`Duplicate component contract clause: "${clause}"`);
		}
		seen.add(duplicateKey);
	}
	return Object.freeze(normalized);
}

function normalizeUsageRule(rule: UsageRule): UsageRule {
	return Object.freeze({
		meaning: normalizeClause(rule.meaning),
		allowedWhen: normalizeClauses(rule.allowedWhen),
		...(rule.prohibitedWhen
			? { prohibitedWhen: normalizeClauses(rule.prohibitedWhen) }
			: {}),
	});
}

type NormalizedUsageRules<TRules extends Readonly<Record<string, UsageRule>>> =
	Readonly<{ [TName in keyof TRules]: UsageRule }>;

function normalizeUsageRules<
	const TRules extends Readonly<Record<string, UsageRule>>,
>(rules: TRules): NormalizedUsageRules<TRules> {
	const normalized: Record<string, UsageRule> = {};
	for (const [name, rule] of Object.entries(rules)) {
		normalized[name] = normalizeUsageRule(rule);
	}
	return Object.freeze(normalized) as NormalizedUsageRules<TRules>;
}

function normalizeOwnership(
	ownership: ComponentContractOwnership,
): ComponentContractOwnership {
	return Object.freeze({
		componentOwns: normalizeClauses(ownership.componentOwns),
		consumerOwns: normalizeClauses(ownership.consumerOwns),
	});
}

const TYPESCRIPT_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

function normalizeConsumerEnforcement(
	enforcement: ComponentConsumerEnforcement,
): ComponentConsumerEnforcement {
	const names = normalizeClauses(enforcement.forbiddenLocalComponentNames);
	for (const name of names) {
		if (!TYPESCRIPT_IDENTIFIER_PATTERN.test(name)) {
			throw new Error(
				`Forbidden local component name must be a TypeScript identifier: "${name}"`,
			);
		}
	}
	return Object.freeze({ forbiddenLocalComponentNames: names });
}

/**
 * Mandatory internal authoring gateway for Afenda UI component contracts.
 * Registration, lifecycle, evidence, discovery, and implementation parity remain
 * owned by the catalogue and governance validator.
 */
export function defineManifestContract<
	const TInput extends ManifestContractInput,
>(input: TInput) {
	return Object.freeze(
		defineComponentContract({
			standard: UI_COMPONENT_CONTRACT_STANDARD,
			id: input.id,
			component: input.component,
			purpose: normalizeClause(input.purpose),
			ownership: normalizeOwnership(input.ownership),
			semanticBoundaries: normalizeClauses(input.semanticBoundaries),
			...(input.consumerEnforcement
				? {
						consumerEnforcement: normalizeConsumerEnforcement(
							input.consumerEnforcement,
						),
					}
				: {}),
			...(input.approvedVariants
				? { approvedVariants: normalizeUsageRules(input.approvedVariants) }
				: {}),
			...(input.approvedSizes
				? { approvedSizes: normalizeUsageRules(input.approvedSizes) }
				: {}),
			rules: normalizeClauses(input.rules),
			accessibility: normalizeClauses(input.accessibility),
			prohibitedUsage: normalizeClauses(input.prohibitedUsage),
		}),
	);
}
