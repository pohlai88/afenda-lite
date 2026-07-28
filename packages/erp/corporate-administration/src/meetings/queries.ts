import type { Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../authorization";
import type { CorporateAdministrationQueryOptions } from "../command-options";
import { parseCorporateAdministrationInput } from "../parse-input";
import {
	getGovernanceMeetingInputSchema,
	getMeetingAttendanceInputSchema,
	getMeetingQuorumStatusInputSchema,
	listGovernanceMeetingsInputSchema,
} from "./schemas";
import type { MeetingStore } from "./store";
import type {
	GetGovernanceMeetingInput,
	GetMeetingAttendanceInput,
	GetMeetingQuorumStatusInput,
	GovernanceMeeting,
	ListGovernanceMeetingsInput,
	MeetingParticipant,
	MeetingQuorumResult,
} from "./types";

export type MeetingQueryDependencies = Readonly<{
	meetingStore: MeetingStore;
}>;

export async function getGovernanceMeeting(
	input: GetGovernanceMeetingInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: MeetingQueryDependencies,
): Promise<Result<GovernanceMeeting | null>> {
	const parsed = parseCorporateAdministrationInput(
		getGovernanceMeetingInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "getGovernanceMeeting");
	if (!authorized.ok) return authorized;
	return dependencies.meetingStore.getGovernanceMeeting({
		organizationId: options.organizationId,
		governanceMeetingId: parsed.data.governanceMeetingId,
	});
}

export async function listGovernanceMeetings(
	input: ListGovernanceMeetingsInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: MeetingQueryDependencies,
): Promise<Result<readonly GovernanceMeeting[]>> {
	const parsed = parseCorporateAdministrationInput(
		listGovernanceMeetingsInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "listGovernanceMeetings");
	if (!authorized.ok) return authorized;
	return dependencies.meetingStore.listGovernanceMeetings({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		governanceBodyId: parsed.data.governanceBodyId,
		status: parsed.data.status,
	});
}

export async function getMeetingAttendance(
	input: GetMeetingAttendanceInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: MeetingQueryDependencies,
): Promise<Result<readonly MeetingParticipant[]>> {
	const parsed = parseCorporateAdministrationInput(
		getMeetingAttendanceInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "getMeetingAttendance");
	if (!authorized.ok) return authorized;
	return dependencies.meetingStore.listMeetingParticipants({
		organizationId: options.organizationId,
		governanceMeetingId: parsed.data.governanceMeetingId,
	});
}

export async function getMeetingQuorumStatus(
	input: GetMeetingQuorumStatusInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: MeetingQueryDependencies,
): Promise<Result<MeetingQuorumResult | null>> {
	const parsed = parseCorporateAdministrationInput(
		getMeetingQuorumStatusInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;
	const authorized = await authorize(options, "getMeetingQuorumStatus");
	if (!authorized.ok) return authorized;
	return dependencies.meetingStore.getLatestQuorumResult({
		organizationId: options.organizationId,
		governanceMeetingId: parsed.data.governanceMeetingId,
	});
}

function authorize(
	options: CorporateAdministrationQueryOptions,
	query: keyof typeof CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS[query],
	});
}
