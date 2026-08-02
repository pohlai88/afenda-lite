import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type CorporateAdministrationApprovalVerificationDependencies,
	requireCorporateAdministrationPermission,
	verifyCorporateAdministrationApproval,
} from "../authorization";
import { createCorporateAdministrationCommandFingerprint } from "../command-identity";
import type { CorporateAdministrationCommandOptions } from "../command-options";
import { createCorporateAdministrationDomainEventEnvelope } from "../domain-events";
import {
	approvalDecisionIdSchema,
	approvalRequestIdSchema,
	type CommandFingerprint,
	eventIdSchema,
} from "../kernel/brands";
import { toImmutableCanonicalJson } from "../kernel/canonical-json";
import { toCanonicalInstant } from "../kernel/dates";
import type { CorporateAdministrationMutationTable } from "../mutation-tables";
import {
	type CorporateAdministrationCommandId,
	getCorporateAdministrationOperationDefinition,
} from "../operation-registry/registry";
import type { CorporateAdministrationCommandDefinition } from "../operation-registry/types";
import {
	type CorporateAdministrationRuntimePorts,
	type CorporateAdministrationTransactionContext,
	commitCorporateAdministrationTransaction,
	rollbackCorporateAdministrationTransaction,
} from "../ports";

export type CorporateAdministrationCommandKernelDependencies = Readonly<{
	runtime: CorporateAdministrationRuntimePorts;
	createEventId: () => string;
}> &
	CorporateAdministrationApprovalVerificationDependencies;

const authorizedCommandExecution = Symbol(
	"CorporateAdministrationAuthorizedCommandExecution",
);

export type CorporateAdministrationAuthorizedCommandExecution = Readonly<{
	[authorizedCommandExecution]: true;
	operationId: CorporateAdministrationCommandId;
	options: CorporateAdministrationCommandOptions;
}>;

/**
 * Private fail-closed authorization boundary for accepted command input.
 *
 * The returned opaque token binds registry policy, operation identity and
 * trusted request facts. The durable kernel accepts no independent operation
 * ID or options, so authorization cannot drift from persistence semantics.
 */
export async function authorizeCorporateAdministrationCommand(
	operationId: CorporateAdministrationCommandId,
	options: CorporateAdministrationCommandOptions,
): Promise<Result<CorporateAdministrationAuthorizedCommandExecution>> {
	const operation = getCorporateAdministrationOperationDefinition(operationId);
	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission: operation.permission,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}
	return errorResult.ok({
		[authorizedCommandExecution]: true,
		operationId,
		options,
	});
}

export type ExecuteCorporateAdministrationCommandInput<TResult> = Readonly<{
	authorization: CorporateAdministrationAuthorizedCommandExecution;
	fingerprintSchema: z.ZodType;
	fingerprintInput: unknown;
	outputSchema: z.ZodType<TResult>;
	dependencies: CorporateAdministrationCommandKernelDependencies;
	approvalRequirement?: "required" | "not_required" | undefined;
	event: Readonly<{
		operationType: "CREATE" | "UPDATE";
		targetType: Exclude<
			CorporateAdministrationMutationTable,
			"ca_mutation_receipt"
		>;
		aggregateId: (result: TResult) => string;
		aggregateVersion: (result: TResult) => number;
		payload: (
			result: TResult,
			context: Readonly<{
				organizationId: string;
				occurredAt: string;
				actorUserId: string;
				correlationId: string;
				causationId?: string | undefined;
			}>,
		) => unknown;
		safeMetadata?: Readonly<Record<string, string | number | boolean | null>>;
	}>;
	work: (
		transaction: CorporateAdministrationTransactionContext,
		context: Readonly<{ occurredAt: ReturnType<typeof toCanonicalInstant> }>,
	) => Promise<Result<TResult>>;
	serializeResult?: (result: TResult) => unknown;
}>;

