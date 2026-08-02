import type { Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../internal/query";
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

export type MeetingQueryDependencies =
	CorporateAdministrationQueryKernelDependencies &
		Readonly<{
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
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getGovernanceMeeting",
		options,
		dependencies,
		work: () =>
			dependencies.meetingStore.getGovernanceMeeting({
				organizationId: options.organizationId,
				governanceMeetingId: parsed.data.governanceMeetingId,
			}),
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
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listGovernanceMeetings",
		options,
		dependencies,
		work: () =>
			dependencies.meetingStore.listGovernanceMeetings({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				governanceBodyId: parsed.data.governanceBodyId,
				status: parsed.data.status,
			}),
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
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getMeetingAttendance",
		options,
		dependencies,
		work: () =>
			dependencies.meetingStore.listMeetingParticipants({
				organizationId: options.organizationId,
				governanceMeetingId: parsed.data.governanceMeetingId,
			}),
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
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getMeetingQuorumStatus",
		options,
		dependencies,
		work: () =>
			dependencies.meetingStore.getLatestQuorumResult({
				organizationId: options.organizationId,
				governanceMeetingId: parsed.data.governanceMeetingId,
			}),
	});
}
