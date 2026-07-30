// biome-ignore-all lint/style/noNestedTernary: Resolution decision timestamps mirror the three-state decision model.
// biome-ignore-all lint/suspicious/useAwait: Command wrappers expose one asynchronous boundary for delegated resolution transitions.
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../authorization";
import type { CorporateAdministrationCommandOptions } from "../command-options";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "../company/commands/durable-command";
import { corporateAdministrationErrorDetails } from "../error-codes";
import type { MeetingStore } from "../meetings/store";
import { parseCorporateAdministrationInput } from "../parse-input";
import { assertResolutionCanFollowVote, calculateVoteOutcome } from "./rules";
import {
	adoptResolutionInputSchema,
	assignResolutionActionInputSchema,
	completeResolutionActionInputSchema,
	meetingVoteSchema,
	recordMeetingVoteInputSchema,
	recordMinutesDocumentInputSchema,
	recordWrittenResolutionInputSchema,
	rejectResolutionInputSchema,
	resolutionActionSchema,
	resolutionSchema,
	supersedeResolutionInputSchema,
} from "./schemas";
import type { ResolutionStore } from "./store";
import type {
	AdoptResolutionInput,
	AssignResolutionActionInput,
	CompleteResolutionActionInput,
	MeetingVote,
	RecordMeetingVoteInput,
	RecordMinutesDocumentInput,
	RecordWrittenResolutionInput,
	RejectResolutionInput,
	Resolution,
	ResolutionAction,
	SupersedeResolutionInput,
} from "./types";

export type ResolutionReferencePort = Readonly<{
	validateSourceDocument: (input: {
		organizationId: string;
		sourceDocumentId: string;
	}) => Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
}>;

type Dependencies = DurableLegalCompanyCommandDependencies &
	Readonly<{
		meetingStore: MeetingStore;
		resolutionStore: ResolutionStore;
		referenceData: ResolutionReferencePort;
	}>;

export async function recordMeetingVote(
	input: RecordMeetingVoteInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<MeetingVote>> {
	const parsed = parseCorporateAdministrationInput(
		recordMeetingVoteInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordMeetingVote");
	if (!authorized.ok) {
		return authorized;
	}
	const meeting = await dependencies.meetingStore.getGovernanceMeeting({
		organizationId: options.organizationId,
		governanceMeetingId: parsed.data.governanceMeetingId,
	});
	if (!meeting.ok) {
		return meeting;
	}
	if (meeting.data === null) {
		return notFound("governanceMeeting");
	}
	if (meeting.data.version !== parsed.data.expectedMeetingVersion) {
		return stale(parsed.data.expectedMeetingVersion, meeting.data.version);
	}
	const meetingData = meeting.data;
	const outcome = calculateVoteOutcome(parsed.data);
	if (!outcome.ok) {
		return outcome;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.resolution.record-meeting-vote",
		fingerprintSchema: recordMeetingVoteInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: meetingVoteSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.meeting_vote.recorded.v1",
			operationType: "CREATE",
			targetType: "ca_meeting_vote",
			aggregateType: "meeting_vote",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => votePayload(result, context),
		},
		serializeResult: serializeVote,
		work: (transaction, context) =>
			dependencies.resolutionStore.recordMeetingVote({
				organizationId: options.organizationId,
				legalCompanyId: meetingData.legalCompanyId,
				governanceMeetingId: meetingData.id,
				motionCode: parsed.data.motionCode,
				eligibleVotes: parsed.data.eligibleVotes,
				votesFor: parsed.data.votesFor,
				votesAgainst: parsed.data.votesAgainst,
				abstentions: parsed.data.abstentions,
				thresholdType: parsed.data.thresholdType,
				requiredFor: outcome.data.requiredFor,
				outcome: outcome.data.outcome,
				outcomeBasis: parsed.data.outcomeBasis,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedMeetingVersion: parsed.data.expectedMeetingVersion,
				transaction,
			}),
	});
}

