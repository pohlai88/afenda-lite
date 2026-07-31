import { errorResult, type Result } from "@afenda/errors";

import type {
	HumanResourcesAuthorizationDenyCode,
	HumanResourcesOperationId,
	HumanResourcesOperationKind,
} from "../shared/authorization-types";
import type { HrObservabilityPorts } from "./ports";
import {
	recordHrAuthorizationDenial,
	recordHrCommand,
	recordHrPrivacyOperation,
} from "./recorder";
import type {
	HrAuthorizationReason,
	HrFailureReason,
	HrObservabilityArea,
	HrPrivacyOperation,
} from "./types";

const COMPENSATION_SUBJECTS = new Set([
	"approved-compensation-handoff",
	"benefit-enrollment",
	"benefit-enrollment-dependent",
	"benefit-plan",
	"compensation-grade",
	"compensation-grade-progression-rule",
	"compensation-grade-progression-targets",
	"compensation-proposal",
	"compensation-review",
	"compensation-review-cycle",
	"employee-compensation",
	"salary-band",
]);

const LEAVE_SUBJECTS = new Set([
	"approved-leave-handoff",
	"leave-balance",
	"leave-entitlement",
	"leave-policy",
	"leave-request",
]);

const PAYROLL_DELIVERY_SUBJECTS = new Set([
	"approved-payroll-handoff",
	"offboarding-payroll-handoff",
]);

const TIME_SUBJECTS = new Set([
	"approved-time-handoff",
	"attendance",
	"attendance-adjustment",
	"attendance-break-waiver",
	"attendance-break-waiver-decision",
	"attendance-event",
	"attendance-events",
	"attendance-exception",
	"attendance-session",
	"employee-work-calendar",
	"employment-calendar",
	"overtime-request",
	"session",
	"shift",
	"shift-assignment",
	"time-approval-authority",
	"time-policy",
	"timesheet",
	"timesheet-approval-decision",
	"work-calendar",
]);

const TALENT_SUBJECTS = new Set([
	"career-plan",
	"career-plan-action",
	"certification",
	"competency",
	"competency-assessment",
	"completion",
	"course",
	"critical-role-readiness",
	"employee-competency-profile",
	"employee-performance-history",
	"improvement-plan",
	"job-competency",
	"learning-assignment",
	"learning-attendance",
	"performance-cycle",
	"performance-goal",
	"performance-review",
	"position-succession-coverage",
	"succession-candidate",
	"succession-plan",
	"talent-pool",
	"talent-pool-member",
	"talent-profile",
	"talent-profile-assessment",
	"talent-profile-mobility",
]);

const COMPLIANCE_SUBJECTS = new Set([
	"clearance",
	"compliance",
	"document-requirement",
	"employee-case",
	"employee-compliance-summary",
	"employee-document",
	"employee-relations",
	"policy-acknowledgement",
	"work-eligibility",
]);

function operationSubject(operationId: HumanResourcesOperationId): string {
	return operationId.split(".")[1] ?? "";
}

export function resolveHrOperationArea(
	operationId: HumanResourcesOperationId,
): HrObservabilityArea {
	const subject = operationSubject(operationId);
	if (PAYROLL_DELIVERY_SUBJECTS.has(subject)) {
		return "payroll_delivery";
	}
	if (COMPENSATION_SUBJECTS.has(subject)) {
		return "compensation";
	}
	if (LEAVE_SUBJECTS.has(subject)) {
		return "leave";
	}
	if (TIME_SUBJECTS.has(subject)) {
		return "time";
	}
	if (TALENT_SUBJECTS.has(subject)) {
		return "talent";
	}
	if (COMPLIANCE_SUBJECTS.has(subject)) {
		return "compliance";
	}
	if (subject === "privacy") {
		return "privacy";
	}
	return "workforce";
}

export function classifyHrOperationFailure(code: string): HrFailureReason {
	switch (code) {
		case "BAD_REQUEST":
		case "VALIDATION_ERROR":
			return "validation";
		case "UNAUTHORIZED":
		case "FORBIDDEN":
			return "authorization";
		case "NOT_FOUND":
			return "not_found";
		case "CONFLICT":
			return "conflict";
		case "RATE_LIMITED":
		case "SERVICE_UNAVAILABLE":
			return "unavailable";
		case "INTERNAL_ERROR":
			return "persistence";
		default:
			return "unknown";
	}
}

