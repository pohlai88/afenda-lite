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
import type { GovernanceStore } from "../governance/store";
import type { GovernanceMembership } from "../governance/types";
import type {
	GovernanceMeetingId,
	GovernanceMembershipId,
} from "../kernel/brands";
import { parseCorporateAdministrationInput } from "../parse-input";
import {
	calculateMeetingQuorum,
	canCloseMeeting,
	datePart,
	isNoticeTimely,
} from "./rules";
import {
	adjournMeetingInputSchema,
	closeMeetingInputSchema,
	governanceMeetingSchema,
	issueMeetingNoticeInputSchema,
	meetingNoticeSchema,
	meetingParticipantSchema,
	meetingQuorumResultSchema,
	openMeetingInputSchema,
	recordMeetingParticipantInputSchema,
	recordNoticeDeliveryInputSchema,
	recordQuorumInputSchema,
	scheduleGovernanceMeetingInputSchema,
	waiveNoticeInputSchema,
} from "./schemas";
import type { MeetingStore } from "./store";
import type {
	AdjournMeetingInput,
	CloseMeetingInput,
	GovernanceMeeting,
	IssueMeetingNoticeInput,
	MeetingNotice,
	MeetingParticipant,
	MeetingQuorumResult,
	OpenMeetingInput,
	RecordMeetingParticipantInput,
	RecordNoticeDeliveryInput,
	RecordQuorumInput,
	ScheduleGovernanceMeetingInput,
	WaiveNoticeInput,
} from "./types";

export type MeetingReferencePort = Readonly<{
	validateSourceDocument(input: {
		organizationId: string;
		sourceDocumentId: string;
	}): Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
}>;

type Dependencies = DurableLegalCompanyCommandDependencies &
	Readonly<{
		governanceStore: GovernanceStore;
		meetingStore: MeetingStore;
		referenceData: MeetingReferencePort;
	}>;

export async function scheduleGovernanceMeeting(
	input: ScheduleGovernanceMeetingInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMeeting>> {
	const parsed = parseCorporateAdministrationInput(
		scheduleGovernanceMeetingInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "scheduleGovernanceMeeting");
	if (!authorized.ok) return authorized;
	const body = await dependencies.governanceStore.getGovernanceBody({
		organizationId: options.organizationId,
		governanceBodyId: parsed.data.governanceBodyId,
	});
	if (!body.ok) return body;
	if (body.data === null) return notFound("governanceBody");
	if (body.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return invalidReference("governanceBodyId");
	}
	if (body.data.version !== parsed.data.expectedBodyVersion) {
		return stale(parsed.data.expectedBodyVersion, body.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) return source;
	return runDurableCompanyCommand({
		commandId: "corporate-administration.meeting.schedule",
		fingerprintSchema: scheduleGovernanceMeetingInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: governanceMeetingSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.governance_meeting.scheduled.v1",
			operationType: "CREATE",
			targetType: "ca_governance_meeting",
			aggregateType: "governance_meeting",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => meetingPayload(result, context),
		},
		serializeResult: serializeMeeting,
		work: (transaction, context) =>
			dependencies.meetingStore.scheduleGovernanceMeeting({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				governanceBodyId: parsed.data.governanceBodyId,
				procedureType: parsed.data.procedureType,
				title: parsed.data.title,
				scheduledStartAt: parsed.data.scheduledStartAt,
				scheduledEndAt: parsed.data.scheduledEndAt ?? null,
				noticePeriodDays: parsed.data.noticePeriodDays,
				locationSummary: parsed.data.locationSummary ?? null,
				remoteAccessSummary: parsed.data.remoteAccessSummary ?? null,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedBodyVersion: parsed.data.expectedBodyVersion,
				transaction,
			}),
	});
}

export async function issueMeetingNotice(
	input: IssueMeetingNoticeInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<MeetingNotice>> {
	const parsed = parseCorporateAdministrationInput(
		issueMeetingNoticeInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "issueMeetingNotice");
	if (!authorized.ok) return authorized;
	const meeting = await loadMeeting(
		options,
		dependencies,
		parsed.data.governanceMeetingId,
	);
	if (!meeting.ok) return meeting;
	if (meeting.data.version !== parsed.data.expectedMeetingVersion) {
		return stale(parsed.data.expectedMeetingVersion, meeting.data.version);
	}
	if (
		!isNoticeTimely({ meeting: meeting.data, issuedAt: parsed.data.issuedAt })
	) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration meeting notice is outside the required notice period.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID",
				{ field: "issuedAt" },
			),
		);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) return source;
	return runDurableCompanyCommand({
		commandId: "corporate-administration.meeting.issue-notice",
		fingerprintSchema: issueMeetingNoticeInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: meetingNoticeSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.meeting_notice.issued.v1",
			operationType: "CREATE",
			targetType: "ca_meeting_notice",
			aggregateType: "meeting_notice",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => noticePayload(result, context),
		},
		serializeResult: serializeNotice,
		work: (transaction, context) =>
			dependencies.meetingStore.issueMeetingNotice({
				organizationId: options.organizationId,
				legalCompanyId: meeting.data.legalCompanyId,
				governanceMeetingId: meeting.data.id,
				recipientMembershipId: parsed.data.recipientMembershipId ?? null,
				recipientPartyId: parsed.data.recipientPartyId ?? null,
				issuedAt: parsed.data.issuedAt,
				deliveryMethod: parsed.data.deliveryMethod,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedMeetingVersion: parsed.data.expectedMeetingVersion,
				transaction,
			}),
	});
}

