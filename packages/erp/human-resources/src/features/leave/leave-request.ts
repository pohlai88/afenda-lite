import { errorResult, type Result } from "@afenda/errors";
import { assertHumanResourcesSupplementalAuthorization } from "../../kernel/authorization/contextual-authorization";
import {
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
} from "../../kernel/authorization/permissions";
import { resolveActorEmployeeIdentity } from "../../kernel/authorization/subject-aware-authorization";
import type {
	ApprovedLeaveHandoff,
	LeaveRequest,
	LeaveRequestListPage,
	TeamCalendarLeavePage,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../kernel/execution/run-sequential";
import type { HumanResourcesEmployeeId } from "../../kernel/identity/brands";
import { fingerprintLeaveRequestCreate } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
	HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR,
} from "../../kernel/operations/module-ids";
import {
	assertApprovalDecisionMatchesRequestTransition,
	assertApproverIsPrimaryManager,
	assertEmploymentActiveForLeave,
	assertLeaveEntitlementActive,
	assertLeavePolicyPublished,
	assertLeaveRequestAmendable,
	assertNoLeaveOverlap,
	assertNoSelfApproval,
	assertSufficientLeaveBalance,
} from "./guards";
import {
	assertLeaveRequestSensitiveReadAllowed,
	requireLeaveCancelApprovedPermission,
	requireLeaveRequestBackdatePermission,
	requireLeaveRequestSensitiveRead,
	runLeaveCapabilityCommand,
	runLeaveCapabilityQuery,
} from "./run-operation";
import {
	amendLeaveRequestInputSchema,
	approveLeaveRequestInputSchema,
	cancelApprovedLeaveRequestInputSchema,
	createDraftLeaveRequestInputSchema,
	getApprovedLeaveHandoffInputSchema,
	getLeaveRequestInputSchema,
	listLeaveRequestsInputSchema,
	listPendingApprovalLeaveRequestsInputSchema,
	listTeamCalendarLeaveRequestsInputSchema,
	rejectLeaveRequestInputSchema,
	returnLeaveRequestInputSchema,
	submitLeaveRequestInputSchema,
	withdrawLeaveRequestInputSchema,
} from "./schema";
import type { HumanResourcesLeaveCapabilityStore } from "./store";

export const HUMAN_RESOURCES_AGGREGATE_LEAVE_REQUEST = "leave_request" as const;

function requireBackdatePermissionWhenNeeded(
	options: HumanResourcesCommandOptions,
	input: {
		isBackdated: boolean;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		operationId:
			| typeof HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT
			| typeof HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND;
	},
): Promise<Result<void>> {
	if (!input.isBackdated) {
		return Promise.resolve(errorResult.ok(undefined));
	}
	return requireLeaveRequestBackdatePermission(options, input);
}
export type HumanResourcesLeaveRequestAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_REQUEST;

/** Manager scope: actor-derived employee must be the effective primary manager at asOf. */
async function assertActorIsPrimaryManager(
	store: Pick<
		HumanResourcesLeaveCapabilityStore,
		"getPrimaryManagerForEmployee"
	>,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
	},
): Promise<Result<void>> {
	const primary = await store.getPrimaryManagerForEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		asOf: input.asOf,
	});
	if (!primary.ok) {
		return primary;
	}
	if (primary.data === null) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}
	const managerCheck = assertApproverIsPrimaryManager({
		approverEmployeeId: input.managerEmployeeId,
		primaryManagerEmployeeId: primary.data,
	});
	if (!managerCheck.ok) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}
	return errorResult.ok(undefined);
}

