import { errorResult, type Result } from "@afenda/errors";

import {
	governanceFieldsForbidden,
	governancePolicyMismatch,
} from "./governance-errors";
import type { GovernancePermission } from "./permissions";

export const GOVERNANCE_FIELD_DENYLIST = [
	"organizationId",
	"id",
	"version",
	"createdAt",
	"createdBy",
	"updatedAt",
	"updatedBy",
	"mergedIntoId",
	"calculated",
	"status",
	"lifecycleState",
] as const;

export type GovernanceDeniedField = (typeof GOVERNANCE_FIELD_DENYLIST)[number];

const GOVERNANCE_FIELD_DENYSET: ReadonlySet<string> = new Set(
	GOVERNANCE_FIELD_DENYLIST,
);

const STABLE_DOMAIN_FIELD_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

export const GOVERNANCE_SENSITIVITY_LEVELS = [
	"standard",
	"sensitive",
	"restricted",
] as const;

export type GovernanceSensitivityLevel =
	(typeof GOVERNANCE_SENSITIVITY_LEVELS)[number];

export type MutableFieldAllowlist = Readonly<{
	id: string;
	version: number;
	entityType: string;
	operation: string;
	workflowType: string;
	actorPermission: GovernancePermission;
	lifecycleState?: string;
	governanceSensitivityLevel: GovernanceSensitivityLevel;
	fields: readonly string[];
	deprecatedFields?: readonly string[];
}>;

export type MutableFieldPolicyContext = Readonly<{
	entityType: string;
	operation: string;
	workflowType: string;
	actorPermission: GovernancePermission;
	lifecycleState?: string;
	governanceSensitivityLevel: GovernanceSensitivityLevel;
}>;

export type MutableFieldAllowlistDefinitionIssue = Readonly<{
	kind:
		| "required_value"
		| "invalid_version"
		| "duplicate_active_field"
		| "duplicate_deprecated_field"
		| "active_deprecated_overlap"
		| "invalid_field_identifier"
		| "denied_active_field";
	field: string;
}>;

export function defineMutableFieldAllowlist<
	const TPolicy extends MutableFieldAllowlist,
>(policy: TPolicy): TPolicy {
	const issues = inspectMutableFieldAllowlist(policy);
	if (issues.length > 0) {
		throw new Error(formatAllowlistDefinitionError(policy.id, issues));
	}
	return policy;
}

export function validateMutableFieldAllowlist(
	policy: MutableFieldAllowlist,
): Result<true> {
	const issues = inspectMutableFieldAllowlist(policy);
	if (issues.length > 0) {
		return governanceFieldsForbidden({
			policyId: normalizedPolicyId(policy.id),
			fields: uniqueSorted(issues.map((issue) => issue.field)),
		});
	}
	return errorResult.ok(true);
}

export function assertMutableFieldsAllowed(input: {
	allowlist: MutableFieldAllowlist;
	context: MutableFieldPolicyContext;
	fields: readonly string[];
}): Result<true> {
	const { allowlist, context } = input;
	const actualContext = policyContextFromAllowlist(allowlist);

	if (!mutablePolicyContextsMatch(actualContext, context)) {
		return governancePolicyMismatch({
			policyId: allowlist.id,
			expected: context,
			actual: actualContext,
		});
	}

	const allowed = new Set(allowlist.fields);
	const deprecated = new Set(allowlist.deprecatedFields ?? []);
	const duplicateRequestedFields = collectDuplicates(input.fields);
	const forbidden = uniqueSorted([
		...duplicateRequestedFields,
		...input.fields.filter(
			(field) =>
				!isStableDomainField(field) ||
				GOVERNANCE_FIELD_DENYSET.has(field) ||
				deprecated.has(field) ||
				!allowed.has(field),
		),
	]);

	if (forbidden.length > 0) {
		return governanceFieldsForbidden({
			policyId: allowlist.id,
			fields: forbidden,
		});
	}

	return errorResult.ok(true);
}