export async function recordNoticeDelivery(
	input: RecordNoticeDeliveryInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<MeetingNotice>> {
	const parsed = parseCorporateAdministrationInput(
		recordNoticeDeliveryInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "recordNoticeDelivery");
	if (!authorized.ok) return authorized;
	const current = await dependencies.meetingStore.getMeetingNotice({
		organizationId: options.organizationId,
		meetingNoticeId: parsed.data.meetingNoticeId,
	});
	if (!current.ok) return current;
	if (current.data === null) return notFound("meetingNotice");
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) return source;
	return runNoticeUpdateCommand({
		commandId: "corporate-administration.meeting.record-notice-delivery",
		eventType: "corporate_administration.meeting_notice.delivered.v1",
		input: parsed.data,
		inputSchema: recordNoticeDeliveryInputSchema,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.meetingStore.recordNoticeDelivery({
				organizationId: options.organizationId,
				meetingNoticeId: parsed.data.meetingNoticeId,
				deliveredAt: parsed.data.deliveredAt,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function waiveNotice(
	input: WaiveNoticeInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<MeetingNotice>> {
	const parsed = parseCorporateAdministrationInput(
		waiveNoticeInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "waiveNotice");
	if (!authorized.ok) return authorized;
	const current = await dependencies.meetingStore.getMeetingNotice({
		organizationId: options.organizationId,
		meetingNoticeId: parsed.data.meetingNoticeId,
	});
	if (!current.ok) return current;
	if (current.data === null) return notFound("meetingNotice");
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) return source;
	return runNoticeUpdateCommand({
		commandId: "corporate-administration.meeting.waive-notice",
		eventType: "corporate_administration.meeting_notice.waived.v1",
		input: parsed.data,
		inputSchema: waiveNoticeInputSchema,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.meetingStore.waiveNotice({
				organizationId: options.organizationId,
				meetingNoticeId: parsed.data.meetingNoticeId,
				waivedAt: parsed.data.waivedAt,
				waiverReason: parsed.data.waiverReason,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function recordMeetingParticipant(
	input: RecordMeetingParticipantInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<MeetingParticipant>> {
	const parsed = parseCorporateAdministrationInput(
		recordMeetingParticipantInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "recordMeetingParticipant");
	if (!authorized.ok) return authorized;
	const meeting = await loadMeeting(
		options,
		dependencies,
		parsed.data.governanceMeetingId,
	);
	if (!meeting.ok) return meeting;
	if (meeting.data.version !== parsed.data.expectedMeetingVersion) {
		return stale(parsed.data.expectedMeetingVersion, meeting.data.version);
	}
	const membership = await loadMembership(
		dependencies,
		options.organizationId,
		parsed.data.governanceMembershipId,
	);
	if (!membership.ok) return membership;
	if (membership.data.governanceBodyId !== meeting.data.governanceBodyId) {
		return invalidReference("governanceMembershipId");
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.meeting.record-participant",
		fingerprintSchema: recordMeetingParticipantInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: meetingParticipantSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.meeting_participant.recorded.v1",
			operationType: "CREATE",
			targetType: "ca_meeting_participant",
			aggregateType: "meeting_participant",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				governanceMeetingId: result.governanceMeetingId,
				meetingParticipantId: result.id,
				attendanceStatus: result.attendanceStatus,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeParticipant,
		work: (transaction, context) =>
			dependencies.meetingStore.recordMeetingParticipant({
				organizationId: options.organizationId,
				legalCompanyId: meeting.data.legalCompanyId,
				governanceMeetingId: meeting.data.id,
				governanceMembershipId: parsed.data.governanceMembershipId,
				participantPartyId: parsed.data.participantPartyId ?? null,
				attendanceStatus: parsed.data.attendanceStatus,
				representedByPartyId: parsed.data.representedByPartyId ?? null,
				proxyDocumentId: parsed.data.proxyDocumentId ?? null,
				recusalReason: parsed.data.recusalReason ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedMeetingVersion: parsed.data.expectedMeetingVersion,
				transaction,
			}),
	});
}

export async function openMeeting(
	input: OpenMeetingInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMeeting>> {
	const parsed = parseCorporateAdministrationInput(
		openMeetingInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "openMeeting");
	if (!authorized.ok) return authorized;
	const meeting = await loadMeeting(
		options,
		dependencies,
		parsed.data.governanceMeetingId,
	);
	if (!meeting.ok) return meeting;
	if (meeting.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, meeting.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) return source;
	return runMeetingStatusCommand({
		commandId: "corporate-administration.meeting.open",
		eventType: "corporate_administration.governance_meeting.opened.v1",
		input: parsed.data,
		inputSchema: openMeetingInputSchema,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.meetingStore.changeMeetingStatus({
				organizationId: options.organizationId,
				governanceMeetingId: parsed.data.governanceMeetingId,
				status: "open",
				openedAt: parsed.data.openedAt,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function recordQuorum(
	input: RecordQuorumInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<MeetingQuorumResult>> {
	const parsed = parseCorporateAdministrationInput(
		recordQuorumInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "recordQuorum");
	if (!authorized.ok) return authorized;
	const meeting = await loadMeeting(
		options,
		dependencies,
		parsed.data.governanceMeetingId,
	);
	if (!meeting.ok) return meeting;
	if (meeting.data.version !== parsed.data.expectedMeetingVersion) {
		return stale(parsed.data.expectedMeetingVersion, meeting.data.version);
	}
	const members =
		await dependencies.governanceStore.listGovernanceMembershipsAsOf({
			organizationId: options.organizationId,
			governanceBodyId: meeting.data.governanceBodyId,
			asOf: datePart(meeting.data.scheduledStartAt),
		});
	if (!members.ok) return members;
	const participants = await dependencies.meetingStore.listMeetingParticipants({
		organizationId: options.organizationId,
		governanceMeetingId: meeting.data.id,
	});
	if (!participants.ok) return participants;
	const quorum = calculateMeetingQuorum({
		meeting: meeting.data,
		memberships: members.data,
		participants: participants.data,
		ruleCode: parsed.data.ruleCode,
		requiredPresentCount: parsed.data.requiredPresentCount,
		eligibleVotingOnly: parsed.data.eligibleVotingOnly,
		noQuorumReason: parsed.data.noQuorumReason ?? null,
	});
	if (!quorum.ok) return quorum;
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) return source;
	return runDurableCompanyCommand({
		commandId: "corporate-administration.meeting.record-quorum",
		fingerprintSchema: recordQuorumInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: meetingQuorumResultSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.governance_meeting.quorum_recorded.v1",
			operationType: "CREATE",
			targetType: "ca_meeting_quorum_result",
			aggregateType: "meeting_quorum_result",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				governanceMeetingId: result.governanceMeetingId,
				meetingQuorumResultId: result.id,
				hasQuorum: result.hasQuorum,
				eligibleMemberCount: result.eligibleMemberCount,
				presentMemberCount: result.presentMemberCount,
				requiredPresentCount: result.requiredPresentCount,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeQuorum,
		work: (transaction, context) =>
			dependencies.meetingStore.recordQuorum({
				organizationId: options.organizationId,
				legalCompanyId: meeting.data.legalCompanyId,
				governanceMeetingId: meeting.data.id,
				ruleSnapshot: quorum.data.ruleSnapshot,
				eligibleMemberCount: quorum.data.eligibleMemberCount,
				presentMemberCount: quorum.data.presentMemberCount,
				requiredPresentCount: quorum.data.requiredPresentCount,
				hasQuorum: quorum.data.hasQuorum,
				noQuorumReason: quorum.data.noQuorumReason,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedMeetingVersion: parsed.data.expectedMeetingVersion,
				transaction,
			}),
	});
}

export async function adjournMeeting(
	input: AdjournMeetingInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMeeting>> {
	const parsed = parseCorporateAdministrationInput(
		adjournMeetingInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "adjournMeeting");
	if (!authorized.ok) return authorized;
	return changeMeeting({
		commandId: "corporate-administration.meeting.adjourn",
		eventType: "corporate_administration.governance_meeting.adjourned.v1",
		input: parsed.data,
		inputSchema: adjournMeetingInputSchema,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.meetingStore.changeMeetingStatus({
				organizationId: options.organizationId,
				governanceMeetingId: parsed.data.governanceMeetingId,
				status: "adjourned",
				adjournedAt: parsed.data.adjournedAt,
				adjournedTo: parsed.data.adjournedTo,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function closeMeeting(
	input: CloseMeetingInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<GovernanceMeeting>> {
	const parsed = parseCorporateAdministrationInput(
		closeMeetingInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "closeMeeting");
	if (!authorized.ok) return authorized;
	const meeting = await loadMeeting(
		options,
		dependencies,
		parsed.data.governanceMeetingId,
	);
	if (!meeting.ok) return meeting;
	if (meeting.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, meeting.data.version);
	}
	const quorum = await dependencies.meetingStore.getLatestQuorumResult({
		organizationId: options.organizationId,
		governanceMeetingId: meeting.data.id,
	});
	if (!quorum.ok) return quorum;
	const closeable = canCloseMeeting({
		meeting: meeting.data,
		quorumResult: quorum.data,
	});
	if (!closeable.ok) return closeable;
	return changeMeeting({
		commandId: "corporate-administration.meeting.close",
		eventType: "corporate_administration.governance_meeting.closed.v1",
		input: parsed.data,
		inputSchema: closeMeetingInputSchema,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.meetingStore.changeMeetingStatus({
				organizationId: options.organizationId,
				governanceMeetingId: parsed.data.governanceMeetingId,
				status: "closed",
				closedAt: parsed.data.closedAt,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

function changeMeeting(input: {
	commandId: string;
	eventType:
		| "corporate_administration.governance_meeting.adjourned.v1"
		| "corporate_administration.governance_meeting.closed.v1";
	input: unknown;
	inputSchema:
		| typeof adjournMeetingInputSchema
		| typeof closeMeetingInputSchema;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof runDurableCompanyCommand<GovernanceMeeting>
	>[0]["work"];
}) {
	return runMeetingStatusCommand(input);
}

function runMeetingStatusCommand(input: {
	commandId: string;
	eventType:
		| "corporate_administration.governance_meeting.opened.v1"
		| "corporate_administration.governance_meeting.adjourned.v1"
		| "corporate_administration.governance_meeting.closed.v1";
	input: unknown;
	inputSchema:
		| typeof openMeetingInputSchema
		| typeof adjournMeetingInputSchema
		| typeof closeMeetingInputSchema;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof runDurableCompanyCommand<GovernanceMeeting>
	>[0]["work"];
}) {
	return runDurableCompanyCommand({
		commandId: input.commandId,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: governanceMeetingSchema,
		options: input.options,
		dependencies: input.dependencies,
		event: {
			type: input.eventType,
			operationType: "UPDATE",
			targetType: "ca_governance_meeting",
			aggregateType: "governance_meeting",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => meetingPayload(result, context),
		},
		serializeResult: serializeMeeting,
		work: input.work,
	});
}

function runNoticeUpdateCommand(input: {
	commandId: string;
	eventType:
		| "corporate_administration.meeting_notice.delivered.v1"
		| "corporate_administration.meeting_notice.waived.v1";
	input: unknown;
	inputSchema:
		| typeof recordNoticeDeliveryInputSchema
		| typeof waiveNoticeInputSchema;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<typeof runDurableCompanyCommand<MeetingNotice>>[0]["work"];
}) {
	return runDurableCompanyCommand({
		commandId: input.commandId,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: meetingNoticeSchema,
		options: input.options,
		dependencies: input.dependencies,
		event: {
			type: input.eventType,
			operationType: "UPDATE",
			targetType: "ca_meeting_notice",
			aggregateType: "meeting_notice",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => noticePayload(result, context),
		},
		serializeResult: serializeNotice,
		work: input.work,
	});
}

async function loadMeeting(
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
	governanceMeetingId: string,
): Promise<Result<GovernanceMeeting>> {
	const meeting = await dependencies.meetingStore.getGovernanceMeeting({
		organizationId: options.organizationId,
		governanceMeetingId: governanceMeetingId as GovernanceMeetingId,
	});
	if (!meeting.ok) return meeting;
	return meeting.data === null
		? notFound("governanceMeeting")
		: ok(meeting.data);
}

async function loadMembership(
	dependencies: Dependencies,
	organizationId: string,
	governanceMembershipId: string,
): Promise<Result<GovernanceMembership>> {
	const membership = await dependencies.governanceStore.getGovernanceMembership(
		{
			organizationId: organizationId as never,
			governanceMembershipId: governanceMembershipId as GovernanceMembershipId,
		},
	);
	if (!membership.ok) return membership;
	return membership.data === null
		? notFound("governanceMembership")
		: ok(membership.data);
}

async function validateSource(
	dependencies: Dependencies,
	organizationId: string,
	sourceDocumentId: string,
): Promise<Result<void>> {
	const result = await dependencies.referenceData.validateSourceDocument({
		organizationId,
		sourceDocumentId,
	});
	if (!result.ok) return result;
	if (result.data === null) {
		return invalidReference("sourceDocumentId");
	}
	if (!result.data.active) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration source document is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
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

function invalidReference(field: string): Result<never> {
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration reference is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
			{ field },
		),
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

function meetingPayload(
	result: GovernanceMeeting,
	context: Readonly<{
		organizationId: string;
		occurredAt: string;
		actorUserId: string;
		correlationId: string;
	}>,
) {
	return {
		organizationId: context.organizationId,
		legalCompanyId: result.legalCompanyId,
		governanceMeetingId: result.id,
		governanceBodyId: result.governanceBodyId,
		status: result.status,
		procedureType: result.procedureType,
		occurredAt: context.occurredAt,
		actorUserId: context.actorUserId,
		correlationId: context.correlationId,
	};
}

function noticePayload(
	result: MeetingNotice,
	context: Readonly<{
		organizationId: string;
		occurredAt: string;
		actorUserId: string;
		correlationId: string;
	}>,
) {
	return {
		organizationId: context.organizationId,
		legalCompanyId: result.legalCompanyId,
		governanceMeetingId: result.governanceMeetingId,
		meetingNoticeId: result.id,
		status: result.status,
		occurredAt: context.occurredAt,
		actorUserId: context.actorUserId,
		correlationId: context.correlationId,
	};
}

function serializeMeeting(result: GovernanceMeeting) {
	return {
		...result,
		scheduledStartAt: result.scheduledStartAt.toISOString(),
		scheduledEndAt: result.scheduledEndAt?.toISOString() ?? null,
		openedAt: result.openedAt?.toISOString() ?? null,
		adjournedAt: result.adjournedAt?.toISOString() ?? null,
		adjournedTo: result.adjournedTo?.toISOString() ?? null,
		closedAt: result.closedAt?.toISOString() ?? null,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeNotice(result: MeetingNotice) {
	return {
		...result,
		issuedAt: result.issuedAt.toISOString(),
		deliveredAt: result.deliveredAt?.toISOString() ?? null,
		waivedAt: result.waivedAt?.toISOString() ?? null,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeParticipant(result: MeetingParticipant) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeQuorum(result: MeetingQuorumResult) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}