export async function createDraftLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: createDraftLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request create input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
		storeMethods: [
			"findLeaveRequestByIdempotencyKey",
			"getLeaveEntitlementById",
			"getLeavePolicyById",
			"getEmploymentById",
			"createDraftLeaveRequest",
		],
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
		execute: async (data, { store, ports, workCalendar }) => {
			const backdate = await requireBackdatePermissionWhenNeeded(options, {
				isBackdated: data.isBackdated === true,
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
			});
			if (!backdate.ok) {
				return backdate;
			}

			const fingerprint = fingerprintLeaveRequestCreate({
				employeeId: data.employeeId,
				entitlementId: data.entitlementId,
				startDate: data.startDate,
				endDate: data.endDate,
				requestedQuantity: data.requestedQuantity,
			});

			const existing = await store.findLeaveRequestByIdempotencyKey({
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
				return errorResult.ok(existing.data.request);
			}

			const entitlement = await store.getLeaveEntitlementById({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!entitlement.ok) {
				return entitlement;
			}
			if (entitlement.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const activeEntitlement = assertLeaveEntitlementActive(
				entitlement.data.status,
			);
			if (!activeEntitlement.ok) {
				return activeEntitlement;
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: entitlement.data.policyId,
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

			const employment = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: entitlement.data.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const employmentActive = assertEmploymentActiveForLeave({
				employmentStatus: employment.data.status,
				endsOn: employment.data.endsOn,
				asOfDate: data.startDate,
			});
			if (!employmentActive.ok) {
				return employmentActive;
			}

			const expanded = await workCalendar.expandLeaveSegments({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: entitlement.data.employmentId,
				startDate: data.startDate,
				endDate: data.endDate,
				unit: policy.data.unit,
				...(data.dayPortion === undefined
					? {}
					: { partialDay: data.dayPortion }),
			});
			if (!expanded.ok) {
				return expanded;
			}

			return store.createDraftLeaveRequest(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: entitlement.data.employmentId,
					entitlementId: data.entitlementId,
					policyId: entitlement.data.policyId,
					startDate: data.startDate,
					endDate: data.endDate,
					requestedQuantity: data.requestedQuantity,
					unit: policy.data.unit,
					isBackdated: data.isBackdated ?? false,
					backdateJustification: data.backdateJustification ?? null,
					segments: expanded.data.map((segment) => ({
						segmentDate: segment.date,
						quantity: segment.quantity,
						dayPortion: segment.dayPortion,
					})),
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
				}),
			);
		},
	});
}

export async function amendLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: amendLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request amend input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
		storeMethods: [
			"getLeaveRequestById",
			"getLeavePolicyById",
			"amendLeaveRequest",
		],
		execute: async (data, { store, ports, workCalendar }) => {
			const backdate = await requireBackdatePermissionWhenNeeded(options, {
				isBackdated: data.isBackdated === true,
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
			});
			if (!backdate.ok) {
				return backdate;
			}

			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (request.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const amendable = assertLeaveRequestAmendable(request.data.status);
			if (!amendable.ok) {
				return amendable;
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const expanded = await workCalendar.expandLeaveSegments({
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				employmentId: request.data.employmentId,
				startDate: data.startDate,
				endDate: data.endDate,
				unit: policy.data.unit,
				...(data.dayPortion === undefined
					? {}
					: { partialDay: data.dayPortion }),
			});
			if (!expanded.ok) {
				return expanded;
			}

			return store.amendLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					startDate: data.startDate,
					endDate: data.endDate,
					requestedQuantity: data.requestedQuantity,
					isBackdated: data.isBackdated ?? request.data.isBackdated,
					backdateJustification:
						data.backdateJustification === undefined
							? request.data.backdateJustification
							: data.backdateJustification,
					segments: expanded.data.map((segment) => ({
						segmentDate: segment.date,
						quantity: segment.quantity,
						dayPortion: segment.dayPortion,
					})),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
				}),
			);
		},
	});
}

