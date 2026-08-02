import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_RECONCILE,
	HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST,
} from "../module-ids";
import {
	accrueLeaveEntitlementInputSchema,
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
import {
	computeLeaveBalance,
	sortLeaveAdjustmentsForLedger,
} from "../shared/leave-balance";
import {
	assertLeaveAccrualAllowed,
	assertLeaveAdjustmentBalanceAllowed,
	assertLeaveCarryForwardAllowed,
	assertLeavePolicyPublished,
} from "../shared/leave-guards";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	LeaveAdjustment,
	LeaveBalance,
	LeaveBalanceReconciliation,
	LeaveEntitlement,
	LeaveEntitlementListPage,
} from "../types";
import {
	loadLeaveEntitlementForCommand,
	loadPublishedLeavePolicyForEntitlement,
} from "./entitlement-context";
import {
	runLeaveCapabilityCommand,
	runLeaveCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_ENTITLEMENT = "entitlement" as const;
export type HumanResourcesEntitlementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ENTITLEMENT;

export async function grantLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: grantLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement grant input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
		storeMethods: [
			"findLeaveEntitlementByIdempotencyKey",
			"getLeavePolicyById",
			"grantLeaveEntitlement",
		],
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
				return errorResult.ok(existing.data.entitlement);
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: data.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const published = assertLeavePolicyPublished(policy.data.status);
			if (!published.ok) {
				return published;
			}

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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
				}),
			);
		},
	});
}

export async function accrueLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveAdjustment>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: accrueLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement accrual input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
		storeMethods: [
			"getLeaveEntitlementById",
			"getLeavePolicyById",
			"adjustLeaveEntitlement",
		],
		execute: async (data, { store, ports }) => {
			const entitlement = await loadLeaveEntitlementForCommand(store, {
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!entitlement.ok) {
				return entitlement;
			}

			const policyContext = await loadPublishedLeavePolicyForEntitlement(
				store,
				{
					organizationId: data.organizationId,
					entitlement: entitlement.data,
				},
			);
			if (!policyContext.ok) {
				return policyContext;
			}

			const accrualAllowed = assertLeaveAccrualAllowed({
				balanceRules: policyContext.data.balanceRules,
				quantity: data.quantity,
			});
			if (!accrualAllowed.ok) {
				return accrualAllowed;
			}

			const source = `accrual:${data.accrualPeriodStart}:${data.accrualPeriodEnd}`;
			const fingerprint = fingerprintLeaveAdjustment({
				entitlementId: data.entitlementId,
				kind: "accrual",
				delta: data.quantity,
				reason: data.reason,
				source,
			});
			return store.adjustLeaveEntitlement(
				{
					organizationId: data.organizationId,
					entitlementId: data.entitlementId,
					sourceRequestId: null,
					kind: "accrual",
					delta: data.quantity,
					reason: data.reason,
					source,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
				}),
			);
		},
	});
}

export async function carryForwardLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: carryForwardLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement carry-forward input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
		storeMethods: [
			"getLeaveEntitlementById",
			"getLeavePolicyById",
			"getLeaveBalance",
			"carryForwardLeaveEntitlement",
		],
		execute: async (data, { store, ports }) => {
			const source = await loadLeaveEntitlementForCommand(store, {
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!source.ok) {
				return source;
			}

			const policyContext = await loadPublishedLeavePolicyForEntitlement(
				store,
				{
					organizationId: data.organizationId,
					entitlement: source.data,
				},
			);
			if (!policyContext.ok) {
				return policyContext;
			}

			const sourceBalance = await store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!sourceBalance.ok) {
				return sourceBalance;
			}
			if (sourceBalance.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const carryAllowed = assertLeaveCarryForwardAllowed({
				balanceRules: policyContext.data.balanceRules,
				carriedQuantity: data.carriedQuantity,
				sourceBalance: sourceBalance.data.balance,
			});
			if (!carryAllowed.ok) {
				return carryAllowed;
			}

			const fingerprint = fingerprintLeaveEntitlementGrant({
				employeeId: source.data.employeeId,
				employmentId: source.data.employmentId,
				policyId: source.data.policyId,
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
				}),
			);
		},
	});
}

export async function expireLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: expireLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement expire input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
		storeMethods: ["expireLeaveEntitlement"],
		execute: (data, { store, ports }) =>
			store.expireLeaveEntitlement(
				{
					organizationId: data.organizationId,
					entitlementId: data.entitlementId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
				}),
			),
	});
}

export async function adjustLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveAdjustment>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: adjustLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement adjust input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
		storeMethods: [
			"getLeaveEntitlementById",
			"getLeavePolicyById",
			"listPostedLeaveAdjustments",
			"adjustLeaveEntitlement",
		],
		execute: async (data, { store, ports }) => {
			const entitlement = await loadLeaveEntitlementForCommand(store, {
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!entitlement.ok) {
				return entitlement;
			}

			const policyContext = await loadPublishedLeavePolicyForEntitlement(
				store,
				{
					organizationId: data.organizationId,
					entitlement: entitlement.data,
				},
			);
			if (!policyContext.ok) {
				return policyContext;
			}

			const posted = await store.listPostedLeaveAdjustments({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!posted.ok) {
				return posted;
			}

			const balanceAllowed = assertLeaveAdjustmentBalanceAllowed({
				openingQuantity: entitlement.data.openingQuantity,
				adjustments: posted.data,
				delta: data.delta,
				allowsNegativeBalance: policyContext.data.policy.allowsNegativeBalance,
			});
			if (!balanceAllowed.ok) {
				return balanceAllowed;
			}

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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
				}),
			);
		},
	});
}

export async function getLeaveEntitlement(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveEntitlement | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: getLeaveEntitlementInputSchema,
		invalidMessage: "Invalid leave entitlement get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET,
		storeMethods: ["getLeaveEntitlementById"],
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
	return await runLeaveCapabilityQuery(input, options, {
		schema: listLeaveEntitlementsInputSchema,
		invalidMessage: "Invalid leave entitlement list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST,
		storeMethods: ["listLeaveEntitlements"],
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

export async function reconcileLeaveBalance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveBalanceReconciliation | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: getLeaveBalanceInputSchema,
		invalidMessage: "Invalid leave balance reconciliation input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_RECONCILE,
		storeMethods: ["getLeaveEntitlementById", "listPostedLeaveAdjustments"],
		execute: async (data, { store }) => {
			const entitlement = await store.getLeaveEntitlementById({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!entitlement.ok) {
				return entitlement;
			}
			if (entitlement.data === null) {
				return errorResult.ok(null);
			}
			const posted = await store.listPostedLeaveAdjustments({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!posted.ok) {
				return posted;
			}
			const adjustments = sortLeaveAdjustmentsForLedger(
				posted.data.map(({ id, kind, delta, reason, source, createdAt }) => ({
					id,
					kind,
					delta,
					reason,
					source,
					createdAt,
				})),
			);
			return errorResult.ok({
				entitlementId: entitlement.data.id,
				openingQuantity: entitlement.data.openingQuantity,
				adjustments,
				adjustmentCount: adjustments.length,
				balance: computeLeaveBalance(
					entitlement.data.openingQuantity,
					adjustments,
				),
				latestAdjustmentAt: adjustments.at(-1)?.createdAt ?? null,
			});
		},
	});
}

export async function getLeaveBalance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveBalance | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: getLeaveBalanceInputSchema,
		invalidMessage: "Invalid leave balance get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET,
		storeMethods: ["getLeaveBalance"],
		execute: (data, { store }) =>
			store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			}),
	});
}
