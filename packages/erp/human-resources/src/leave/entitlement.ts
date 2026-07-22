import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST,
} from "../module-ids";
import {
	adjustLeaveEntitlementInputSchema,
	carryForwardLeaveEntitlementInputSchema,
	expireLeaveEntitlementInputSchema,
	getLeaveBalanceInputSchema,
	getLeaveEntitlementInputSchema,
	grantLeaveEntitlementInputSchema,
	listLeaveEntitlementsInputSchema,
} from "../schemas/leave";
import {
	fingerprintLeaveAdjustment,
	fingerprintLeaveEntitlementGrant,
} from "../shared/fingerprint";
import { runLeaveCommand, runLeaveQuery } from "../shared/leave-command";
import { assertLeavePolicyPublished } from "../shared/leave-guards";
import type {
	LeaveAdjustment,
	LeaveBalance,
	LeaveEntitlement,
	LeaveEntitlementListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_ENTITLEMENT = "entitlement" as const;
export type HumanResourcesEntitlementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ENTITLEMENT;

export async function grantLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement>> {
	return runLeaveCommand(input, options, {
		schema: grantLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement grant input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
		execute: async (data, { store, ports }) => {
			const fingerprint = fingerprintLeaveEntitlementGrant({
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				policyId: data.policyId,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				openingQuantity: data.openingQuantity,
			});

			const existing = await store.findLeaveEntitlementByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.entitlement);
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return fail("NOT_FOUND", "Leave policy not found");
			}
			const published = assertLeavePolicyPublished(policy.data.status);
			if (!published.ok) return published;

			return store.grantLeaveEntitlement(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					policyId: data.policyId,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					openingQuantity: data.openingQuantity,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function carryForwardLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement>> {
	return runLeaveCommand(input, options, {
		schema: carryForwardLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement carry-forward input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintLeaveEntitlementGrant({
				employeeId: data.entitlementId,
				employmentId: data.newPeriodStart,
				policyId: data.newPeriodEnd,
				periodStart: data.newPeriodStart,
				periodEnd: data.newPeriodEnd,
				openingQuantity: data.carriedQuantity,
			});
			return store.carryForwardLeaveEntitlement(
				{
					organizationId: data.organizationId,
					entitlementId: data.entitlementId,
					newPeriodStart: data.newPeriodStart,
					newPeriodEnd: data.newPeriodEnd,
					carriedQuantity: data.carriedQuantity,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function expireLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement>> {
	return runLeaveCommand(input, options, {
		schema: expireLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement expire input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
		execute: (data, { store, ports }) =>
			store.expireLeaveEntitlement(
				{
					organizationId: data.organizationId,
					entitlementId: data.entitlementId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function adjustLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveAdjustment>> {
	return runLeaveCommand(input, options, {
		schema: adjustLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement adjust input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintLeaveAdjustment({
				entitlementId: data.entitlementId,
				kind: "manual",
				delta: data.delta,
				reason: data.reason,
			});
			return store.adjustLeaveEntitlement(
				{
					organizationId: data.organizationId,
					entitlementId: data.entitlementId,
					sourceRequestId: null,
					kind: "manual",
					delta: data.delta,
					reason: data.reason,
					source: "manual",
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement | null>> {
	return runLeaveQuery(input, options, {
		schema: getLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET,
		execute: (data, { store }) =>
			store.getLeaveEntitlementById({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			}),
	});
}

export async function listLeaveEntitlements(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlementListPage>> {
	return runLeaveQuery(input, options, {
		schema: listLeaveEntitlementsInputSchema,
		invalidMessage: "Invalid leave entitlement list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST,
		execute: (data, { store }) =>
			store.listLeaveEntitlements({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				policyId: data.policyId,
			}),
	});
}

export async function getLeaveBalance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveBalance | null>> {
	return runLeaveQuery(input, options, {
		schema: getLeaveBalanceInputSchema,
		invalidMessage: "Invalid leave balance get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET,
		execute: (data, { store }) =>
			store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			}),
	});
}
