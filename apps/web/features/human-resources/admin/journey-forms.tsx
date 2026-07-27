"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { useActionState, useState } from "react";

import {
	type HrAdminJourneyActionState,
	runAssignmentJourneyAction,
	runEmploymentJourneyAction,
	runEmploymentLifecycleJourneyAction,
	startOffboardingJourneyAction,
	startOnboardingJourneyAction,
} from "@/app/actions/hr-admin-journeys";

type EmploymentContext = {
	employeeId: string;
	employmentId: string;
	employmentStatus: "active" | "notice" | "terminated";
	employmentVersion: number;
};

function JourneyFeedback({ state }: { state: HrAdminJourneyActionState }) {
	if (!state) return null;
	return state.ok ? (
		<Alert role="status">
			<AlertTitle>Employee record updated</AlertTitle>
			<AlertDescription>
				{state.data.operation.replaceAll("_", " ")} completed at version {state.data.version}.
			</AlertDescription>
		</Alert>
	) : (
		<FormError role="alert">{state.message}</FormError>
	);
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
	return (
		<Button type="submit" disabled={pending}>
			{pending ? <Spinner className="size-4" /> : null}
			{pending ? "Saving" : label}
		</Button>
	);
}

export function EmploymentJourneyForm({
	employeeId,
	employment,
	canManage,
}: {
	employeeId: string;
	employment: EmploymentContext | null;
	canManage: boolean;
}) {
	const [state, action, pending] = useActionState(runEmploymentJourneyAction, null);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Employment changes unavailable</AlertTitle>
				<AlertDescription>Your role has read-only access to this employee record.</AlertDescription>
			</Alert>
		);
	}
	const intents = employment
		? employment.employmentStatus === "terminated"
			? [{ value: "rehire", label: "Rehire employee" }]
			: employment.employmentStatus === "notice"
				? [
						{ value: "reactivate", label: "Reactivate employment" },
						{ value: "terminate", label: "Terminate employment" },
					]
				: [
						{ value: "suspend", label: "Place employment on notice" },
						{ value: "terminate", label: "Terminate employment" },
					]
		: [{ value: "hire", label: "Hire employee" }];
	return (
		<form action={action} aria-busy={pending} className="flex max-w-xl flex-col gap-4">
			<JourneyFeedback state={state} />
			<input type="hidden" name="employeeId" value={employeeId} />
			{employment ? <input type="hidden" name="employmentId" value={employment.employmentId} /> : null}
			{employment && employment.employmentStatus !== "terminated" ? (
				<input type="hidden" name="expectedVersion" value={employment.employmentVersion} />
			) : null}
			<FormField label="Employment transition" required fieldId="hr-employment-intent">
				<NativeSelect id="hr-employment-intent" name="intent" required disabled={pending}>
					{intents.map((intent) => (
						<NativeSelectOption key={intent.value} value={intent.value}>{intent.label}</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField label="Effective date" required fieldId="hr-employment-date">
				<Input id="hr-employment-date" name="effectiveOn" type="date" required disabled={pending} />
			</FormField>
			<SubmitButton pending={pending} label="Apply employment transition" />
		</form>
	);
}

export function AssignmentJourneyForm({
	context,
	assignment,
	positions,
	canManage,
}: {
	context: EmploymentContext;
	assignment: { id: string; version: number } | null;
	positions: Array<{ id: string; code: string; title: string }>;
	canManage: boolean;
}) {
	const [intent, setIntent] = useState<"transfer" | "end">("transfer");
	const [state, action, pending] = useActionState(runAssignmentJourneyAction, null);
	if (!canManage || !assignment) {
		return (
			<Alert role="status">
				<AlertTitle>Assignment changes unavailable</AlertTitle>
				<AlertDescription>
					{assignment ? "Your role has read-only access." : "No active assignment is available to change."}
				</AlertDescription>
			</Alert>
		);
	}
	return (
		<form action={action} aria-busy={pending} className="flex max-w-xl flex-col gap-4">
			<JourneyFeedback state={state} />
			<input type="hidden" name="employeeId" value={context.employeeId} />
			<input type="hidden" name="employmentId" value={context.employmentId} />
			<input type="hidden" name="assignmentId" value={assignment.id} />
			<input type="hidden" name="expectedVersion" value={assignment.version} />
			<FormField label="Assignment transition" required fieldId="hr-assignment-intent">
				<NativeSelect
					id="hr-assignment-intent"
					name="intent"
					value={intent}
					onChange={(event) => setIntent(event.target.value === "end" ? "end" : "transfer")}
					disabled={pending}
				>
					<NativeSelectOption value="transfer">Transfer to another position</NativeSelectOption>
					<NativeSelectOption value="end">End current assignment</NativeSelectOption>
				</NativeSelect>
			</FormField>
			{intent === "transfer" ? (
				<>
					<FormField label="Destination position" required fieldId="hr-assignment-position">
						<NativeSelect id="hr-assignment-position" name="toPositionId" required disabled={pending}>
							<NativeSelectOption value="">Select a position</NativeSelectOption>
							{positions.map((position) => (
								<NativeSelectOption key={position.id} value={position.id}>{position.code} · {position.title}</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>
					<FormField label="Transfer reason" required fieldId="hr-assignment-reason">
						<Textarea id="hr-assignment-reason" name="reason" required maxLength={500} disabled={pending} />
					</FormField>
				</>
			) : null}
			<FormField label="Effective date" required fieldId="hr-assignment-date">
				<Input id="hr-assignment-date" name="effectiveOn" type="date" required disabled={pending} />
			</FormField>
			<SubmitButton pending={pending} label={intent === "transfer" ? "Transfer assignment" : "End assignment"} />
		</form>
	);
}

export function EmploymentLifecycleJourneyForm({ context }: { context: EmploymentContext }) {
	const [intent, setIntent] = useState<"open_probation" | "propose_termination">("open_probation");
	const [state, action, pending] = useActionState(runEmploymentLifecycleJourneyAction, null);
	return (
		<form action={action} aria-busy={pending} className="flex max-w-xl flex-col gap-4">
			<JourneyFeedback state={state} />
			<input type="hidden" name="employeeId" value={context.employeeId} />
			<input type="hidden" name="employmentId" value={context.employmentId} />
			<FormField label="Lifecycle transition" required fieldId="hr-lifecycle-intent">
				<NativeSelect id="hr-lifecycle-intent" name="intent" value={intent} onChange={(event) => setIntent(event.target.value === "propose_termination" ? "propose_termination" : "open_probation")} disabled={pending}>
					<NativeSelectOption value="open_probation">Open probation review</NativeSelectOption>
					<NativeSelectOption value="propose_termination">Propose termination</NativeSelectOption>
				</NativeSelect>
			</FormField>
			{intent === "open_probation" ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<FormField label="Probation start" required fieldId="hr-probation-start"><Input id="hr-probation-start" name="startsOn" type="date" required disabled={pending} /></FormField>
					<FormField label="Probation end" required fieldId="hr-probation-end"><Input id="hr-probation-end" name="endsOn" type="date" required disabled={pending} /></FormField>
				</div>
			) : (
				<>
					<FormField label="Effective date" required fieldId="hr-termination-date"><Input id="hr-termination-date" name="effectiveOn" type="date" required disabled={pending} /></FormField>
					<FormField label="Reason code" required fieldId="hr-termination-code"><Input id="hr-termination-code" name="reasonCode" required maxLength={64} disabled={pending} /></FormField>
					<FormField label="Reason detail" required fieldId="hr-termination-detail"><Textarea id="hr-termination-detail" name="reasonDetail" required maxLength={2000} disabled={pending} /></FormField>
					<FormField label="Rehire eligibility" required fieldId="hr-rehire-eligible">
						<NativeSelect id="hr-rehire-eligible" name="rehireEligible" required disabled={pending}>
							<NativeSelectOption value="off">Not eligible</NativeSelectOption>
							<NativeSelectOption value="on">Eligible</NativeSelectOption>
						</NativeSelect>
					</FormField>
				</>
			)}
			<SubmitButton pending={pending} label={intent === "open_probation" ? "Open probation" : "Propose termination"} />
		</form>
	);
}

function CaseStartForm({ context, kind }: { context: EmploymentContext; kind: "onboarding" | "offboarding" }) {
	const action = kind === "onboarding" ? startOnboardingJourneyAction : startOffboardingJourneyAction;
	const [state, formAction, pending] = useActionState(action, null);
	return (
		<form action={formAction} aria-busy={pending} className="flex max-w-xl flex-col gap-4">
			<JourneyFeedback state={state} />
			<input type="hidden" name="employeeId" value={context.employeeId} />
			<input type="hidden" name="employmentId" value={context.employmentId} />
			<p className="text-sm text-muted-foreground">
				A governed {kind} case will be created with the standard identity, access, and operational checklist.
			</p>
			<SubmitButton pending={pending} label={`Start ${kind}`} />
		</form>
	);
}

export function OnboardingJourneyForm({ context }: { context: EmploymentContext }) {
	return <CaseStartForm context={context} kind="onboarding" />;
}

export function OffboardingJourneyForm({ context }: { context: EmploymentContext }) {
	return <CaseStartForm context={context} kind="offboarding" />;
}
