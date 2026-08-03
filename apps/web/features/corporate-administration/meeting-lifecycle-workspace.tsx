"use client";

import type { Result as ActionResult } from "@afenda/errors";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Label,
	NativeSelect,
	NativeSelectOption,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TextField,
} from "@afenda/ui-system";
import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
	type MeetingParticipantActionResult,
	type MeetingQuorumActionResult,
	type MeetingScheduleActionResult,
	recordMeetingParticipantFormAction,
	recordQuorumFormAction,
	scheduleGovernanceMeetingFormAction,
} from "@/app/actions/corporate-administration-governance-actions";

export type MeetingLifecycleBody = Readonly<{
	id: string;
	displayName: string;
	bodyType: string;
	status: string;
	version: number;
}>;

export type MeetingLifecycleMembership = Readonly<{
	id: string;
	governanceBodyId: string;
	seatLabel: string;
	membershipRole: string;
}>;

export type MeetingLifecycleMeeting = Readonly<{
	id: string;
	title: string;
	status: string;
	scheduledStartAt: string;
	quorum: Readonly<{ hasQuorum: boolean; presentMemberCount: number }> | null;
	version: number;
}>;

const PROCEDURE_TYPES = [
	"physical",
	"virtual",
	"hybrid",
	"written_resolution",
] as const;

const ATTENDANCE_STATUSES = [
	"present",
	"absent",
	"represented",
	"recused",
] as const;

