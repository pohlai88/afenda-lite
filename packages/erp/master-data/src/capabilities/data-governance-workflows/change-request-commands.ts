import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import { changeRequestIdSchema, partyIdSchema } from "../../brands";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "../../command-options";
import {
	expectedVersionSchema,
	orgActorContextSchema,
	orgQueryActorSchema,
} from "../../contracts/context";
import {
	MASTER_COMMAND_CHANGE_REQUEST_APPROVE,
	MASTER_COMMAND_CHANGE_REQUEST_REJECT,
	MASTER_COMMAND_CHANGE_REQUEST_SUBMIT,
	MASTER_QUERY_CHANGE_REQUEST_GET_BY_ID,
	MASTER_QUERY_CHANGE_REQUEST_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type {
	ActivatePartyChangePayload,
	ChangeRequest,
	ChangeRequestCommandKind,
	MergePartiesChangePayload,
} from "../../types";
import {
	CHANGE_REQUEST_COMMAND_KINDS,
	CHANGE_REQUEST_STATUSES,
} from "../../types";
import { normalizeMasterCode } from "../core-organization-masters/normalized-code";
import { approvedApplyAttemptGate } from "../lifecycle-governance";

const mergeFieldDecisionSchema = z.enum(["source", "target"]);
const optionalCodeSchema = z.string().trim().min(1).max(64).optional();

const activatePartyPayloadSchema = z.object({
	partyId: partyIdSchema,
});

const mergePartiesPayloadSchema = z.object({
	sourcePartyId: partyIdSchema,
	targetPartyId: partyIdSchema,
	fieldDecisions: z
		.object({
			name: mergeFieldDecisionSchema.optional(),
			legalName: mergeFieldDecisionSchema.optional(),
			tradingName: mergeFieldDecisionSchema.optional(),
			registrationNumber: mergeFieldDecisionSchema.optional(),
			registrationCountryId: mergeFieldDecisionSchema.optional(),
			preferredLanguageId: mergeFieldDecisionSchema.optional(),
			defaultCurrencyId: mergeFieldDecisionSchema.optional(),
		})
		.optional(),
});

export const submitChangeRequestInputSchema = z.union([
	orgActorContextSchema.extend({
		commandKind: z.literal("activate_party"),
		code: optionalCodeSchema,
		payload: activatePartyPayloadSchema,
	}),
	orgActorContextSchema.extend({
		commandKind: z.literal("merge_parties"),
		code: optionalCodeSchema,
		payload: mergePartiesPayloadSchema,
	}),
]);

export const reviewChangeRequestInputSchema = orgActorContextSchema.extend({
	id: changeRequestIdSchema,
	expectedVersion: expectedVersionSchema,
	reviewNote: z.string().trim().min(1).max(500).optional(),
});

export const listChangeRequestsInputSchema = z
	.object({
		...orgQueryActorSchema.shape,
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
		status: z.enum(CHANGE_REQUEST_STATUSES).optional(),
		commandKind: z.enum(CHANGE_REQUEST_COMMAND_KINDS).optional(),
	})
	.transform((value) => ({
		...value,
		page: value.page ?? 1,
		pageSize: value.pageSize ?? 25,
	}));

export type SubmitChangeRequestInput = z.infer<
	typeof submitChangeRequestInputSchema
>;
export type ReviewChangeRequestInput = z.infer<
	typeof reviewChangeRequestInputSchema
>;

function generateChangeRequestCode(): string {
	const stamp = Date.now().toString(36).toUpperCase();
	const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `CR-${stamp}-${rand}`;
}

function subjectFromSubmit(
	commandKind: ChangeRequestCommandKind,
	payload: ActivatePartyChangePayload | MergePartiesChangePayload,
): { subjectEntityType: "party"; subjectEntityId: string } {
	if (commandKind === "activate_party") {
		return {
			subjectEntityType: "party",
			subjectEntityId: (payload as ActivatePartyChangePayload).partyId,
		};
	}
	return {
		subjectEntityType: "party",
		subjectEntityId: (payload as MergePartiesChangePayload).targetPartyId,
	};
}

/**
 * Submit an MDG change request (maker). Status starts as `submitted`.
 */
export async function submitChangeRequest(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ChangeRequest>> {
	const parsed = parseMasterInput(
		submitChangeRequestInputSchema,
		input,
		"Invalid change request submit input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	if (
		parsed.data.commandKind === "merge_parties" &&
		parsed.data.payload.sourcePartyId === parsed.data.payload.targetPartyId
	) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Source and target parties must differ",
		});
	}

	const rawCode = parsed.data.code ?? generateChangeRequestCode();
	const codeResult = normalizeMasterCode(rawCode);
	if (!codeResult.ok) {
		return codeResult;
	}

	const subject = subjectFromSubmit(
		parsed.data.commandKind,
		parsed.data.payload,
	);
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_CHANGE_REQUEST_SUBMIT,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createChangeRequest(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			commandKind: parsed.data.commandKind,
			payload: parsed.data.payload,
			subjectEntityType: subject.subjectEntityType,
			subjectEntityId: subject.subjectEntityId,
			submittedBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

/**
 * Approve a submitted change request (checker). Maker cannot self-approve.
 */
export async function approveChangeRequest(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ChangeRequest>> {
	const parsed = parseMasterInput(
		reviewChangeRequestInputSchema,
		input,
		"Invalid change request approve input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_CHANGE_REQUEST_APPROVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getChangeRequestById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Change request not found",
		});
	}
	if (current.data.submittedBy === parsed.data.actorUserId) {
		return errorResult.fail("FORBIDDEN");
	}
	if (current.data.status !== "submitted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Change request is not submitted",
		});
	}
	return store.transitionChangeRequest(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "approved",
			reviewNote: parsed.data.reviewNote ?? null,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "approved" },
	);
}

