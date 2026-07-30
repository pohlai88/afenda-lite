// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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

interface EmploymentContext {
	employeeId: string;
	employmentId: string;
	employmentStatus: "active" | "notice" | "terminated";
	employmentVersion: number;
}

function JourneyFeedback({ state }: { state: HrAdminJourneyActionState }) {
	if (!state) {
		return null;
	}
	return state.ok ? (
		<Alert role="status">
			<AlertTitle>Employee record updated</AlertTitle>
			<AlertDescription>
				{state.data.operation.replaceAll("_", " ")} completed at version{" "}
				{state.data.version}.
			</AlertDescription>
		</Alert>
	) : (
		<FormError role="alert">{state.message}</FormError>
	);
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
	return (
		<Button disabled={pending} type="submit">
			{pending ? <Spinner className="size-4" /> : null}
			{pending ? "Saving" : <span>{label}</span>}
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
	const [state, action, pending] = useActionState(
		runEmploymentJourneyAction,
		null,
	);
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Employment changes unavailable</AlertTitle>
				<AlertDescription>
					Your role has read-only access to this employee record.
				</AlertDescription>
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
		<form
			action={action}
			aria-busy={pending}
			className="flex max-w-xl flex-col gap-4"
		>
			<JourneyFeedback state={state} />
			<input name="employeeId" type="hidden" value={employeeId} />
			{employment ? (
				<input
					name="employmentId"
					type="hidden"
					value={employment.employmentId}
				/>
			) : null}
			{employment && employment.employmentStatus !== "terminated" ? (
				<input
					name="expectedVersion"
					type="hidden"
					value={employment.employmentVersion}
				/>
			) : null}
			<FormField
				fieldId="hr-employment-intent"
				label="Employment transition"
				required
			>
				<NativeSelect
					disabled={pending}
					id="hr-employment-intent"
					name="intent"
					required
				>
					{intents.map((intent) => (
						<NativeSelectOption key={intent.value} value={intent.value}>
							{intent.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField fieldId="hr-employment-date" label="Effective date" required>
				<Input
					disabled={pending}
					id="hr-employment-date"
					name="effectiveOn"
					required
					type="date"
				/>
			</FormField>
			<SubmitButton label="Apply employment transition" pending={pending} />
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
	const [state, action, pending] = useActionState(
		runAssignmentJourneyAction,
		null,
	);
	if (!(canManage && assignment)) {
		return (
			<Alert role="status">
				<AlertTitle>Assignment changes unavailable</AlertTitle>
				<AlertDescription>
					{assignment
						? "Your role has read-only access."
						: "No active assignment is available to change."}
				</AlertDescription>
			</Alert>
		);
	}
	return (
		<form
			action={action}
			aria-busy={pending}
			className="flex max-w-xl flex-col gap-4"
		>
			<JourneyFeedback state={state} />
			<input name="employeeId" type="hidden" value={context.employeeId} />
			<input name="employmentId" type="hidden" value={context.employmentId} />
			<input name="assignmentId" type="hidden" value={assignment.id} />
			<input name="expectedVersion" type="hidden" value={assignment.version} />
			<FormField
				fieldId="hr-assignment-intent"
				label="Assignment transition"
				required
			>
				<NativeSelect
					disabled={pending}
					id="hr-assignment-intent"
					name="intent"
					onChange={(event) =>
						setIntent(event.target.value === "end" ? "end" : "transfer")
					}
					value={intent}
				>
					<NativeSelectOption value="transfer">
						Transfer to another position
					</NativeSelectOption>
					<NativeSelectOption value="end">
						End current assignment
					</NativeSelectOption>
				</NativeSelect>
			</FormField>
			{intent === "transfer" ? (
				<>
					<FormField
						fieldId="hr-assignment-position"
						label="Destination position"
						required
					>
						<NativeSelect
							disabled={pending}
							id="hr-assignment-position"
							name="toPositionId"
							required
						>
							<NativeSelectOption value="">
								Select a position
							</NativeSelectOption>
							{positions.map((position) => (
								<NativeSelectOption key={position.id} value={position.id}>
									{position.code} · {position.title}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>
					<FormField
						fieldId="hr-assignment-reason"
						label="Transfer reason"
						required
					>
						<Textarea
							disabled={pending}
							id="hr-assignment-reason"
							maxLength={500}
							name="reason"
							required
						/>
					</FormField>
				</>
			) : null}
			<FormField fieldId="hr-assignment-date" label="Effective date" required>
				<Input
					disabled={pending}
					id="hr-assignment-date"
					name="effectiveOn"
					required
					type="date"
				/>
			</FormField>
			<SubmitButton
				label={intent === "transfer" ? "Transfer assignment" : "End assignment"}
				pending={pending}
			/>
		</form>
	);
}

export function EmploymentLifecycleJourneyForm({
	context,
}: {
	context: EmploymentContext;
}) {
	const [intent, setIntent] = useState<
		"open_probation" | "propose_termination"
	>("open_probation");
	const [state, action, pending] = useActionState(
		runEmploymentLifecycleJourneyAction,
		null,
	);
	return (
		<form
			action={action}
			aria-busy={pending}
			className="flex max-w-xl flex-col gap-4"
		>
			<JourneyFeedback state={state} />
			<input name="employeeId" type="hidden" value={context.employeeId} />
			<input name="employmentId" type="hidden" value={context.employmentId} />
			<FormField
				fieldId="hr-lifecycle-intent"
				label="Lifecycle transition"
				required
			>
				<NativeSelect
					disabled={pending}
					id="hr-lifecycle-intent"
					name="intent"
					onChange={(event) =>
						setIntent(
							event.target.value === "propose_termination"
								? "propose_termination"
								: "open_probation",
						)
					}
					value={intent}
				>
					<NativeSelectOption value="open_probation">
						Open probation review
					</NativeSelectOption>
					<NativeSelectOption value="propose_termination">
						Propose termination
					</NativeSelectOption>
				</NativeSelect>
			</FormField>
			{intent === "open_probation" ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<FormField
						fieldId="hr-probation-start"
						label="Probation start"
						required
					>
						<Input
							disabled={pending}
							id="hr-probation-start"
							name="startsOn"
							required
							type="date"
						/>
					</FormField>
					<FormField fieldId="hr-probation-end" label="Probation end" required>
						<Input
							disabled={pending}
							id="hr-probation-end"
							name="endsOn"
							required
							type="date"
						/>
					</FormField>
				</div>
			) : (
				<>
					<FormField
						fieldId="hr-termination-date"
						label="Effective date"
						required
					>
						<Input
							disabled={pending}
							id="hr-termination-date"
							name="effectiveOn"
							required
							type="date"
						/>
					</FormField>
					<FormField fieldId="hr-termination-code" label="Reason code" required>
						<Input
							disabled={pending}
							id="hr-termination-code"
							maxLength={64}
							name="reasonCode"
							required
						/>
					</FormField>
					<FormField
						fieldId="hr-termination-detail"
						label="Reason detail"
						required
					>
						<Textarea
							disabled={pending}
							id="hr-termination-detail"
							maxLength={2000}
							name="reasonDetail"
							required
						/>
					</FormField>
					<FormField
						fieldId="hr-rehire-eligible"
						label="Rehire eligibility"
						required
					>
						<NativeSelect
							disabled={pending}
							id="hr-rehire-eligible"
							name="rehireEligible"
							required
						>
							<NativeSelectOption value="off">Not eligible</NativeSelectOption>
							<NativeSelectOption value="on">Eligible</NativeSelectOption>
						</NativeSelect>
					</FormField>
				</>
			)}
			<SubmitButton
				label={
					intent === "open_probation" ? "Open probation" : "Propose termination"
				}
				pending={pending}
			/>
		</form>
	);
}

function CaseStartForm({
	context,
	kind,
}: {
	context: EmploymentContext;
	kind: "onboarding" | "offboarding";
}) {
	const action =
		kind === "onboarding"
			? startOnboardingJourneyAction
			: startOffboardingJourneyAction;
	const [state, formAction, pending] = useActionState(action, null);
	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-xl flex-col gap-4"
		>
			<JourneyFeedback state={state} />
			<input name="employeeId" type="hidden" value={context.employeeId} />
			<input name="employmentId" type="hidden" value={context.employmentId} />
			<p className="text-muted-foreground text-sm">
				A governed {kind} case will be created with the standard identity,
				access, and operational checklist.
			</p>
			<SubmitButton label={`Start ${kind}`} pending={pending} />
		</form>
	);
}

export function OnboardingJourneyForm({
	context,
}: {
	context: EmploymentContext;
}) {
	return <CaseStartForm context={context} kind="onboarding" />;
}

export function OffboardingJourneyForm({
	context,
}: {
	context: EmploymentContext;
}) {
	return <CaseStartForm context={context} kind="offboarding" />;
}
// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
