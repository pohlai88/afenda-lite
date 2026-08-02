import { errorResult, type Result } from "@afenda/errors";
import type {
	TimeApprovalAuthorityAssignment,
	TimePolicy,
	TimePolicyAssignment,
} from "../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { invalidInput } from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_ASSIGN,
	HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_END,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_ASSIGN,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_QUERY_TIME_POLICY_GET,
	HUMAN_RESOURCES_QUERY_TIME_POLICY_RESOLVE,
} from "../../kernel/operations/module-ids";
import { previousIsoDate } from "../../kernel/temporal/effective-dates";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "./run-operation";
import {
	activateTimePolicyInputSchema,
	assignTimeApprovalAuthorityInputSchema,
	assignTimePolicyInputSchema,
	createTimePolicyInputSchema,
	endTimeApprovalAuthorityAssignmentInputSchema,
	getTimePolicyInputSchema,
	resolveTimePolicyInputSchema,
	supersedeTimePolicyInputSchema,
} from "./schema";

export async function createTimePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimePolicy>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: createTimePolicyInputSchema,
		invalidMessage: "Invalid time policy create input",
		command: HUMAN_RESOURCES_COMMAND_TIME_POLICY_CREATE,
		storeMethods: ["createTimePolicy", "findTimePolicyByIdempotencyKey"],
		execute: async (data, { store, ports }) => {
			if (
				data.effectiveTo !== undefined &&
				data.effectiveTo !== null &&
				data.effectiveTo < data.effectiveFrom
			) {
				return invalidInput("effectiveTo must be on or after effectiveFrom");
			}
			const automaticBreakMinutes = data.automaticBreakMinutes ?? 0;
			const automaticBreakAfterMinutes =
				data.automaticBreakAfterMinutes ?? null;
			if (
				(automaticBreakAfterMinutes === null && automaticBreakMinutes !== 0) ||
				(automaticBreakAfterMinutes !== null &&
					automaticBreakMinutes > automaticBreakAfterMinutes)
			) {
				return invalidInput(
					"Automatic break threshold and deduction are inconsistent",
				);
			}
			const fingerprint = JSON.stringify({
				code: data.code,
				name: data.name,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
				minimumRestMinutes: data.minimumRestMinutes,
				automaticBreakAfterMinutes,
				automaticBreakMinutes,
				approvalSteps: data.approvalSteps,
			});
			const existing = await store.findTimePolicyByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existing.data.policy);
			}
			return store.createTimePolicy(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					minimumRestMinutes: data.minimumRestMinutes,
					automaticBreakAfterMinutes,
					automaticBreakMinutes,
					approvalSteps: data.approvalSteps,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function activateTimePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimePolicy>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: activateTimePolicyInputSchema,
		invalidMessage: "Invalid time policy activate input",
		command: HUMAN_RESOURCES_COMMAND_TIME_POLICY_ACTIVATE,
		storeMethods: ["activateTimePolicy"],
		execute: async (data, { store, ports }) =>
			store.activateTimePolicy(data, ports),
	});
}