/**
 * Reject a submitted change request (checker). Maker cannot self-reject.
 */
export async function rejectChangeRequest(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ChangeRequest>> {
	const parsed = parseMasterInput(
		reviewChangeRequestInputSchema,
		input,
		"Invalid change request reject input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_CHANGE_REQUEST_REJECT,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getChangeRequestById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Change request not found",
		});
	}
	if (current.data.submittedBy === parsed.data.actorUserId) {
		return errorResult.fail("FORBIDDEN");
	}
	if (current.data.status !== "submitted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Change request is not submitted",
		});
	}
	return store.transitionChangeRequest(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "rejected",
			reviewNote: parsed.data.reviewNote ?? null,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "rejected" },
	);
}

export async function getChangeRequestById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ChangeRequest | null>> {
	const parsed = parseMasterInput(
		orgQueryActorSchema.extend({
			id: changeRequestIdSchema,
		}),
		input,
		"Invalid change request get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_CHANGE_REQUEST_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getChangeRequestById(parsed.data.organizationId, parsed.data.id);
}

export async function listChangeRequests(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ChangeRequest[]>> {
	const parsed = parseMasterInput(
		listChangeRequestsInputSchema,
		input,
		"Invalid change request list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_CHANGE_REQUEST_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listChangeRequests({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		commandKind: parsed.data.commandKind,
	});
}

/** Fail closed when a gated apply omits `changeRequestId`. */
export function requireChangeRequestId(
	changeRequestId: string | undefined,
): Result<string> {
	if (changeRequestId === undefined || changeRequestId.length === 0) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Approved change request is required",
		});
	}
	return errorResult.ok(changeRequestId);
}

/**
 * Validate an approved CR for a gated apply command.
 */
export async function assertApprovedChangeRequestForApply(
	input: {
		organizationId: string;
		changeRequestId: string | undefined;
		commandKind: ChangeRequestCommandKind;
		match: (payload: ChangeRequest["payload"]) => boolean;
	},
	options: MasterCommandOptions = {},
): Promise<Result<ChangeRequest>> {
	const required = requireChangeRequestId(input.changeRequestId);
	if (!required.ok) {
		return required;
	}
	const { store } = resolveCommandDeps(options);
	const current = await store.getChangeRequestById(
		input.organizationId,
		required.data,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Change request not found",
		});
	}
	const cr = current.data;
	if (cr.status !== "approved") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Change request is not approved",
		});
	}
	if (cr.commandKind !== input.commandKind) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Change request command kind mismatch",
		});
	}
	if (!input.match(cr.payload)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Change request payload does not match apply",
		});
	}
	const gate = approvedApplyAttemptGate(
		"change_request",
		"named_domain_command",
	);
	if (!gate.ok) {
		return gate;
	}
	return errorResult.ok(cr);
}
