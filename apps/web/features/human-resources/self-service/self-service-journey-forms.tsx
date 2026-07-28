"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	acknowledgeOwnPolicyAction,
	cancelOwnApprovedLeaveAction,
	changeOwnLeaveRequestAction,
	createOwnLeaveDraftAction,
	submitOwnTimesheetAction,
} from "@/app/actions/hr-self-service-journeys";

function JourneyResult({
	state,
}: {
	state: { ok: boolean; message?: string } | null;
}) {
	if (state === null) return null;
	if (!state.ok) return <FormError>{state.message}</FormError>;
	return (
		<Alert role="status">
			<AlertTitle>Request completed</AlertTitle>
			<AlertDescription>Your employee record is up to date.</AlertDescription>
		</Alert>
	);
}

export function LeaveDraftForm({
	entitlements,
}: {
	entitlements: Array<{ id: string; label: string }>;
}) {
	const [state, action, pending] = useActionState(
		createOwnLeaveDraftAction,
		null,
	);
	return (
		<form action={action} aria-busy={pending} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="leave-entitlement">Leave entitlement</Label>
				<NativeSelect id="leave-entitlement" name="entitlementId" required>
					{entitlements.map((entitlement) => (
						<NativeSelectOption key={entitlement.id} value={entitlement.id}>
							{entitlement.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="leave-start">Start date</Label>
					<Input id="leave-start" name="startDate" type="date" required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="leave-end">End date</Label>
					<Input id="leave-end" name="endDate" type="date" required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="leave-quantity">Quantity</Label>
					<Input
						id="leave-quantity"
						name="requestedQuantity"
						inputMode="decimal"
						required
					/>
				</div>
			</div>
			<JourneyResult state={state} />
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create leave draft
			</Button>
		</form>
	);
}

export function LeaveRequestTransitionForm({
	request,
	canCancelApproved,
}: {
	request: { id: string; status: string; version: number };
	canCancelApproved: boolean;
}) {
	const transition = useActionState(changeOwnLeaveRequestAction, null);
	const cancel = useActionState(cancelOwnApprovedLeaveAction, null);
	if (request.status === "approved" && canCancelApproved) {
		const [state, action, pending] = cancel;
		return (
			<form action={action} aria-busy={pending} className="space-y-3">
				<input type="hidden" name="requestId" value={request.id} />
				<input type="hidden" name="expectedVersion" value={request.version} />
				<Label htmlFor={`cancel-note-${request.id}`}>Cancellation note</Label>
				<Textarea
					id={`cancel-note-${request.id}`}
					name="note"
					maxLength={2000}
				/>
				<JourneyResult state={state} />
				<Button type="submit" variant="destructive" disabled={pending}>
					{pending ? <Spinner /> : null}
					Cancel approved leave
				</Button>
			</form>
		);
	}
	if (request.status !== "draft" && request.status !== "submitted") return null;
	const [state, action, pending] = transition;
	const intent = request.status === "draft" ? "submit" : "withdraw";
	return (
		<form action={action} aria-busy={pending} className="space-y-3">
			<input type="hidden" name="requestId" value={request.id} />
			<input type="hidden" name="expectedVersion" value={request.version} />
			<input type="hidden" name="intent" value={intent} />
			<JourneyResult state={state} />
			<Button type="submit" variant="outline" disabled={pending}>
				{pending ? <Spinner /> : null}
				{intent === "submit" ? "Submit request" : "Withdraw request"}
			</Button>
		</form>
	);
}

export function TimesheetSubmitForm({
	timesheet,
}: {
	timesheet: { id: string; version: number };
}) {
	const [state, action, pending] = useActionState(
		submitOwnTimesheetAction,
		null,
	);
	return (
		<form action={action} aria-busy={pending} className="space-y-3">
			<input type="hidden" name="timesheetId" value={timesheet.id} />
			<input type="hidden" name="expectedVersion" value={timesheet.version} />
			<JourneyResult state={state} />
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Submit timesheet
			</Button>
		</form>
	);
}

export function PolicyAcknowledgementForm({
	acknowledgement,
}: {
	acknowledgement: { id: string; version: number };
}) {
	const [state, action, pending] = useActionState(
		acknowledgeOwnPolicyAction,
		null,
	);
	return (
		<form action={action} aria-busy={pending} className="space-y-3">
			<input
				type="hidden"
				name="acknowledgementId"
				value={acknowledgement.id}
			/>
			<input
				type="hidden"
				name="expectedVersion"
				value={acknowledgement.version}
			/>
			<JourneyResult state={state} />
			<Button type="submit" variant="outline" disabled={pending}>
				{pending ? <Spinner /> : null}
				Acknowledge policy
			</Button>
		</form>
	);
}