export async function executeCorporateAdministrationCommand<TResult>(
	input: ExecuteCorporateAdministrationCommandInput<TResult>,
): Promise<Result<TResult>> {
	const operation = getCorporateAdministrationOperationDefinition(
		input.authorization.operationId,
	);
	let result: Result<TResult>;
	try {
		result = await executeCommand(input, operation);
	} catch (cause: unknown) {
		input.dependencies.runtime.observability.recordOperation({
			operationId: operation.id,
			kind: operation.kind,
			owner: operation.owner,
			observabilityClass: operation.observabilityClass,
			correlationId: input.authorization.options.correlationId,
			outcome: "exception",
		});
		throw cause;
	}

	input.dependencies.runtime.observability.recordOperation(
		result.ok
			? {
					operationId: operation.id,
					kind: operation.kind,
					owner: operation.owner,
					observabilityClass: operation.observabilityClass,
					correlationId: input.authorization.options.correlationId,
					outcome: "success",
				}
			: {
					operationId: operation.id,
					kind: operation.kind,
					owner: operation.owner,
					observabilityClass: operation.observabilityClass,
					correlationId: input.authorization.options.correlationId,
					outcome: "failure",
					errorCode: result.code,
				},
	);
	return result;
}

async function executeCommand<TResult>(
	input: ExecuteCorporateAdministrationCommandInput<TResult>,
	operation: CorporateAdministrationCommandDefinition,
): Promise<Result<TResult>> {
	const { commandIdentity: commandId, eventType } = operation;
	const { options } = input.authorization;
	const aggregateType = getAggregateType(eventType);
	const identity = createCorporateAdministrationCommandFingerprint({
		schema: input.fingerprintSchema,
		organizationId: options.organizationId,
		operationId: input.authorization.operationId,
		input: input.fingerprintInput,
	});
	if (!identity.ok) {
		return identity;
	}
	const approval = await enforceCommandApproval({
		policy: operation.approvalPolicy,
		requirement: input.approvalRequirement,
		dependencies: input.dependencies,
		options,
		commandFingerprint: identity.data.fingerprint,
	});
	if (!approval.ok) {
		return approval;
	}

	const scope = {
		organizationId: options.organizationId,
		commandId,
		idempotencyKey: options.idempotencyKey,
	};
	const reservation = await input.dependencies.runtime.idempotency.begin({
		scope,
		fingerprint: identity.data.fingerprint,
	});
	if (!reservation.ok) {
		return reservation;
	}
	if (reservation.data.status === "replay") {
		const replay = input.outputSchema.safeParse(reservation.data.result);
		return replay.success
			? errorResult.ok(replay.data)
			: errorResult.fail("SERVICE_UNAVAILABLE");
	}
	if (reservation.data.status === "conflict") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration idempotency key was reused with different input.",
		});
	}
	if (reservation.data.status === "in_progress") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration command is already in progress.",
		});
	}

	const acquired = reservation.data;
	const release = async () =>
		input.dependencies.runtime.idempotency.release({
			scope,
			fingerprint: identity.data.fingerprint,
			reservationToken: acquired.reservationToken,
		});

	const occurredAt = toCanonicalInstant(input.dependencies.runtime.clock.now());
	const eventId = eventIdSchema.parse(input.dependencies.createEventId());
	const mutation = await input.dependencies.runtime.transaction.run<TResult>(
		async (transaction) => {
			const result = await input.work(transaction, { occurredAt });
			if (!result.ok) {
				return rollbackCorporateAdministrationTransaction(result);
			}

			const audit = await input.dependencies.runtime.audit.record(
				{
					organizationId: options.organizationId,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					causationId: options.causationId,
					operationType: input.event.operationType,
					targetType: input.event.targetType,
					targetId: input.event.aggregateId(result.data),
					occurredAt,
					outcome: "SUCCESS",
					safeMetadata: input.event.safeMetadata,
				},
				{ transaction },
			);
			if (!audit.ok) {
				return rollbackCorporateAdministrationTransaction(
					asFailure<TResult>(audit),
				);
			}

			const event = createCorporateAdministrationDomainEventEnvelope({
				eventId,
				eventType,
				organizationId: options.organizationId,
				aggregateType,
				aggregateId: input.event.aggregateId(result.data),
				aggregateVersion: input.event.aggregateVersion(result.data),
				occurredAt,
				actorUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				payload: input.event.payload(result.data, {
					organizationId: options.organizationId,
					occurredAt,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					causationId: options.causationId,
				}),
			});
			const outbox = await input.dependencies.runtime.outbox.append([event], {
				transaction,
			});
			if (!outbox.ok) {
				return rollbackCorporateAdministrationTransaction(
					asFailure<TResult>(outbox),
				);
			}

			const completed = await input.dependencies.runtime.idempotency.complete({
				scope,
				fingerprint: identity.data.fingerprint,
				reservationToken: acquired.reservationToken,
				result: toImmutableCanonicalJson(
					input.serializeResult === undefined
						? result.data
						: input.serializeResult(result.data),
				),
				transaction,
			});
			if (!completed.ok) {
				return rollbackCorporateAdministrationTransaction(
					asFailure<TResult>(completed),
				);
			}

			return commitCorporateAdministrationTransaction(result);
		},
	);
	if (!mutation.ok) {
		await release();
		return mutation;
	}

	return mutation;
}

