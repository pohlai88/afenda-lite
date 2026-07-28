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
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
	runAssignmentJourneyAction,
	runEmploymentLifecycleJourneyAction,
	startOffboardingJourneyAction,
	startOnboardingJourneyAction,
} from "@/app/actions/hr-admin-journeys";
import { detectComplianceExpiryOperationsAction } from "@/app/actions/hr-compliance";
import { openEmployeeCaseAction } from "@/app/actions/hr-employee-relations";
import { createHeadcountPlanAction } from "@/app/actions/hr-workforce-planning";

function ActionResult({
	state,
}: {
	state: { ok: boolean; message?: string } | null;
}) {
	if (!state) return null;
	return state.ok ? (
		<Alert role="status">
			<AlertTitle>Journey completed</AlertTitle>
			<AlertDescription>
				The operations workspace is refreshing.
			</AlertDescription>
		</Alert>
	) : (
		<FormError>{state.message}</FormError>
	);
}

function EmploymentFields({ prefix }: { prefix: string }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="space-y-2">
				<Label htmlFor={`${prefix}-employee`}>Employee ID</Label>
				<Input id={`${prefix}-employee`} name="employeeId" required />
			</div>
			<div className="space-y-2">
				<Label htmlFor={`${prefix}-employment`}>Employment ID</Label>
				<Input id={`${prefix}-employment`} name="employmentId" required />
			</div>
		</div>
	);
}

export function OnboardingLaunchForm() {
	const [state, action, pending] = useActionState(
		startOnboardingJourneyAction,
		null,
	);
	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<EmploymentFields prefix="onboard" />
			<ActionResult state={state} />
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}Start onboarding
			</Button>
		</form>
	);
}

export function OffboardingLaunchForm() {
	const [state, action, pending] = useActionState(
		startOffboardingJourneyAction,
		null,
	);
	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<EmploymentFields prefix="offboard" />
			<ActionResult state={state} />
			<Button type="submit" variant="destructive" disabled={pending}>
				{pending ? <Spinner /> : null}Start offboarding
			</Button>
		</form>
	);
}

export function TransferLaunchForm() {
	const [state, action, pending] = useActionState(
		runAssignmentJourneyAction,
		null,
	);
	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<input type="hidden" name="intent" value="transfer" />
			<EmploymentFields prefix="transfer" />
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="transfer-position">Destination position ID</Label>
					<Input id="transfer-position" name="toPositionId" required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="transfer-effective">Effective on</Label>
					<Input
						id="transfer-effective"
						name="effectiveOn"
						type="date"
						required
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="transfer-reason">Reason</Label>
				<Textarea id="transfer-reason" name="reason" required maxLength={500} />
			</div>
			<ActionResult state={state} />
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}Transfer assignment
			</Button>
		</form>
	);
}

export function TerminationLaunchForm() {
	const [state, action, pending] = useActionState(
		runEmploymentLifecycleJourneyAction,
		null,
	);
	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<input type="hidden" name="intent" value="propose_termination" />
			<EmploymentFields prefix="termination" />
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="termination-date">Effective on</Label>
					<Input
						id="termination-date"
						name="effectiveOn"
						type="date"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="termination-code">Reason code</Label>
					<Input id="termination-code" name="reasonCode" required />
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="termination-detail">Reason detail</Label>
				<Textarea
					id="termination-detail"
					name="reasonDetail"
					required
					maxLength={2000}
				/>
			</div>
			<Label>
				<input type="checkbox" name="rehireEligible" /> Rehire eligible
			</Label>
			<ActionResult state={state} />
			<Button type="submit" variant="destructive" disabled={pending}>
				{pending ? <Spinner /> : null}Propose termination
			</Button>
		</form>
	);
}

function useJsonJourney() {
	const router = useRouter();
	const [feedback, setFeedback] = useState<{
		ok: boolean;
		message: string;
	} | null>(null);
	const [pending, start] = useTransition();
	return {
		feedback,
		pending,
		run(
			action: () => Promise<{ ok: boolean; message?: string }>,
			success: string,
		) {
			start(async () => {
				const result = await action();
				setFeedback({
					ok: result.ok,
					message: result.ok
						? success
						: (result.message ?? "The journey could not be completed."),
				});
				if (result.ok) router.refresh();
			});
		},
	};
}