export function inspectMutableFieldAllowlist(
	policy: MutableFieldAllowlist,
): readonly MutableFieldAllowlistDefinitionIssue[] {
	const issues: MutableFieldAllowlistDefinitionIssue[] = [];

	for (const [field, value] of [
		["id", policy.id],
		["entityType", policy.entityType],
		["operation", policy.operation],
		["workflowType", policy.workflowType],
		["actorPermission", policy.actorPermission],
	] as const) {
		if (!isNonBlank(value)) {
			issues.push({ kind: "required_value", field });
		}
	}

	if (!isPositiveVersion(policy.version)) {
		issues.push({ kind: "invalid_version", field: "version" });
	}

	if (
		policy.lifecycleState !== undefined &&
		!isNonBlank(policy.lifecycleState)
	) {
		issues.push({ kind: "required_value", field: "lifecycleState" });
	}

	const activeFields = unique(policy.fields);
	const deprecatedFields = unique(policy.deprecatedFields ?? []);
	const activeFieldSet = new Set(activeFields);

	for (const field of collectDuplicates(policy.fields)) {
		issues.push({ kind: "duplicate_active_field", field });
	}

	for (const field of collectDuplicates(policy.deprecatedFields ?? [])) {
		issues.push({ kind: "duplicate_deprecated_field", field });
	}

	for (const field of deprecatedFields) {
		if (activeFieldSet.has(field)) {
			issues.push({ kind: "active_deprecated_overlap", field });
		}
	}

	for (const field of [...activeFields, ...deprecatedFields]) {
		if (!isStableDomainField(field)) {
			issues.push({ kind: "invalid_field_identifier", field });
		}
	}

	for (const field of activeFields) {
		if (GOVERNANCE_FIELD_DENYSET.has(field)) {
			issues.push({ kind: "denied_active_field", field });
		}
	}

	return sortDefinitionIssues(issues);
}

function policyContextFromAllowlist(
	allowlist: MutableFieldAllowlist,
): MutableFieldPolicyContext {
	return {
		entityType: allowlist.entityType,
		operation: allowlist.operation,
		workflowType: allowlist.workflowType,
		actorPermission: allowlist.actorPermission,
		...(allowlist.lifecycleState === undefined
			? {}
			: { lifecycleState: allowlist.lifecycleState }),
		governanceSensitivityLevel: allowlist.governanceSensitivityLevel,
	};
}

function mutablePolicyContextsMatch(
	actual: MutableFieldPolicyContext,
	expected: MutableFieldPolicyContext,
): boolean {
	return (
		actual.entityType === expected.entityType &&
		actual.operation === expected.operation &&
		actual.workflowType === expected.workflowType &&
		actual.actorPermission === expected.actorPermission &&
		actual.lifecycleState === expected.lifecycleState &&
		actual.governanceSensitivityLevel === expected.governanceSensitivityLevel
	);
}

function isStableDomainField(field: string): boolean {
	return STABLE_DOMAIN_FIELD_PATTERN.test(field);
}

function isNonBlank(value: string): boolean {
	return value.trim().length > 0;
}

function isPositiveVersion(value: number): boolean {
	return Number.isSafeInteger(value) && value >= 1;
}

function collectDuplicates(fields: readonly string[]): readonly string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const field of fields) {
		if (seen.has(field)) {
			duplicates.add(field);
		} else {
			seen.add(field);
		}
	}

	return [...duplicates].sort();
}

function unique(values: readonly string[]): readonly string[] {
	return [...new Set(values)];
}

function uniqueSorted(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort();
}

function normalizedPolicyId(policyId: string): string {
	const normalized = policyId.trim();
	return normalized || "mutable_field_allowlist";
}

function sortDefinitionIssues(
	issues: readonly MutableFieldAllowlistDefinitionIssue[],
): readonly MutableFieldAllowlistDefinitionIssue[] {
	return [...issues].sort((left, right) => {
		const fieldComparison = left.field.localeCompare(right.field);
		if (fieldComparison !== 0) {
			return fieldComparison;
		}
		return left.kind.localeCompare(right.kind);
	});
}

function formatAllowlistDefinitionError(
	policyId: string,
	issues: readonly MutableFieldAllowlistDefinitionIssue[],
): string {
	const issueText = issues
		.map((issue) => `${issue.kind}:${issue.field}`)
		.join(", ");

	return [
		`Invalid mutable-field allowlist "${normalizedPolicyId(policyId)}"`,
		issueText,
	].join(": ");
}