export async function adoptResolution(
	input: AdoptResolutionInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Resolution>> {
	return recordVoteResolution({
		input,
		options,
		dependencies,
		inputSchema: adoptResolutionInputSchema,
		status: "adopted",
		decidedAtField: "approvedAt",
		eventType: "corporate_administration.resolution.adopted.v1",
	});
}

export async function rejectResolution(
	input: RejectResolutionInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Resolution>> {
	return recordVoteResolution({
		input,
		options,
		dependencies,
		inputSchema: rejectResolutionInputSchema,
		status: "rejected",
		decidedAtField: "rejectedAt",
		eventType: "corporate_administration.resolution.rejected.v1",
	});
}

export async function recordWrittenResolution(
	input: RecordWrittenResolutionInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Resolution>> {
	const parsed = parseCorporateAdministrationInput(
		recordWrittenResolutionInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordWrittenResolution");
	if (!authorized.ok) {
		return authorized;
	}
	const outcome = calculateVoteOutcome({
		eligibleVotes: parsed.data.eligibleVotes,
		votesFor: parsed.data.votesFor,
		votesAgainst: 0,
		abstentions: parsed.data.eligibleVotes - parsed.data.votesFor,
		thresholdType: parsed.data.thresholdType,
		requiredFor: parsed.data.requiredFor,
	});
	if (!outcome.ok) {
		return outcome;
	}
	if (outcome.data.outcome !== "adopted") {
		return fail(
			"CONFLICT",
			"Corporate Administration written resolution threshold was not met.",
			corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
				field: "votesFor",
			}),
		);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.resolution.record-written",
		fingerprintSchema: recordWrittenResolutionInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionSchema,
		options,
		dependencies,
		event: resolutionEvent("corporate_administration.resolution.adopted.v1"),
		serializeResult: serializeResolution,
		work: (transaction, context) =>
			dependencies.resolutionStore.recordResolution({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				governanceMeetingId: null,
				meetingVoteId: null,
				approvalBasis: "written_resolution",
				status: "adopted",
				resolutionCode: parsed.data.resolutionCode,
				title: parsed.data.title,
				textDigest: parsed.data.textDigest,
				documentId: parsed.data.documentId,
				effectiveFrom: parsed.data.effectiveFrom,
				approvedAt: parsed.data.approvedAt,
				rejectedAt: null,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				transaction,
			}),
	});
}

export async function supersedeResolution(
	input: SupersedeResolutionInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Resolution>> {
	const parsed = parseCorporateAdministrationInput(
		supersedeResolutionInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "supersedeResolution");
	if (!authorized.ok) {
		return authorized;
	}
	const current = await dependencies.resolutionStore.getResolution({
		organizationId: options.organizationId,
		resolutionId: parsed.data.resolutionId,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("resolution");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.resolution.supersede",
		fingerprintSchema: supersedeResolutionInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionSchema,
		options,
		dependencies,
		event: resolutionEvent("corporate_administration.resolution.superseded.v1"),
		serializeResult: serializeResolution,
		work: (transaction, context) =>
			dependencies.resolutionStore.supersedeResolution({
				organizationId: options.organizationId,
				resolutionId: parsed.data.resolutionId,
				supersededByResolutionId: parsed.data.supersededByResolutionId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function assignResolutionAction(
	input: AssignResolutionActionInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<ResolutionAction>> {
	const parsed = parseCorporateAdministrationInput(
		assignResolutionActionInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "assignResolutionAction");
	if (!authorized.ok) {
		return authorized;
	}
	const resolution = await dependencies.resolutionStore.getResolution({
		organizationId: options.organizationId,
		resolutionId: parsed.data.resolutionId,
	});
	if (!resolution.ok) {
		return resolution;
	}
	if (resolution.data === null) {
		return notFound("resolution");
	}
	if (resolution.data.version !== parsed.data.expectedResolutionVersion) {
		return stale(
			parsed.data.expectedResolutionVersion,
			resolution.data.version,
		);
	}
	const resolutionData = resolution.data;
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.resolution.assign-action",
		fingerprintSchema: assignResolutionActionInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionActionSchema,
		options,
		dependencies,
		event: actionEvent(
			"corporate_administration.resolution.action_assigned.v1",
		),
		serializeResult: serializeAction,
		work: (transaction, context) =>
			dependencies.resolutionStore.assignResolutionAction({
				organizationId: options.organizationId,
				legalCompanyId: resolutionData.legalCompanyId,
				resolutionId: parsed.data.resolutionId,
				actionTypeCode: parsed.data.actionTypeCode,
				assigneePartyId: parsed.data.assigneePartyId,
				dueOn: parsed.data.dueOn,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedResolutionVersion: parsed.data.expectedResolutionVersion,
				transaction,
			}),
	});
}

export async function completeResolutionAction(
	input: CompleteResolutionActionInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<ResolutionAction>> {
	const parsed = parseCorporateAdministrationInput(
		completeResolutionActionInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "completeResolutionAction");
	if (!authorized.ok) {
		return authorized;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runActionUpdate({
		commandId: "corporate-administration.resolution.complete-action",
		input: parsed.data,
		inputSchema: completeResolutionActionInputSchema,
		eventType: "corporate_administration.resolution.action_completed.v1",
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.resolutionStore.completeResolutionAction({
				organizationId: options.organizationId,
				resolutionActionId: parsed.data.resolutionActionId,
				completedAt: parsed.data.completedAt,
				evidenceDocumentId: parsed.data.evidenceDocumentId,
				completionNotes: parsed.data.completionNotes ?? null,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function recordMinutesDocument(
	input: RecordMinutesDocumentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<Resolution>> {
	const parsed = parseCorporateAdministrationInput(
		recordMinutesDocumentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordMinutesDocument");
	if (!authorized.ok) {
		return authorized;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.resolution.record-minutes",
		fingerprintSchema: recordMinutesDocumentInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionSchema,
		options,
		dependencies,
		event: resolutionEvent(
			"corporate_administration.resolution.minutes_recorded.v1",
		),
		serializeResult: serializeResolution,
		work: (transaction, context) =>
			dependencies.resolutionStore.recordMinutesDocument({
				organizationId: options.organizationId,
				resolutionId: parsed.data.resolutionId,
				minutesDocumentId: parsed.data.minutesDocumentId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

function recordVoteResolution(input: {
	input: AdoptResolutionInput | RejectResolutionInput;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	inputSchema:
		| typeof adoptResolutionInputSchema
		| typeof rejectResolutionInputSchema;
	status: "adopted" | "rejected";
	decidedAtField: "approvedAt" | "rejectedAt";
	eventType:
		| "corporate_administration.resolution.adopted.v1"
		| "corporate_administration.resolution.rejected.v1";
}): Promise<Result<Resolution>> {
	const parsed = parseCorporateAdministrationInput(
		input.inputSchema,
		input.input,
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	return recordVoteResolutionParsed({
		...input,
		parsed: parsed.data,
	});
}

async function recordVoteResolutionParsed(input: {
	parsed: AdoptResolutionInput | RejectResolutionInput;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	inputSchema:
		| typeof adoptResolutionInputSchema
		| typeof rejectResolutionInputSchema;
	status: "adopted" | "rejected";
	decidedAtField: "approvedAt" | "rejectedAt";
	eventType:
		| "corporate_administration.resolution.adopted.v1"
		| "corporate_administration.resolution.rejected.v1";
}): Promise<Result<Resolution>> {
	const authorized = await authorize(
		input.options,
		input.status === "adopted" ? "adoptResolution" : "rejectResolution",
	);
	if (!authorized.ok) {
		return authorized;
	}
	const vote = await input.dependencies.resolutionStore.getMeetingVote({
		organizationId: input.options.organizationId,
		meetingVoteId: input.parsed.meetingVoteId,
	});
	if (!vote.ok) {
		return vote;
	}
	if (vote.data === null) {
		return notFound("meetingVote");
	}
	if (vote.data.version !== input.parsed.expectedVoteVersion) {
		return stale(input.parsed.expectedVoteVersion, vote.data.version);
	}
	const voteData = vote.data;
	const source = await validateSource(
		input.dependencies,
		input.options.organizationId,
		input.parsed.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	const decidedAt =
		input.status === "adopted" && "approvedAt" in input.parsed
			? input.parsed.approvedAt
			: input.status === "rejected" && "rejectedAt" in input.parsed
				? input.parsed.rejectedAt
				: undefined;
	if (decidedAt === undefined) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration resolution decision time is required.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{ field: input.decidedAtField },
			),
		);
	}
	const chronology = assertResolutionCanFollowVote({
		vote: voteData,
		status: input.status,
		decidedAt,
		effectiveFrom: input.parsed.effectiveFrom,
	});
	if (!chronology.ok) {
		return chronology;
	}
	return runDurableCompanyCommand({
		commandId: `corporate-administration.resolution.${input.status}`,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.parsed,
		outputSchema: resolutionSchema,
		options: input.options,
		dependencies: input.dependencies,
		event: resolutionEvent(input.eventType),
		serializeResult: serializeResolution,
		work: (transaction, context) =>
			input.dependencies.resolutionStore.recordResolution({
				organizationId: input.options.organizationId,
				legalCompanyId: voteData.legalCompanyId,
				governanceMeetingId: voteData.governanceMeetingId,
				meetingVoteId: voteData.id,
				approvalBasis: "meeting_vote",
				status: input.status,
				resolutionCode: input.parsed.resolutionCode,
				title: input.parsed.title,
				textDigest: input.parsed.textDigest,
				documentId: input.parsed.documentId,
				effectiveFrom: input.parsed.effectiveFrom,
				approvedAt: input.status === "adopted" ? decidedAt : null,
				rejectedAt: input.status === "rejected" ? decidedAt : null,
				sourceDocumentId: input.parsed.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: input.options.actorUserId,
				transaction,
			}),
	});
}

function runActionUpdate(input: {
	commandId: string;
	input: unknown;
	inputSchema: typeof completeResolutionActionInputSchema;
	eventType: "corporate_administration.resolution.action_completed.v1";
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof runDurableCompanyCommand<ResolutionAction>
	>[0]["work"];
}) {
	return runDurableCompanyCommand({
		commandId: input.commandId,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: resolutionActionSchema,
		options: input.options,
		dependencies: input.dependencies,
		event: actionEvent(input.eventType),
		serializeResult: serializeAction,
		work: input.work,
	});
}

function resolutionEvent(
	type:
		| "corporate_administration.resolution.adopted.v1"
		| "corporate_administration.resolution.rejected.v1"
		| "corporate_administration.resolution.superseded.v1"
		| "corporate_administration.resolution.minutes_recorded.v1",
) {
	return {
		type,
		operationType:
			type.includes("adopted") || type.includes("rejected")
				? "CREATE"
				: "UPDATE",
		targetType: "ca_resolution",
		aggregateType: "resolution",
		aggregateId: (result: Resolution) => result.id,
		aggregateVersion: (result: Resolution) => result.version,
		payload: (result: Resolution, context: EventContext) => ({
			organizationId: context.organizationId,
			legalCompanyId: result.legalCompanyId,
			resolutionId: result.id,
			status: result.status,
			approvalBasis: result.approvalBasis,
			occurredAt: context.occurredAt,
			actorUserId: context.actorUserId,
			correlationId: context.correlationId,
		}),
	} as const;
}

function actionEvent(
	type:
		| "corporate_administration.resolution.action_assigned.v1"
		| "corporate_administration.resolution.action_completed.v1",
) {
	return {
		type,
		operationType: type.includes("assigned") ? "CREATE" : "UPDATE",
		targetType: "ca_resolution_action",
		aggregateType: "resolution_action",
		aggregateId: (result: ResolutionAction) => result.id,
		aggregateVersion: (result: ResolutionAction) => result.version,
		payload: (result: ResolutionAction, context: EventContext) => ({
			organizationId: context.organizationId,
			legalCompanyId: result.legalCompanyId,
			resolutionId: result.resolutionId,
			resolutionActionId: result.id,
			status: result.status,
			occurredAt: context.occurredAt,
			actorUserId: context.actorUserId,
			correlationId: context.correlationId,
		}),
	} as const;
}

function votePayload(result: MeetingVote, context: EventContext) {
	return {
		organizationId: context.organizationId,
		legalCompanyId: result.legalCompanyId,
		governanceMeetingId: result.governanceMeetingId,
		meetingVoteId: result.id,
		motionCode: result.motionCode,
		outcome: result.outcome,
		eligibleVotes: result.eligibleVotes,
		votesFor: result.votesFor,
		votesAgainst: result.votesAgainst,
		abstentions: result.abstentions,
		occurredAt: context.occurredAt,
		actorUserId: context.actorUserId,
		correlationId: context.correlationId,
	};
}

type EventContext = Readonly<{
	organizationId: string;
	occurredAt: string;
	actorUserId: string;
	correlationId: string;
}>;

async function validateSource(
	dependencies: Dependencies,
	organizationId: string,
	sourceDocumentId: string,
): Promise<Result<void>> {
	const result = await dependencies.referenceData.validateSourceDocument({
		organizationId,
		sourceDocumentId,
	});
	if (!result.ok) {
		return result;
	}
	if (result.data === null || !result.data.active) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration source document is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "sourceDocumentId" },
			),
		);
	}
	return ok(undefined);
}

function authorize(
	options: CorporateAdministrationCommandOptions,
	command: keyof typeof CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS[command],
	});
}

function notFound(entityType: string): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType,
		}),
	);
}

function stale(expectedVersion: number, actualVersion: number): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration record version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}

function serializeVote(result: MeetingVote) {
	return serializeDates(result);
}

function serializeResolution(result: Resolution) {
	return serializeDates(result);
}

function serializeAction(result: ResolutionAction) {
	return serializeDates(result);
}

function serializeDates<T extends Record<string, unknown>>(value: T) {
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [
			key,
			entry instanceof Date ? entry.toISOString() : entry,
		]),
	);
}