export async function submitLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: submitLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request submit input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
		storeMethods: [
			"getLeaveRequestById",
			"getLeavePolicyById",
			"getLeaveBalance",
			"listLeaveRequestSegments",
			"listOverlappingLeaveSegments",
			"submitLeaveRequest",
		],
		execute: async (data, { store, ports }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (request.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const balance = await store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: request.data.entitlementId,
			});
			if (!balance.ok) {
				return balance;
			}
			if (balance.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const sufficient = assertSufficientLeaveBalance({
				balance: balance.data.balance,
				requestedQuantity: request.data.requestedQuantity,
				allowsNegativeBalance: policy.data.allowsNegativeBalance,
			});
			if (!sufficient.ok) {
				return sufficient;
			}

			const candidateSegments = await store.listLeaveRequestSegments({
				organizationId: data.organizationId,
				requestId: request.data.id,
			});
			if (!candidateSegments.ok) {
				return candidateSegments;
			}

			const existingSegments = await store.listOverlappingLeaveSegments({
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				excludeRequestId: request.data.id,
				includeDraft: false,
			});
			if (!existingSegments.ok) {
				return existingSegments;
			}

			const overlap = assertNoLeaveOverlap(
				candidateSegments.data,
				existingSegments.data,
			);
			if (!overlap.ok) {
				return overlap;
			}

			return store.submitLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
				}),
			);
		},
	});
}

export async function approveLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: approveLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request approve input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
		storeMethods: [
			"getLeaveRequestById",
			"getLeavePolicyById",
			"getLeaveBalance",
			"listLeaveRequestSegments",
			"listOverlappingLeaveSegments",
			"getPrimaryManagerForEmployee",
			"approveLeaveRequest",
		],
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
		execute: async (data, { store, ports, identityResolver }) => {
			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED");
			}
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (request.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			// Resolve the manager identity from the actor user ID
			const managerIdentity = await identityResolver.resolveEmployeeForActor({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				asOf: request.data.startDate,
			});
			if (!managerIdentity.ok) {
				return managerIdentity;
			}
			if (!managerIdentity.data) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const isAllowedSelfApproval =
				policy.data.allowSelfApproval === true &&
				request.data.createdBy === data.actorUserId &&
				managerIdentity.data.employeeId === request.data.employeeId;

			if (!isAllowedSelfApproval) {
				const managerCheck = await assertActorIsPrimaryManager(store, {
					organizationId: data.organizationId,
					employeeId: request.data.employeeId,
					managerEmployeeId: managerIdentity.data.employeeId,
					asOf: request.data.startDate,
				});
				if (!managerCheck.ok) {
					return managerCheck;
				}
			}

			const selfApproval = assertNoSelfApproval({
				employeeUserId: request.data.createdBy,
				approverUserId: data.actorUserId,
				allowSelfApproval: policy.data.allowSelfApproval,
			});
			if (!selfApproval.ok) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}

			const decision = assertApprovalDecisionMatchesRequestTransition({
				decision: "approved",
				nextStatus: "approved",
			});
			if (!decision.ok) {
				return decision;
			}

			const balance = await store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: request.data.entitlementId,
			});
			if (!balance.ok) {
				return balance;
			}
			if (balance.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const sufficient = assertSufficientLeaveBalance({
				balance: balance.data.balance,
				requestedQuantity: request.data.requestedQuantity,
				allowsNegativeBalance: policy.data.allowsNegativeBalance,
			});
			if (!sufficient.ok) {
				return sufficient;
			}

			const candidateSegments = await store.listLeaveRequestSegments({
				organizationId: data.organizationId,
				requestId: request.data.id,
			});
			if (!candidateSegments.ok) {
				return candidateSegments;
			}

			const existingSegments = await store.listOverlappingLeaveSegments({
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				excludeRequestId: request.data.id,
			});
			if (!existingSegments.ok) {
				return existingSegments;
			}

			const overlap = assertNoLeaveOverlap(
				candidateSegments.data,
				existingSegments.data,
			);
			if (!overlap.ok) {
				return overlap;
			}

			return store.approveLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
				}),
			);
		},
	});
}

