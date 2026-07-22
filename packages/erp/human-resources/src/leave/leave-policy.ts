import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE,
} from "../module-ids";
import {
	archiveLeavePolicyInputSchema,
	createLeavePolicyInputSchema,
	getLeavePolicyInputSchema,
	listLeavePoliciesInputSchema,
	publishLeavePolicyInputSchema,
	resolveApplicableLeavePolicyInputSchema,
	supersedeLeavePolicyInputSchema,
	updateLeavePolicyInputSchema,
} from "../schemas";
import { fingerprintLeavePolicyCreate } from "../shared/fingerprint";
import { runLeaveCommand, runLeaveQuery } from "../shared/leave-command";
import type {
	LeavePolicy,
	LeavePolicyListPage,
	ResolvedLeavePolicy,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_LEAVE_POLICY = "leave_policy" as const;
export type HumanResourcesLeavePolicyAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_POLICY;

export async function createLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return runLeaveCommand(input, options, {
		schema: createLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy create input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = fingerprintLeavePolicyCreate({
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
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				return fail(
					"CONFLICT",
					"Leave policy code already exists for effective date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					minTenureDays: data.minTenureDays ?? null,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function updateLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return runLeaveCommand(input, options, {
		schema: updateLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy update input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
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
					effectiveTo: data.effectiveTo,
					minTenureDays: data.minTenureDays,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function publishLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return runLeaveCommand(input, options, {
		schema: publishLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy publish input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
		execute: (data, { store, ports }) =>
			store.publishLeavePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function supersedeLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return runLeaveCommand(input, options, {
		schema: supersedeLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy supersede input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
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
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					minTenureDays: data.minTenureDays ?? null,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function archiveLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy>> {
	return runLeaveCommand(input, options, {
		schema: archiveLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy archive input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
		execute: (data, { store, ports }) =>
			store.archiveLeavePolicy(
				{
					organizationId: data.organizationId,
					policyId: data.policyId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getLeavePolicy(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeavePolicy | null>> {
	return runLeaveQuery(input, options, {
		schema: getLeavePolicyInputSchema,
		invalidMessage: "Invalid leave policy get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET,
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
	return runLeaveQuery(input, options, {
		schema: listLeavePoliciesInputSchema,
		invalidMessage: "Invalid leave policy list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST,
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
	return runLeaveQuery(input, options, {
		schema: resolveApplicableLeavePolicyInputSchema,
		invalidMessage: "Invalid resolve applicable leave policy input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE,
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