export function MeetingLifecycleWorkspace({
	bodies,
	canManage,
	legalCompanyId,
	meetings,
	memberships,
	organizationSlug,
}: Readonly<{
	bodies: readonly MeetingLifecycleBody[];
	canManage: boolean;
	legalCompanyId: string;
	meetings: readonly MeetingLifecycleMeeting[];
	memberships: readonly MeetingLifecycleMembership[];
	organizationSlug: string;
}>) {
	const [scheduleState, scheduleAction] = useActionState<
		ActionResult<MeetingScheduleActionResult> | null,
		FormData
	>(scheduleGovernanceMeetingFormAction, null);
	const [participantState, participantAction] = useActionState<
		ActionResult<MeetingParticipantActionResult> | null,
		FormData
	>(recordMeetingParticipantFormAction, null);
	const [quorumState, quorumAction] = useActionState<
		ActionResult<MeetingQuorumActionResult> | null,
		FormData
	>(recordQuorumFormAction, null);

	return (
		<section
			aria-labelledby="meeting-lifecycle-heading"
			className="space-y-6 border-t pt-6"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-medium text-lg" id="meeting-lifecycle-heading">
						Meetings
					</h2>
					<p className="text-muted-foreground text-sm">
						Schedule governance meetings, record attendance, and record
						package-derived quorum before decisions are taken.
					</p>
				</div>
				<StatusBadge
					label={canManage ? "Meeting changes available" : "Read only"}
					showIcon={false}
					status={canManage ? "success" : "inactive"}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Scheduled meetings</CardTitle>
					<CardDescription>
						Quorum reflects the recorded package result, never a UI calculation.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{meetings.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No governance meeting is scheduled for this company.
						</p>
					) : (
						<Table aria-label="Scheduled governance meetings">
							<TableHeader>
								<TableRow>
									<TableHead>Meeting</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Quorum</TableHead>
									<TableHead>Version</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{meetings.map((meeting) => (
									<TableRow key={meeting.id}>
										<TableCell>
											<div className="font-medium">{meeting.title}</div>
											<div className="text-foreground-tertiary text-xs">
												{meeting.scheduledStartAt}
											</div>
										</TableCell>
										<TableCell>{meeting.status}</TableCell>
										<TableCell>{quorumLabel(meeting.quorum)}</TableCell>
										<TableCell>{meeting.version}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Schedule meeting</CardTitle>
						<CardDescription>
							Uses the governance body version for optimistic concurrency.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form
							action={scheduleAction}
							aria-label="Schedule governance meeting"
						>
							<fieldset
								className="grid gap-4"
								disabled={!canManage || bodies.length === 0}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<div className="grid gap-2">
									<Label htmlFor="governanceBodyId">Governance body</Label>
									<NativeSelect
										id="governanceBodyId"
										name="governanceBodyId"
										required
									>
										{bodies.map((body) => (
											<NativeSelectOption key={body.id} value={body.id}>
												{body.displayName} ({body.bodyType})
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<input
									name="legalCompanyId"
									type="hidden"
									value={legalCompanyId}
								/>
								<EnumSelect
									label="Procedure"
									name="procedureType"
									options={PROCEDURE_TYPES}
								/>
								<TextField label="Title" name="title" required />
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Scheduled start"
										name="scheduledStartAt"
										required
										type="datetime-local"
									/>
									<TextField
										label="Scheduled end"
										name="scheduledEndAt"
										type="datetime-local"
									/>
								</div>
								<TextField
									label="Notice period (days)"
									min="0"
									name="noticePeriodDays"
									required
									type="number"
								/>
								<TextField label="Location" name="locationSummary" />
								<TextField label="Remote access" name="remoteAccessSummary" />
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected body version"
									min="1"
									name="expectedBodyVersion"
									required
									type="number"
								/>
								<SubmitButton disabled={!canManage || bodies.length === 0}>
									Schedule meeting
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={scheduleState} success={scheduleSuccess} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Record attendance</CardTitle>
						<CardDescription>
							Attendance is recorded per governance membership against the
							selected meeting version.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form
							action={participantAction}
							aria-label="Record meeting attendance"
						>
							<fieldset
								className="grid gap-4"
								disabled={
									!canManage ||
									meetings.length === 0 ||
									memberships.length === 0
								}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<MeetingSelect meetings={meetings} />
								<div className="grid gap-2">
									<Label htmlFor="governanceMembershipId">Membership</Label>
									<NativeSelect
										id="governanceMembershipId"
										name="governanceMembershipId"
										required
									>
										{memberships.map((membership) => (
											<NativeSelectOption
												key={membership.id}
												value={membership.id}
											>
												{membership.seatLabel} ({membership.membershipRole})
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<EnumSelect
									label="Attendance"
									name="attendanceStatus"
									options={ATTENDANCE_STATUSES}
								/>
								<TextField
									label="Represented by (party)"
									name="representedByPartyId"
								/>
								<TextField label="Proxy document" name="proxyDocumentId" />
								<TextField label="Recusal reason" name="recusalReason" />
								<TextField
									label="Expected meeting version"
									min="1"
									name="expectedMeetingVersion"
									required
									type="number"
								/>
								<SubmitButton
									disabled={
										!canManage ||
										meetings.length === 0 ||
										memberships.length === 0
									}
								>
									Record attendance
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback
							state={participantState}
							success={participantSuccess}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Record quorum</CardTitle>
						<CardDescription>
							The package derives the quorum outcome from recorded attendance;
							the form supplies only the rule facts.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={quorumAction} aria-label="Record meeting quorum">
							<fieldset
								className="grid gap-4"
								disabled={!canManage || meetings.length === 0}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<MeetingSelect meetings={meetings} />
								<TextField label="Quorum rule code" name="ruleCode" required />
								<TextField
									label="Required present count"
									min="1"
									name="requiredPresentCount"
									required
									type="number"
								/>
								<div className="grid gap-2">
									<Label htmlFor="eligibleVotingOnly">
										Count eligible voters only
									</Label>
									<NativeSelect
										id="eligibleVotingOnly"
										name="eligibleVotingOnly"
										required
									>
										<NativeSelectOption value="true">Yes</NativeSelectOption>
										<NativeSelectOption value="false">No</NativeSelectOption>
									</NativeSelect>
								</div>
								<TextField label="No-quorum reason" name="noQuorumReason" />
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected meeting version"
									min="1"
									name="expectedMeetingVersion"
									required
									type="number"
								/>
								<SubmitButton disabled={!canManage || meetings.length === 0}>
									Record quorum
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={quorumState} success={quorumSuccess} />
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

function MeetingSelect({
	meetings,
}: Readonly<{ meetings: readonly MeetingLifecycleMeeting[] }>) {
	return (
		<div className="grid gap-2">
			<Label htmlFor="governanceMeetingId">Meeting</Label>
			<NativeSelect
				id="governanceMeetingId"
				name="governanceMeetingId"
				required
			>
				{meetings.map((meeting) => (
					<NativeSelectOption key={meeting.id} value={meeting.id}>
						{meeting.title}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

function EnumSelect({
	label,
	name,
	options,
}: Readonly<{
	label: string;
	name: string;
	options: readonly string[];
}>) {
	return (
		<div className="grid gap-2">
			<Label htmlFor={name}>{label}</Label>
			<NativeSelect id={name} name={name} required>
				{options.map((option) => (
					<NativeSelectOption key={option} value={option}>
						{option}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

function ActionMetadata({
	organizationSlug,
}: Readonly<{ organizationSlug: string }>) {
	return (
		<input name="organizationSlug" type="hidden" value={organizationSlug} />
	);
}

function SubmitButton({
	children,
	disabled,
}: Readonly<{ children: ReactNode; disabled: boolean }>) {
	const status = useFormStatus();
	return (
		<Button
			aria-busy={status.pending}
			disabled={disabled || status.pending}
			type="submit"
		>
			{status.pending ? "Saving…" : <span>{children}</span>}
		</Button>
	);
}

function ActionFeedback<T>({
	state,
	success,
}: Readonly<{ state: ActionResult<T> | null; success: (data: T) => string }>) {
	if (state === null) {
		return null;
	}
	if (!state.ok) {
		return (
			<Alert role="alert" variant="destructive">
				<AlertTitle>Meeting change not saved</AlertTitle>
				<AlertDescription>{state.message}</AlertDescription>
			</Alert>
		);
	}
	return (
		<p className="text-sm text-success-subtle-foreground" role="status">
			{success(state.data)}
		</p>
	);
}

function quorumLabel(quorum: MeetingLifecycleMeeting["quorum"]): string {
	if (quorum === null) {
		return "Not recorded";
	}
	return quorum.hasQuorum
		? `Achieved (${quorum.presentMemberCount} present)`
		: `Not achieved (${quorum.presentMemberCount} present)`;
}

function scheduleSuccess(data: MeetingScheduleActionResult): string {
	return `Meeting ${data.governanceMeetingId} scheduled (${data.status}).`;
}

function participantSuccess(data: MeetingParticipantActionResult): string {
	return `Attendance recorded as ${data.attendanceStatus}.`;
}

function quorumSuccess(data: MeetingQuorumActionResult): string {
	return data.hasQuorum
		? "Quorum recorded as achieved."
		: "Quorum recorded as not achieved.";
}