export async function rejectLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: rejectLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request reject input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
		storeMethods: [
			"getLeaveRequestById",
			"getPrimaryManagerForEmployee",
			"rejectLeaveRequest",
		],
		execute: async (data, { store, ports, identityResolver }) => {
			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED");
			}
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (request.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			// Resolve the manager identity from the actor user ID
			const managerIdentity = await identityResolver.resolveEmployeeForActor({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				asOf: request.data.startDate,
			});
			if (!managerIdentity.ok) {
				return managerIdentity;
			}
			if (!managerIdentity.data) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}

			const managerCheck = await assertActorIsPrimaryManager(store, {
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				managerEmployeeId: managerIdentity.data.employeeId,
				asOf: request.data.startDate,
			});
			if (!managerCheck.ok) {
				return managerCheck;
			}

			return store.rejectLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
				}),
			);
		},
	});
}

export async function returnLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: returnLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request return input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
		storeMethods: [
			"getLeaveRequestById",
			"getPrimaryManagerForEmployee",
			"returnLeaveRequest",
		],
		execute: async (data, { store, ports, identityResolver }) => {
			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED");
			}
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (request.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			// Resolve the manager identity from the actor user ID
			const managerIdentity = await identityResolver.resolveEmployeeForActor({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				asOf: request.data.startDate,
			});
			if (!managerIdentity.ok) {
				return managerIdentity;
			}
			if (!managerIdentity.data) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}

			const managerCheck = await assertActorIsPrimaryManager(store, {
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				managerEmployeeId: managerIdentity.data.employeeId,
				asOf: request.data.startDate,
			});
			if (!managerCheck.ok) {
				return managerCheck;
			}

			return store.returnLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
				}),
			);
		},
	});
}

export async function withdrawLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: withdrawLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request withdraw input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
		storeMethods: ["withdrawLeaveRequest"],
		execute: (data, { store, ports }) =>
			store.withdrawLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
				}),
			),
	});
}

export async function cancelApprovedLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return await runLeaveCapabilityCommand(input, options, {
		schema: cancelApprovedLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request cancel input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
		storeMethods: ["cancelApprovedLeaveRequest"],
		authorize: (opts, data) =>
			requireLeaveCancelApprovedPermission(opts, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
			}),
		execute: (data, { store, ports }) =>
			store.cancelApprovedLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
				}),
			),
	});
}

export async function getLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: getLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
		storeMethods: ["getLeaveRequestById", "getLeavePolicyById"],
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
		execute: async (data, { store, identityResolver }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (request.data === null) {
				return errorResult.ok(null);
			}

			const actorIdentity = await resolveActorEmployeeIdentity(
				identityResolver,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
				},
			);
			const isOwner =
				actorIdentity.ok &&
				actorIdentity.data.employeeId === request.data.employeeId;

			if (!isOwner) {
				const sensitiveAdmin = await requireLeaveRequestSensitiveRead(options, {
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
					operationKind: "query",
				});
				if (!sensitiveAdmin.ok) {
					return errorResult.fail("FORBIDDEN", {
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_FORBIDDEN,
						),
					});
				}
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			const sensitive = await assertLeaveRequestSensitiveReadAllowed(options, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				operationId: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
				operationKind: "query",
				request: request.data,
				policy: policy.data,
			});
			if (!sensitive.ok) {
				return sensitive;
			}

			if (policy.data.sensitive && options.resourceAwareAuthorization) {
				const resourceAware =
					await assertHumanResourcesSupplementalAuthorization(
						{
							operationId: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
							operationKind: "query",
							requiredPermission: isOwner
								? HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN
								: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
							actor: {
								organizationId: data.organizationId,
								actorUserId: data.actorUserId,
								correlationId: data.correlationId ?? "",
							},
							resource: {
								organizationId: data.organizationId,
								kind: "leave_request",
								resourceId: request.data.id,
								subjectEmployeeId: request.data.employeeId,
							},
						},
						options,
					);
				if (!resourceAware.ok) {
					return resourceAware;
				}
			}

			return errorResult.ok(request.data);
		},
	});
}

