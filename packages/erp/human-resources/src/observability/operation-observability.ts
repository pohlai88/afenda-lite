import { errorResult, type Result } from "@afenda/errors";
import { getHumanResourcesOperationDefinition } from "../operation-registry/registry";
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

export function resolveHrOperationArea(
	operationId: HumanResourcesOperationId,
): HrObservabilityArea {
	return getHumanResourcesOperationDefinition(operationId).observabilityArea;
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