export async function supersedeTimePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ superseded: TimePolicy; successor: TimePolicy }>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: supersedeTimePolicyInputSchema,
		invalidMessage: "Invalid time policy supersede input",
		command: HUMAN_RESOURCES_COMMAND_TIME_POLICY_SUPERSEDE,
		storeMethods: [
			"findTimePolicyByIdempotencyKey",
			"getTimePolicy",
			"supersedeTimePolicy",
		],
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
		execute: async (data, { store, ports }) => {
			const predecessor = await store.getTimePolicy({
				organizationId: data.organizationId,
				policyId: data.policyId,
			});
			if (!predecessor.ok) {
				return predecessor;
			}
			if (predecessor.data === null) {
				return invalidInput("Time policy to supersede was not found");
			}
			if (data.effectiveFrom <= predecessor.data.effectiveFrom) {
				return invalidInput(
					"Successor effectiveFrom must follow the predecessor",
				);
			}
			if (
				data.effectiveTo !== undefined &&
				data.effectiveTo !== null &&
				data.effectiveTo < data.effectiveFrom
			) {
				return invalidInput("effectiveTo must be on or after effectiveFrom");
			}
			const automaticBreakMinutes = data.automaticBreakMinutes ?? 0;
			const automaticBreakAfterMinutes =
				data.automaticBreakAfterMinutes ?? null;
			if (
				(automaticBreakAfterMinutes === null && automaticBreakMinutes !== 0) ||
				(automaticBreakAfterMinutes !== null &&
					automaticBreakMinutes > automaticBreakAfterMinutes)
			) {
				return invalidInput(
					"Automatic break threshold and deduction are inconsistent",
				);
			}
			const fingerprint = JSON.stringify({
				policyId: data.policyId,
				expectedVersion: data.expectedVersion,
				name: data.name,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
				minimumRestMinutes: data.minimumRestMinutes,
				automaticBreakAfterMinutes,
				automaticBreakMinutes,
				approvalSteps: data.approvalSteps,
			});
			const replay = await store.findTimePolicyByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				if (replay.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				const supersededId = replay.data.policy.supersedesPolicyId;
				if (supersededId === null) {
					return invalidInput("Stored successor has no predecessor");
				}
				const superseded = await store.getTimePolicy({
					organizationId: data.organizationId,
					policyId: supersededId,
				});
				if (!superseded.ok) {
					return superseded;
				}
				if (superseded.data === null) {
					return invalidInput("Stored predecessor was not found");
				}
				return errorResult.ok({
					superseded: superseded.data,
					successor: replay.data.policy,
				});
			}
			return store.supersedeTimePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					expectedVersion: data.expectedVersion,
					code: predecessor.data.code,
					name: data.name,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					predecessorEffectiveTo: previousIsoDate(data.effectiveFrom),
					minimumRestMinutes: data.minimumRestMinutes,
					automaticBreakAfterMinutes,
					automaticBreakMinutes,
					approvalSteps: data.approvalSteps,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function assignTimePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimePolicyAssignment>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: assignTimePolicyInputSchema,
		invalidMessage: "Invalid time policy assignment input",
		command: HUMAN_RESOURCES_COMMAND_TIME_POLICY_ASSIGN,
		storeMethods: ["assignTimePolicy"],
		execute: async (data, { store, ports }) => {
			if (
				data.effectiveTo !== undefined &&
				data.effectiveTo !== null &&
				data.effectiveTo < data.effectiveFrom
			) {
				return await invalidInput(
					"effectiveTo must be on or after effectiveFrom",
				);
			}
			return await store.assignTimePolicy(
				{
					...data,
					effectiveTo: data.effectiveTo ?? null,
				},
				ports,
			);
		},
	});
}

export async function assignTimeApprovalAuthority(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimeApprovalAuthorityAssignment>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: assignTimeApprovalAuthorityInputSchema,
		invalidMessage: "Invalid time approval authority assignment input",
		command: HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_ASSIGN,
		storeMethods: ["assignTimeApprovalAuthority"],
		execute: async (data, { store, ports }) => {
			if (
				data.effectiveTo !== undefined &&
				data.effectiveTo !== null &&
				data.effectiveTo < data.effectiveFrom
			) {
				return await invalidInput(
					"effectiveTo must be on or after effectiveFrom",
				);
			}
			return await store.assignTimeApprovalAuthority(
				{
					organizationId: data.organizationId,
					targetActorUserId: data.targetActorUserId,
					authority: data.authority,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function endTimeApprovalAuthorityAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimeApprovalAuthorityAssignment>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: endTimeApprovalAuthorityAssignmentInputSchema,
		invalidMessage: "Invalid time approval authority end input",
		command: HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_END,
		storeMethods: ["endTimeApprovalAuthorityAssignment"],
		execute: async (data, { store, ports }) =>
			store.endTimeApprovalAuthorityAssignment(data, ports),
	});
}

export async function getTimePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimePolicy | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getTimePolicyInputSchema,
		invalidMessage: "Invalid time policy get input",
		query: HUMAN_RESOURCES_QUERY_TIME_POLICY_GET,
		storeMethods: ["getTimePolicy"],
		execute: async (data, { store }) => store.getTimePolicy(data),
	});
}

export async function resolveTimePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimePolicy | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: resolveTimePolicyInputSchema,
		invalidMessage: "Invalid time policy resolve input",
		query: HUMAN_RESOURCES_QUERY_TIME_POLICY_RESOLVE,
		storeMethods: ["resolveTimePolicy"],
		execute: async (data, { store }) => store.resolveTimePolicy(data),
	});
}