export async function listLeaveRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequestListPage>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: listLeaveRequestsInputSchema,
		invalidMessage: "Invalid leave request list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST,
		storeMethods: ["listLeaveRequests", "getLeavePolicyById"],
		execute: async (data, { store, identityResolver }) => {
			const actorIdentity = await resolveActorEmployeeIdentity(
				identityResolver,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
				},
			);
			if (!actorIdentity.ok) {
				return actorIdentity;
			}

			// Own-scoped list: always derive subject from actor; never trust client employeeId alone.
			if (
				data.employeeId !== undefined &&
				data.employeeId !== actorIdentity.data.employeeId
			) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}
			const { employeeId } = actorIdentity.data;

			const page = await store.listLeaveRequests({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				employeeId,
				status: data.status,
			});
			if (!page.ok) {
				return page;
			}

			const filtered: LeaveRequest[] = [];
			const sequentialOutcome1 = await runSequential(
				page.data.requests,
				async (request) => {
					const policy = await store.getLeavePolicyById({
						organizationId: data.organizationId,
						policyId: request.policyId,
					});
					if (!policy.ok) {
						return sequentialReturn(policy);
					}
					if (policy.data === null) {
						return sequentialReturn(
							errorResult.fail("NOT_FOUND", {
								publicMessage: "The requested resource was not found",
							}),
						);
					}
					const sensitive = await assertLeaveRequestSensitiveReadAllowed(
						options,
						{
							organizationId: data.organizationId,
							actorUserId: data.actorUserId,
							correlationId: data.correlationId,
							operationId: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST,
							operationKind: "query",
							request,
							policy: policy.data,
						},
					);
					if (!sensitive.ok) {
						return sequentialContinue();
					}
					filtered.push(request);
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}

			return errorResult.ok({
				...page.data,
				requests: filtered,
				totalCount: filtered.length,
			});
		},
	});
}

export async function listPendingApprovalLeaveRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequestListPage>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: listPendingApprovalLeaveRequestsInputSchema,
		invalidMessage: "Invalid pending approval leave request list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL,
		storeMethods: ["listPendingApprovalLeaveRequests"],
		execute: async (data, { store, identityResolver }) => {
			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED");
			}

			// Resolve the manager identity from the actor user ID
			const managerIdentity = await identityResolver.resolveEmployeeForActor({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
			});
			if (!managerIdentity.ok) {
				return managerIdentity;
			}
			if (!managerIdentity.data) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}

			return store.listPendingApprovalLeaveRequests({
				organizationId: data.organizationId,
				managerEmployeeId: managerIdentity.data.employeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			});
		},
	});
}

export async function listTeamCalendarLeaveRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TeamCalendarLeavePage>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: listTeamCalendarLeaveRequestsInputSchema,
		invalidMessage: "Invalid team calendar leave request list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR,
		storeMethods: ["listTeamCalendarLeaveRequests"],
		execute: async (data, { store, identityResolver }) => {
			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED");
			}

			// Resolve the manager identity from the actor user ID
			const managerIdentity = await identityResolver.resolveEmployeeForActor({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
			});
			if (!managerIdentity.ok) {
				return managerIdentity;
			}
			if (!managerIdentity.data) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}

			return store.listTeamCalendarLeaveRequests({
				organizationId: data.organizationId,
				managerEmployeeId: managerIdentity.data.employeeId,
				rangeStart: data.rangeStart,
				rangeEnd: data.rangeEnd,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			});
		},
	});
}

export async function getApprovedLeaveHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedLeaveHandoff | null>> {
	return await runLeaveCapabilityQuery(input, options, {
		schema: getApprovedLeaveHandoffInputSchema,
		invalidMessage: "Invalid approved leave handoff input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET,
		storeMethods: ["getApprovedLeaveHandoff"],
		execute: (data, { store }) =>
			store.getApprovedLeaveHandoff({
				organizationId: data.organizationId,
				requestId: data.requestId,
				correlationId: data.correlationId,
			}),
	});
}
