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
	if (state === null) {
		return null;
	}
	if (!state.ok) {
		return <FormError>{state.message}</FormError>;
	}
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
					<Input id="leave-start" name="startDate" required type="date" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="leave-end">End date</Label>
					<Input id="leave-end" name="endDate" required type="date" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="leave-quantity">Quantity</Label>
					<Input
						id="leave-quantity"
						inputMode="decimal"
						name="requestedQuantity"
						required
					/>
				</div>
			</div>
			<JourneyResult state={state} />
			<Button disabled={pending} type="submit">
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
				<input name="requestId" type="hidden" value={request.id} />
				<input name="expectedVersion" type="hidden" value={request.version} />
				<Label htmlFor={`cancel-note-${request.id}`}>Cancellation note</Label>
				<Textarea
					id={`cancel-note-${request.id}`}
					maxLength={2000}
					name="note"
				/>
				<JourneyResult state={state} />
				<Button disabled={pending} type="submit" variant="destructive">
					{pending ? <Spinner /> : null}
					Cancel approved leave
				</Button>
			</form>
		);
	}
	if (request.status !== "draft" && request.status !== "submitted") {
		return null;
	}
	const [state, action, pending] = transition;
	const intent = request.status === "draft" ? "submit" : "withdraw";
	return (
		<form action={action} aria-busy={pending} className="space-y-3">
			<input name="requestId" type="hidden" value={request.id} />
			<input name="expectedVersion" type="hidden" value={request.version} />
			<input name="intent" type="hidden" value={intent} />
			<JourneyResult state={state} />
			<Button disabled={pending} type="submit" variant="outline">
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
			<input name="timesheetId" type="hidden" value={timesheet.id} />
			<input name="expectedVersion" type="hidden" value={timesheet.version} />
			<JourneyResult state={state} />
			<Button disabled={pending} type="submit">
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
				name="acknowledgementId"
				type="hidden"
				value={acknowledgement.id}
			/>
			<input
				name="expectedVersion"
				type="hidden"
				value={acknowledgement.version}
			/>
			<JourneyResult state={state} />
			<Button disabled={pending} type="submit" variant="outline">
				{pending ? <Spinner /> : null}
				Acknowledge policy
			</Button>
		</form>
	);
}
