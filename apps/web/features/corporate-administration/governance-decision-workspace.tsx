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
	adoptResolutionFormAction,
	assignResolutionActionFormAction,
	completeResolutionActionFormAction,
	type MeetingVoteActionResult,
	type ResolutionActionResult,
	type ResolutionImplementationActionResult,
	recordMeetingVoteFormAction,
	recordMinutesDocumentFormAction,
} from "@/app/actions/corporate-administration-governance-actions";

export type GovernanceDecisionMeeting = Readonly<{
	id: string;
	title: string;
	status: string;
	scheduledStartAt: string;
	version: number;
}>;

export type GovernanceDecisionResolution = Readonly<{
	id: string;
	code: string;
	title: string;
	status: string;
	effectiveFrom: string;
	version: number;
	minutesDocumentId: string | null;
}>;

export type GovernanceDecisionOverdueAction = Readonly<{
	id: string;
	resolutionId: string;
	actionTypeCode: string;
	dueOn: string;
	version: number;
}>;

export function GovernanceDecisionWorkspace({
	canManage,
	meetings,
	organizationSlug,
	overdueActions,
	resolutions,
}: Readonly<{
	canManage: boolean;
	meetings: readonly GovernanceDecisionMeeting[];
	organizationSlug: string;
	overdueActions: readonly GovernanceDecisionOverdueAction[];
	resolutions: readonly GovernanceDecisionResolution[];
}>) {
	const [voteState, voteAction] = useActionState<
		ActionResult<MeetingVoteActionResult> | null,
		FormData
	>(recordMeetingVoteFormAction, null);
	const [resolutionState, resolutionAction] = useActionState<
		ActionResult<ResolutionActionResult> | null,
		FormData
	>(adoptResolutionFormAction, null);
	const [assignmentState, assignmentAction] = useActionState<
		ActionResult<ResolutionImplementationActionResult> | null,
		FormData
	>(assignResolutionActionFormAction, null);
	const [completionState, completionAction] = useActionState<
		ActionResult<ResolutionImplementationActionResult> | null,
		FormData
	>(completeResolutionActionFormAction, null);
	const [minutesState, minutesAction] = useActionState<
		ActionResult<ResolutionActionResult> | null,
		FormData
	>(recordMinutesDocumentFormAction, null);

	return (
		<section
			aria-labelledby="governance-decisions-heading"
			className="space-y-6 border-t pt-6"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-medium text-lg" id="governance-decisions-heading">
						Governance decisions
					</h2>
					<p className="text-muted-foreground text-sm">
						Record meeting votes, adopted resolutions, minutes and accountable
						actions without exposing resolution text.
					</p>
				</div>
				<StatusBadge
					label={canManage ? "Decision recording available" : "Read only"}
					showIcon={false}
					status={canManage ? "success" : "inactive"}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Meetings</CardTitle>
						<CardDescription>
							Vote recording uses the selected meeting version for optimistic
							concurrency.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{meetings.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No governance meeting is available for vote recording.
							</p>
						) : (
							<Table aria-label="Governance meetings">
								<TableHeader>
									<TableRow>
										<TableHead>Meeting</TableHead>
										<TableHead>Status</TableHead>
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
											<TableCell>{meeting.version}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}

						<form action={voteAction} aria-label="Record meeting vote">
							<fieldset className="grid gap-4" disabled={!canManage}>
								<ActionMetadata organizationSlug={organizationSlug} />
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
								<TextField label="Motion code" name="motionCode" required />
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Eligible votes"
										min="1"
										name="eligibleVotes"
										required
										type="number"
									/>
									<TextField
										label="Votes for"
										min="0"
										name="votesFor"
										required
										type="number"
									/>
									<TextField
										label="Votes against"
										min="0"
										name="votesAgainst"
										required
										type="number"
									/>
									<TextField
										label="Abstentions"
										min="0"
										name="abstentions"
										required
										type="number"
									/>
								</div>
								<input
									name="thresholdType"
									type="hidden"
									value="simple_majority"
								/>
								<TextField label="Outcome basis" name="outcomeBasis" required />
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
									Record meeting vote
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={voteState} success={meetingVoteSuccess} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Adopt resolution</CardTitle>
						<CardDescription>
							The package verifies the vote outcome and chronology. The UI
							stores only a digest and document reference.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={resolutionAction} aria-label="Adopt resolution">
							<fieldset className="grid gap-4" disabled={!canManage}>
								<ActionMetadata organizationSlug={organizationSlug} />
								<TextField
									label="Meeting vote ID"
									name="meetingVoteId"
									required
								/>
								<TextField
									label="Resolution code"
									name="resolutionCode"
									required
								/>
								<TextField label="Resolution title" name="title" required />
								<TextField
									label="Resolution text digest (SHA-256)"
									name="textDigest"
									pattern="[0-9a-f]{64}"
									required
								/>
								<TextField
									label="Resolution document"
									name="documentId"
									required
								/>
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Effective from"
										name="effectiveFrom"
										required
										type="date"
									/>
									<TextField
										label="Approved at"
										name="approvedAt"
										required
										type="datetime-local"
									/>
								</div>
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected vote version"
									min="1"
									name="expectedVoteVersion"
									required
									type="number"
								/>
								<SubmitButton disabled={!canManage}>
									Adopt resolution
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback
							state={resolutionState}
							success={resolutionSuccess}
						/>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Resolution register</CardTitle>
					<CardDescription>
						Effective decisions and minutes evidence for the selected legal
						company.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{resolutions.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No resolution is effective as of today.
						</p>
					) : (
						<Table aria-label="Resolution register">
							<TableHeader>
								<TableRow>
									<TableHead>Resolution</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Minutes</TableHead>
									<TableHead>Version</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{resolutions.map((resolution) => (
									<TableRow key={resolution.id}>
										<TableCell>
											<div className="font-medium">{resolution.code}</div>
											<div className="text-foreground-secondary text-sm">
												{resolution.title}
											</div>
										</TableCell>
										<TableCell>{resolution.status}</TableCell>
										<TableCell>
											{resolution.minutesDocumentId ?? "Not recorded"}
										</TableCell>
										<TableCell>{resolution.version}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-3">
				<DecisionFormCard
					description="Bind an accountable party and due date to an adopted resolution."
					title="Assign implementation action"
				>
					<form action={assignmentAction} aria-label="Assign resolution action">
						<fieldset className="grid gap-4" disabled={!canManage}>
							<ActionMetadata organizationSlug={organizationSlug} />
							<TextField label="Resolution ID" name="resolutionId" required />
							<TextField
								label="Action type code"
								name="actionTypeCode"
								required
							/>
							<TextField
								label="Assignee party ID"
								name="assigneePartyId"
								required
							/>
							<TextField label="Due on" name="dueOn" required type="date" />
							<TextField
								label="Source document"
								name="sourceDocumentId"
								required
							/>
							<TextField
								label="Expected resolution version"
								min="1"
								name="expectedResolutionVersion"
								required
								type="number"
							/>
							<SubmitButton disabled={!canManage}>Assign action</SubmitButton>
						</fieldset>
					</form>
					<ActionFeedback state={assignmentState} success={assignmentSuccess} />
				</DecisionFormCard>

				<DecisionFormCard
					description="Attach a versioned minutes document reference to the resolution."
					title="Record minutes"
				>
					<form action={minutesAction} aria-label="Record resolution minutes">
						<fieldset className="grid gap-4" disabled={!canManage}>
							<ActionMetadata organizationSlug={organizationSlug} />
							<TextField label="Resolution ID" name="resolutionId" required />
							<TextField
								label="Minutes document"
								name="minutesDocumentId"
								required
							/>
							<TextField
								label="Source document"
								name="sourceDocumentId"
								required
							/>
							<TextField
								label="Expected resolution version"
								min="1"
								name="expectedVersion"
								required
								type="number"
							/>
							<SubmitButton disabled={!canManage}>Record minutes</SubmitButton>
						</fieldset>
					</form>
					<ActionFeedback state={minutesState} success={minutesSuccess} />
				</DecisionFormCard>

				<DecisionFormCard
					description="Completion requires evidence and preserves the action history."
					title="Complete implementation action"
				>
					<form
						action={completionAction}
						aria-label="Complete resolution action"
					>
						<fieldset className="grid gap-4" disabled={!canManage}>
							<ActionMetadata organizationSlug={organizationSlug} />
							<TextField
								label="Resolution action ID"
								name="resolutionActionId"
								required
							/>
							<TextField
								label="Completed at"
								name="completedAt"
								required
								type="datetime-local"
							/>
							<TextField
								label="Evidence document"
								name="evidenceDocumentId"
								required
							/>
							<TextField
								label="Source document"
								name="sourceDocumentId"
								required
							/>
							<TextField
								label="Expected action version"
								min="1"
								name="expectedVersion"
								required
								type="number"
							/>
							<SubmitButton disabled={!canManage}>Complete action</SubmitButton>
						</fieldset>
					</form>
					<ActionFeedback state={completionState} success={completionSuccess} />
				</DecisionFormCard>
			</div>

			{overdueActions.length === 0 ? null : (
				<Alert role="status">
					<AlertTitle>Overdue implementation actions</AlertTitle>
					<AlertDescription>
						{overdueActions.length} resolution action
						{overdueActions.length === 1 ? " is" : "s are"} overdue. The
						earliest due date is {overdueActions[0]?.dueOn}.
					</AlertDescription>
				</Alert>
			)}
		</section>
	);
}

function DecisionFormCard({
	children,
	description,
	title,
}: Readonly<{ children: ReactNode; description: string; title: string }>) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">{children}</CardContent>
		</Card>
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
				<AlertTitle>Governance change not saved</AlertTitle>
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

function meetingVoteSuccess(data: MeetingVoteActionResult): string {
	return `Vote ${data.meetingVoteId} recorded as ${data.outcome}.`;
}

function resolutionSuccess(data: ResolutionActionResult): string {
	return `Resolution ${data.resolutionId} adopted.`;
}

function assignmentSuccess(data: ResolutionImplementationActionResult): string {
	return `Action ${data.resolutionActionId} assigned.`;
}

function minutesSuccess(data: ResolutionActionResult): string {
	return `Minutes recorded for resolution ${data.resolutionId}.`;
}

function completionSuccess(data: ResolutionImplementationActionResult): string {
	return `Action ${data.resolutionActionId} completed.`;
}
