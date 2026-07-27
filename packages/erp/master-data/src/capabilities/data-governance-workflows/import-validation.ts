/**
 * ## Validation Requirements
 *
 * Import validation should include:
 *
 * - file type and payload limits
 * - required-column checks
 * - row schema parsing
 * - code and value normalization
 * - platform-reference resolution
 * - organization-master reference resolution
 * - deterministic target matching
 * - mutable-field allowlist validation
 * - duplicate records within the batch
 * - duplicate conflicts against current masters
 * - operation-mode compatibility
 * - lifecycle compatibility
 * - cross-organization reference rejection
 * - prospective uniqueness checks
 *
 * Validation findings should be classified as:
 *
 * ```text
 * error
 * warning
 * information
 * ```
 *
 * Errors block approval and application.
 *
 * Warnings require acknowledgement or review according to policy.
 */
import { ok, type Result } from "@afenda/errors/result";

import {
	type ImportValidationFailureFinding,
	importValidationFailed,
} from "./governance-errors";
import type { ImportValidationFinding } from "./import-types";

export const MAX_IMPORT_FINDINGS_RETURNED = 100 as const;

export type ImportValidationSummary = Readonly<{
	errorCount: number;
	warningCount: number;
	informationCount: number;
	totalCount: number;
	errors: readonly ImportValidationFinding[];
	warnings: readonly ImportValidationFinding[];
	information: readonly ImportValidationFinding[];
	approvalBlocked: boolean;
	warningAcknowledgementRequired: boolean;
}>;

export type ImportWarningPolicy = Readonly<{
	requireAcknowledgement: boolean;
	blockApprovalUntilAcknowledged: boolean;
}>;

const DEFAULT_IMPORT_WARNING_POLICY = {
	requireAcknowledgement: true,
	blockApprovalUntilAcknowledged: true,
} as const satisfies ImportWarningPolicy;

export function summarizeImportFindings(
	findings: readonly ImportValidationFinding[],
	warningPolicy: ImportWarningPolicy = DEFAULT_IMPORT_WARNING_POLICY,
): ImportValidationSummary {
	const errors: ImportValidationFinding[] = [];
	const warnings: ImportValidationFinding[] = [];
	const information: ImportValidationFinding[] = [];

	for (const finding of findings) {
		switch (finding.severity) {
			case "error":
				errors.push(finding);
				break;
			case "warning":
				warnings.push(finding);
				break;
			case "information":
				information.push(finding);
				break;
			default:
				assertNever(finding.severity);
		}
	}

	const warningAcknowledgementRequired =
		warningPolicy.requireAcknowledgement && warnings.length > 0;

	return {
		errorCount: errors.length,
		warningCount: warnings.length,
		informationCount: information.length,
		totalCount: findings.length,
		errors,
		warnings,
		information,
		approvalBlocked:
			errors.length > 0 ||
			(warningPolicy.blockApprovalUntilAcknowledged &&
				warningAcknowledgementRequired),
		warningAcknowledgementRequired,
	};
}

export function assertImportValidationAllowsApproval(input: {
	batchId: string;
	findings: readonly ImportValidationFinding[];
	warningsAcknowledged: boolean;
	warningPolicy?: ImportWarningPolicy;
}): Result<true> {
	const warningPolicy = input.warningPolicy ?? DEFAULT_IMPORT_WARNING_POLICY;
	const summary = summarizeImportFindings(input.findings, warningPolicy);

	if (summary.errorCount > 0) {
		return importValidationFailed({
			operation: "import_batch.approve",
			entityId: input.batchId,
			errorCount: summary.errorCount,
			warningCount: summary.warningCount,
			findings: boundFindings(summary.errors),
		});
	}

	if (summary.warningAcknowledgementRequired && !input.warningsAcknowledged) {
		return importValidationFailed({
			operation: "import_batch.approve",
			entityId: input.batchId,
			errorCount: 0,
			warningCount: summary.warningCount,
			warningAcknowledgementRequired: true,
			findings: boundFindings(summary.warnings),
		});
	}

	return ok(true);
}

export function assertImportValidationAllowsApplication(input: {
	batchId: string;
	findings: readonly ImportValidationFinding[];
	warningsAcknowledged: boolean;
	warningPolicy?: ImportWarningPolicy;
}): Result<true> {
	return assertImportValidationAllowsApproval(input);
}

export function assertNoImportValidationErrors(
	findings: readonly ImportValidationFinding[],
): Result<true> {
	const summary = summarizeImportFindings(findings, {
		requireAcknowledgement: false,
		blockApprovalUntilAcknowledged: false,
	});

	if (summary.errorCount === 0) {
		return ok(true);
	}

	return importValidationFailed({
		operation: "import.validation",
		entityId: "import.validation",
		errorCount: summary.errorCount,
		warningCount: summary.warningCount,
		findings: boundFindings(summary.errors),
	});
}

function boundFindings(
	findings: readonly ImportValidationFinding[],
): readonly ImportValidationFailureFinding[] {
	return findings.slice(0, MAX_IMPORT_FINDINGS_RETURNED).map(normalizeFinding);
}

function normalizeFinding(
	finding: ImportValidationFinding,
): ImportValidationFailureFinding {
	return {
		severity: finding.severity,
		code: finding.code.trim(),
		message: finding.message.trim(),
		...(finding.field?.trim() ? { field: finding.field.trim() } : {}),
		...(finding.rowNumber !== undefined
			? { rowNumber: finding.rowNumber }
			: {}),
	};
}

function assertNever(value: never): never {
	throw new Error(`Unsupported import finding severity: ${String(value)}`);
}
