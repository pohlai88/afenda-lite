// biome-ignore-all lint/style/noNestedTernary: Resolution decision timestamps mirror the three-state decision model.
// biome-ignore-all lint/suspicious/useAwait: Command wrappers expose one asynchronous boundary for delegated resolution transitions.
import { errorResult, type Result } from "@afenda/errors";
import type { OrganizationId } from "../../kernel/brands";
import type { CorporateAdministrationCommandOptions } from "../../kernel/execution/command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationAuthorizedCommandExecution,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../kernel/internal/durable-command";
import { parseCorporateAdministrationInput } from "../../kernel/validation/parse-input";
import type { MeetingResolutionReferencePort } from "../meetings/capabilities";
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
		organizationId: OrganizationId;
		sourceDocumentId: string;
	}) => Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
}>;

type Dependencies = CorporateAdministrationCommandKernelDependencies &
	Readonly<{
		meetingStore: MeetingResolutionReferencePort;
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
	const authorized = await authorizeCorporateAdministrationCommand(
		"recordMeetingVote",
		options,
	);
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
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: recordMeetingVoteInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: meetingVoteSchema,
		dependencies,
		event: {
			operationType: "CREATE",
			targetType: "ca_meeting_vote",
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
		operationId: "adoptResolution",
		status: "adopted",
		decidedAtField: "approvedAt",
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
		operationId: "rejectResolution",
		status: "rejected",
		decidedAtField: "rejectedAt",
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
	const authorized = await authorizeCorporateAdministrationCommand(
		"recordWrittenResolution",
		options,
	);
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
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration written resolution threshold was not met.",
		});
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: recordWrittenResolutionInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionSchema,
		dependencies,
		event: resolutionEvent("CREATE"),
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
				approvedAt: new Date(parsed.data.approvedAt),
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
	const authorized = await authorizeCorporateAdministrationCommand(
		"supersedeResolution",
		options,
	);
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
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: supersedeResolutionInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionSchema,
		dependencies,
		event: resolutionEvent("UPDATE"),
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
	const authorized = await authorizeCorporateAdministrationCommand(
		"assignResolutionAction",
		options,
	);
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
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: assignResolutionActionInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionActionSchema,
		dependencies,
		event: actionEvent("CREATE"),
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
	const authorized = await authorizeCorporateAdministrationCommand(
		"completeResolutionAction",
		options,
	);
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
		authorization: authorized.data,
		operationId: "completeResolutionAction",
		input: parsed.data,
		inputSchema: completeResolutionActionInputSchema,
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
	const authorized = await authorizeCorporateAdministrationCommand(
		"recordMinutesDocument",
		options,
	);
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
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: recordMinutesDocumentInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: resolutionSchema,
		dependencies,
		event: resolutionEvent("UPDATE"),
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
	operationId: "adoptResolution" | "rejectResolution";
	status: "adopted" | "rejected";
	decidedAtField: "approvedAt" | "rejectedAt";
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
	operationId: "adoptResolution" | "rejectResolution";
	status: "adopted" | "rejected";
	decidedAtField: "approvedAt" | "rejectedAt";
}): Promise<Result<Resolution>> {
	const authorized = await authorizeCorporateAdministrationCommand(
		input.operationId,
		input.options,
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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration resolution decision time is required.",
		});
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
	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.parsed,
		outputSchema: resolutionSchema,
		dependencies: input.dependencies,
		event: resolutionEvent("CREATE"),
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
	authorization: CorporateAdministrationAuthorizedCommandExecution;
	operationId: "completeResolutionAction";
	input: unknown;
	inputSchema: typeof completeResolutionActionInputSchema;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof executeCorporateAdministrationCommand<ResolutionAction>
	>[0]["work"];
}) {
	return executeCorporateAdministrationCommand({
		authorization: input.authorization,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: resolutionActionSchema,
		dependencies: input.dependencies,
		event: actionEvent("UPDATE"),
		serializeResult: serializeAction,
		work: input.work,
	});
}

function resolutionEvent(operationType: "CREATE" | "UPDATE") {
	return {
		operationType,
		targetType: "ca_resolution",
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

function actionEvent(operationType: "CREATE" | "UPDATE") {
	return {
		operationType,
		targetType: "ca_resolution_action",
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
	organizationId: OrganizationId,
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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Corporate Administration source document is invalid.",
		});
	}
	return errorResult.ok(undefined);
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
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