function denyCodeFromDetails(
	details: unknown,
): HumanResourcesAuthorizationDenyCode | undefined {
	if (details === null || typeof details !== "object") {
		return;
	}
	const value = readProperty(details, "denyCode");
	switch (value) {
		case "permission_denied":
		case "cross_tenant":
		case "resource_context_required":
		case "subject_scope_denied":
		case "policy_not_registered":
		case "ambiguous_policy":
		case "field_access_denied":
			return value;
		default:
			return;
	}
}

function readProperty(value: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(value, key);
	} catch {
		// Authorization details are untrusted and may expose throwing accessors.
	}
}

export function classifyHrAuthorizationDenial(
	denyCode: HumanResourcesAuthorizationDenyCode | undefined,
): HrAuthorizationReason {
	switch (denyCode) {
		case "permission_denied":
			return "permission_missing";
		case "cross_tenant":
			return "tenant_mismatch";
		case "resource_context_required":
		case "subject_scope_denied":
		case "field_access_denied":
			return "sensitive_scope_missing";
		default:
			return "policy_denied";
	}
}

export function authorizationReasonFromFailure(
	result: Extract<Result<unknown>, { ok: false }>,
): HrAuthorizationReason {
	const denyCode = denyCodeFromDetails(errorResult.context(result));
	if (denyCode !== undefined) {
		return classifyHrAuthorizationDenial(denyCode);
	}
	return result.code === "UNAUTHORIZED" || result.code === "FORBIDDEN"
		? "permission_missing"
		: "policy_denied";
}

async function ignoreTelemetryFailure(
	record: () => void | Promise<void>,
): Promise<void> {
	try {
		await record();
	} catch {
		// Telemetry is best-effort and cannot replace the domain operation result.
	}
}

export async function recordAuthorizedOperationTelemetry(input: {
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	observability: HrObservabilityPorts | undefined;
	startedAtMs: number;
	outcome: "success" | "failure";
	failureReason?: HrFailureReason;
	authorizationReason?: HrAuthorizationReason;
}): Promise<void> {
	const { authorizationReason, observability } = input;
	if (observability === undefined) {
		return;
	}
	const area = resolveHrOperationArea(input.operationId);
	if (authorizationReason !== undefined) {
		await ignoreTelemetryFailure(() =>
			recordHrAuthorizationDenial(
				{ area, reason: authorizationReason },
				observability,
			),
		);
	}
	if (input.operationKind !== "command") {
		return;
	}
	await ignoreTelemetryFailure(() =>
		recordHrCommand(
			{
				area,
				outcome: input.outcome,
				durationMs: Math.max(0, Date.now() - input.startedAtMs),
				...(input.failureReason === undefined
					? {}
					: { failureReason: input.failureReason }),
			},
			observability,
		),
	);
}

export async function observeAuthorizedOperationResult<T>(input: {
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	observability: HrObservabilityPorts | undefined;
	startedAtMs: number;
	result: Result<T>;
	authorizationReason?: HrAuthorizationReason;
}): Promise<Result<T>> {
	await recordAuthorizedOperationTelemetry({
		operationId: input.operationId,
		operationKind: input.operationKind,
		observability: input.observability,
		startedAtMs: input.startedAtMs,
		outcome: input.result.ok ? "success" : "failure",
		...(input.result.ok
			? {}
			: { failureReason: classifyHrOperationFailure(input.result.code) }),
		...(input.authorizationReason === undefined
			? {}
			: { authorizationReason: input.authorizationReason }),
	});
	return input.result;
}

export async function observeHrPrivacyOperationResult<T>(input: {
	operation: HrPrivacyOperation;
	observability: HrObservabilityPorts | undefined;
	result: Result<T>;
}): Promise<Result<T>> {
	const { observability } = input;
	if (observability === undefined) {
		return input.result;
	}
	await ignoreTelemetryFailure(() =>
		recordHrPrivacyOperation(
			input.result.ok
				? { operation: input.operation, outcome: "success" }
				: {
						operation: input.operation,
						outcome: "failure",
						failureReason: classifyHrOperationFailure(input.result.code),
					},
			observability,
		),
	);
	return input.result;
}