export function ComplianceScanForm() {
	const state = useJsonJourney();
	return (
		<div className="space-y-3">
			<ActionResult state={state.feedback} />
			<Button
				type="button"
				variant="outline"
				disabled={state.pending}
				onClick={() =>
					state.run(
						() =>
							detectComplianceExpiryOperationsAction({
								asOf: new Date().toISOString().slice(0, 10),
								withinDays: 90,
							}),
						"Compliance expiry scan completed.",
					)
				}
			>
				{state.pending ? <Spinner /> : null}Run expiry scan
			</Button>
		</div>
	);
}

export function CaseOpenForm() {
	const state = useJsonJourney();
	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						openEmployeeCaseAction({
							idempotencyKey: crypto.randomUUID(),
							employeeId: data.get("employeeId"),
							employmentId: data.get("employmentId"),
							caseType: data.get("caseType"),
							severity: data.get("severity"),
							allegationSummary: data.get("allegationSummary"),
							classificationCode: data.get("classificationCode"),
							ownerActorUserId: data.get("ownerActorUserId"),
						}),
					"Employee case opened.",
				);
			}}
		>
			<EmploymentFields prefix="case" />
			<div className="grid gap-4 sm:grid-cols-2">
				<NativeSelect name="caseType" aria-label="Case type">
					<NativeSelectOption value="grievance">Grievance</NativeSelectOption>
					<NativeSelectOption value="conduct">Conduct</NativeSelectOption>
					<NativeSelectOption value="workplace_conflict">
						Workplace conflict
					</NativeSelectOption>
					<NativeSelectOption value="harassment">Harassment</NativeSelectOption>
					<NativeSelectOption value="policy_breach">
						Policy breach
					</NativeSelectOption>
					<NativeSelectOption value="disciplinary_review">
						Disciplinary review
					</NativeSelectOption>
				</NativeSelect>
				<NativeSelect name="severity" aria-label="Severity">
					<NativeSelectOption value="low">Low</NativeSelectOption>
					<NativeSelectOption value="medium">Medium</NativeSelectOption>
					<NativeSelectOption value="high">High</NativeSelectOption>
					<NativeSelectOption value="critical">Critical</NativeSelectOption>
				</NativeSelect>
			</div>
			<Input
				name="classificationCode"
				aria-label="Classification code"
				placeholder="Classification code"
				required
			/>
			<Input
				name="ownerActorUserId"
				aria-label="Owner user ID"
				placeholder="Owner user ID"
				required
			/>
			<Textarea
				name="allegationSummary"
				aria-label="Allegation summary"
				placeholder="Allegation summary"
				required
				maxLength={500}
			/>
			<ActionResult state={state.feedback} />
			<Button type="submit" disabled={state.pending}>
				{state.pending ? <Spinner /> : null}Open case
			</Button>
		</form>
	);
}

export function WorkforcePlanCreateForm() {
	const state = useJsonJourney();
	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createHeadcountPlanAction({
							idempotencyKey: crypto.randomUUID(),
							code: data.get("code"),
							title: data.get("title"),
							planningScopeKey: data.get("planningScopeKey"),
							periodStart: data.get("periodStart"),
							periodEnd: data.get("periodEnd"),
						}),
					"Workforce plan created.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Input
					name="code"
					aria-label="Plan code"
					placeholder="Plan code"
					required
				/>
				<Input
					name="title"
					aria-label="Plan title"
					placeholder="Plan title"
					required
				/>
				<Input
					name="planningScopeKey"
					aria-label="Planning scope key"
					placeholder="Planning scope key"
					required
				/>
				<Input
					name="periodStart"
					aria-label="Period start"
					type="date"
					required
				/>
				<Input name="periodEnd" aria-label="Period end" type="date" required />
			</div>
			<ActionResult state={state.feedback} />
			<Button type="submit" disabled={state.pending}>
				{state.pending ? <Spinner /> : null}Create workforce plan
			</Button>
		</form>
	);
}
