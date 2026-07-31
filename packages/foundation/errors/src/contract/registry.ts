/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	HISTORICAL_ERROR_ALIASES,
	RESERVED_HISTORICAL_ERROR_NAMES,
} from "./aliases";
import type { ErrorDefinition, PublicMessagePolicy } from "./define-error";
import { ACCESS_ERROR_DEFINITIONS } from "./definitions/access";
import { AVAILABILITY_ERROR_DEFINITIONS } from "./definitions/availability";
import { CONCURRENCY_ERROR_DEFINITIONS } from "./definitions/concurrency";
import { INTERNAL_ERROR_DEFINITIONS } from "./definitions/internal";
import { REQUEST_ERROR_DEFINITIONS } from "./definitions/request";
import { RESOURCE_ERROR_DEFINITIONS } from "./definitions/resource";
import type { PublicDetailsContract } from "./details";
import { assertErrorRegistry } from "./invariants";

const EXPECTED_CANONICAL_ERROR_CODES = [
	"BAD_REQUEST",
	"UNAUTHORIZED",
	"FORBIDDEN",
	"NOT_FOUND",
	"CONFLICT",
	"CONCURRENCY_CONFLICT",
	"VALIDATION_ERROR",
	"RATE_LIMITED",
	"INTERNAL_ERROR",
	"SERVICE_UNAVAILABLE",
] as const;

type ExpectedCanonicalErrorCode =
	(typeof EXPECTED_CANONICAL_ERROR_CODES)[number];

type RegistryDefinition = ErrorDefinition<
	string,
	`errors.${string}`,
	PublicDetailsContract<string, unknown, unknown, string | null>,
	PublicMessagePolicy
>;

type CompleteRegistryShape = Readonly<{
	[Code in ExpectedCanonicalErrorCode]: RegistryDefinition &
		Readonly<{ code: Code }>;
}>;

type ExactRegistry<Registry extends CompleteRegistryShape> = Registry &
	Readonly<Record<Exclude<keyof Registry, ExpectedCanonicalErrorCode>, never>>;

function freezeCanonicalRegistry<const Registry extends CompleteRegistryShape>(
	registry: ExactRegistry<Registry>,
): Registry {
	const orderedEntries = EXPECTED_CANONICAL_ERROR_CODES.map(
		(code) => [code, registry[code]] as const,
	);
	return Object.freeze(Object.fromEntries(orderedEntries)) as Registry;
}

/**
 * Validates authored registry extensions before producing canonical runtime
 * data. The built-in registry is separately contract-tested and can use the
 * lightweight freezer so consumers do not bundle maintainer-only assertions.
 */
export function defineErrorRegistry<
	const Registry extends CompleteRegistryShape,
>(registry: ExactRegistry<Registry>): Registry {
	assertErrorRegistry(
		registry,
		EXPECTED_CANONICAL_ERROR_CODES,
		HISTORICAL_ERROR_ALIASES,
		RESERVED_HISTORICAL_ERROR_NAMES,
	);
	return freezeCanonicalRegistry(registry);
}

export const ERROR_REGISTRY = freezeCanonicalRegistry({
	...ACCESS_ERROR_DEFINITIONS,
	...REQUEST_ERROR_DEFINITIONS,
	...RESOURCE_ERROR_DEFINITIONS,
	...CONCURRENCY_ERROR_DEFINITIONS,
	...AVAILABILITY_ERROR_DEFINITIONS,
	...INTERNAL_ERROR_DEFINITIONS,
});

export type RegistryErrorCode = keyof typeof ERROR_REGISTRY;

export const CANONICAL_ERROR_CODES = Object.freeze([
	...EXPECTED_CANONICAL_ERROR_CODES,
]) as readonly RegistryErrorCode[];

const CANONICAL_ERROR_CODE_SET: ReadonlySet<string> = new Set(
	CANONICAL_ERROR_CODES,
);

export function isCanonicalErrorCode(
	value: unknown,
): value is RegistryErrorCode {
	return typeof value === "string" && CANONICAL_ERROR_CODE_SET.has(value);
}

export function getErrorDefinition<Code extends RegistryErrorCode>(
	code: Code,
): (typeof ERROR_REGISTRY)[Code] {
	return ERROR_REGISTRY[code];
}
