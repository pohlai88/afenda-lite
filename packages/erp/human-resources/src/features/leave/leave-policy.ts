import { errorResult, type Result } from "@afenda/errors";
import type {
	LeavePolicy,
	LeavePolicyListPage,
	ResolvedLeavePolicy,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintLeavePolicyCreate } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE,
} from "../../kernel/operations/module-ids";
import { resolveLeavePolicyBalanceRulesFromInput } from "./policy-balance-rules";
import {
	runLeaveCapabilityCommand,
	runLeaveCapabilityQuery,
} from "./run-operation";
import {
	archiveLeavePolicyInputSchema,
	createLeavePolicyInputSchema,
	getLeavePolicyInputSchema,
	listLeavePoliciesInputSchema,
	publishLeavePolicyInputSchema,
	resolveApplicableLeavePolicyInputSchema,
	supersedeLeavePolicyInputSchema,
	updateLeavePolicyInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_LEAVE_POLICY = "leave_policy" as const;
export type HumanResourcesLeavePolicyAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_POLICY;

export async function createLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: createLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy create input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
		storeMethods: ["findLeavePolicyByCode", "createLeavePolicy"],
		execute: async (data, { store, ports }) => {
			const _fingerprint = fingerprintLeavePolicyCreate({
				code: data.code,
				name: data.name,
				leaveType: data.leaveType,
				unit: data.unit,
				effectiveFrom: data.effectiveFrom,
			});
			const existing = await store.findLeavePolicyByCode({
				organizationId: data.organizationId,
				code: data.code,
				effectiveFrom: data.effectiveFrom,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			return store.createLeavePolicy(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					leaveType: data.leaveType,
					unit: data.unit,
					paid: data.paid,
					sensitive: data.sensitive ?? false,
					allowsNegativeBalance: data.allowsNegativeBalance ?? false,
					allowSelfApproval: data.allowSelfApproval ?? false,
					allowsPartialDay: data.allowsPartialDay ?? false,
					...resolveLeavePolicyBalanceRulesFromInput(data),
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					minTenureDays: data.minTenureDays ?? null,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
				}),
			);
		},
	});
}

export async function updateLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: updateLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy update input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
		storeMethods: ["updateLeavePolicy"],
		execute: (data, { store, ports }) =>
			store.updateLeavePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					name: data.name,
					paid: data.paid,
					sensitive: data.sensitive,
					allowsNegativeBalance: data.allowsNegativeBalance,
					allowSelfApproval: data.allowSelfApproval,
					allowsPartialDay: data.allowsPartialDay,
					accrualBasis: data.accrualBasis,
					accrualFrequency: data.accrualFrequency,
					accrualQuantityPerPeriod: data.accrualQuantityPerPeriod,
					carryForwardEnabled: data.carryForwardEnabled,
					carryForwardMaxQuantity: data.carryForwardMaxQuantity,
					entitlementExpiryRule: data.entitlementExpiryRule,
					entitlementExpiryDays: data.entitlementExpiryDays,
					effectiveTo: data.effectiveTo,
					minTenureDays: data.minTenureDays,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
				}),
			),
	});
}

export async function publishLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: publishLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy publish input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
		storeMethods: ["publishLeavePolicy"],
		execute: (data, { store, ports }) =>
			store.publishLeavePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
				}),
			),
	});
}

export async function supersedeLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: supersedeLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy supersede input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
		storeMethods: ["supersedeLeavePolicy"],
		execute: (data, { store, ports }) =>
			store.supersedeLeavePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					code: data.code,
					name: data.name,
					leaveType: data.leaveType,
					unit: data.unit,
					paid: data.paid,
					sensitive: data.sensitive ?? false,
					allowsNegativeBalance: data.allowsNegativeBalance ?? false,
					allowSelfApproval: data.allowSelfApproval ?? false,
					allowsPartialDay: data.allowsPartialDay ?? false,
					...resolveLeavePolicyBalanceRulesFromInput(data),
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					minTenureDays: data.minTenureDays ?? null,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
				}),
			),
	});
}

export async function archiveLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: archiveLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy archive input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
		storeMethods: ["archiveLeavePolicy"],
		execute: (data, { store, ports }) =>
			store.archiveLeavePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
				}),
			),
	});
}

export async function getLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: getLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET,
		storeMethods: ["getLeavePolicyById"],
		execute: (data, { store }) =>
			store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: data.policyId,
			}),
	});
}

export async function listLeavePolicies(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicyListPage>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: listLeavePoliciesInputSchema,
		invalidMessage: "Invalid leave policy list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST,
		storeMethods: ["listLeavePolicies"],
		execute: (data, { store }) =>
			store.listLeavePolicies({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}

export async function resolveApplicableLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ResolvedLeavePolicy | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: resolveApplicableLeavePolicyInputSchema,
		invalidMessage: "Invalid resolve applicable leave policy input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE,
		storeMethods: ["resolveApplicableLeavePolicy"],
		execute: (data, { store }) =>
			store.resolveApplicableLeavePolicy({
				organizationId: data.organizationId,
				policyCode: data.policyCode,
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				asOfDate: data.asOfDate,
			}),
	});
}