async function enforceCommandApproval(input: {
	policy:
		| "none"
		| "maker_checker_when_configured"
		| "maker_checker_required"
		| "maker_checker_for_protected_role";
	requirement: "required" | "not_required" | undefined;
	dependencies: CorporateAdministrationApprovalVerificationDependencies;
	options: CorporateAdministrationCommandOptions;
	commandFingerprint: CommandFingerprint;
}): Promise<Result<void>> {
	if (input.policy === "none") {
		if (input.requirement !== undefined) {
			throw new TypeError(
				"Corporate Administration approval requirement was supplied for a non-approval operation",
			);
		}
		return errorResult.ok(undefined);
	}

	if (input.policy === "maker_checker_when_configured") {
		if (input.requirement !== undefined) {
			throw new TypeError(
				"Corporate Administration approval requirement cannot override registry policy",
			);
		}
		if (input.dependencies.approvalDecisions === undefined) {
			return errorResult.ok(undefined);
		}
		return verifyApproval(input);
	}

	if (input.policy === "maker_checker_for_protected_role") {
		if (input.requirement === undefined) {
			throw new TypeError(
				"Corporate Administration protected-role approval requirement is missing",
			);
		}
		return input.requirement === "required"
			? verifyApproval(input)
			: errorResult.ok(undefined);
	}

	if (input.requirement !== undefined) {
		throw new TypeError(
			"Corporate Administration approval requirement cannot override registry policy",
		);
	}
	const verification = await verifyApproval(input);
	return verification;
}

function verifyApproval(input: {
	dependencies: CorporateAdministrationApprovalVerificationDependencies;
	options: CorporateAdministrationCommandOptions;
	commandFingerprint: CommandFingerprint;
}): Promise<Result<void>> {
	const approvalRequestId =
		"approvalRequestId" in input.options
			? approvalRequestIdSchema.safeParse(input.options.approvalRequestId)
			: undefined;
	const approvalDecisionId =
		"approvalDecisionId" in input.options
			? approvalDecisionIdSchema.safeParse(input.options.approvalDecisionId)
			: undefined;
	if (
		approvalRequestId === undefined ||
		!approvalRequestId.success ||
		approvalDecisionId === undefined ||
		!approvalDecisionId.success
	) {
		return Promise.resolve(errorResult.fail("FORBIDDEN"));
	}
	return verifyCorporateAdministrationApproval(input.dependencies, {
		organizationId: input.options.organizationId,
		actorUserId: input.options.actorUserId,
		approvalRequestId: approvalRequestId.data,
		approvalDecisionId: approvalDecisionId.data,
		commandFingerprint: input.commandFingerprint,
	});
}

function getAggregateType(eventType: string): string {
	const [, aggregateType] = eventType.split(".");
	if (aggregateType === undefined || aggregateType.length === 0) {
		throw new TypeError(
			`Corporate Administration event type has no aggregate: ${eventType}`,
		);
	}
	return aggregateType;
}

function asFailure<TResult>(result: Result<unknown>): Result<TResult> {
	if (result.ok) {
		throw new TypeError("Expected Corporate Administration failure Result");
	}
	return result;
}
