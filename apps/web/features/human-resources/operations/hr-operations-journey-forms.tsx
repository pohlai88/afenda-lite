// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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
} from "@/app/actions/_runtime/hr-admin-journeys";
import { detectComplianceExpiryOperationsAction } from "@/app/actions/hr-compliance";
import { openEmployeeCaseAction } from "@/app/actions/hr-employee-relations";
import { createHeadcountPlanAction } from "@/app/actions/hr-workforce-planning";

function ActionResult({
	state,
}: {
	state: { ok: boolean; message?: string } | null;
}) {
	if (!state) {
		return null;
	}
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
		<form action={action} aria-busy={pending} className="space-y-4">
			<EmploymentFields prefix="onboard" />
			<ActionResult state={state} />
			<Button disabled={pending} type="submit">
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
		<form action={action} aria-busy={pending} className="space-y-4">
			<EmploymentFields prefix="offboard" />
			<ActionResult state={state} />
			<Button disabled={pending} type="submit" variant="destructive">
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
		<form action={action} aria-busy={pending} className="space-y-4">
			<input name="intent" type="hidden" value="transfer" />
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
						required
						type="date"
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="transfer-reason">Reason</Label>
				<Textarea id="transfer-reason" maxLength={500} name="reason" required />
			</div>
			<ActionResult state={state} />
			<Button disabled={pending} type="submit">
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
		<form action={action} aria-busy={pending} className="space-y-4">
			<input name="intent" type="hidden" value="propose_termination" />
			<EmploymentFields prefix="termination" />
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="termination-date">Effective on</Label>
					<Input
						id="termination-date"
						name="effectiveOn"
						required
						type="date"
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
					maxLength={2000}
					name="reasonDetail"
					required
				/>
			</div>
			<Label>
				<input name="rehireEligible" type="checkbox" /> Rehire eligible
			</Label>
			<ActionResult state={state} />
			<Button disabled={pending} type="submit" variant="destructive">
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
				if (result.ok) {
					router.refresh();
				}
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
				type="button"
				variant="outline"
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
				<NativeSelect aria-label="Case type" name="caseType">
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
				<NativeSelect aria-label="Severity" name="severity">
					<NativeSelectOption value="low">Low</NativeSelectOption>
					<NativeSelectOption value="medium">Medium</NativeSelectOption>
					<NativeSelectOption value="high">High</NativeSelectOption>
					<NativeSelectOption value="critical">Critical</NativeSelectOption>
				</NativeSelect>
			</div>
			<Input
				aria-label="Classification code"
				name="classificationCode"
				placeholder="Classification code"
				required
			/>
			<Input
				aria-label="Owner user ID"
				name="ownerActorUserId"
				placeholder="Owner user ID"
				required
			/>
			<Textarea
				aria-label="Allegation summary"
				maxLength={500}
				name="allegationSummary"
				placeholder="Allegation summary"
				required
			/>
			<ActionResult state={state.feedback} />
			<Button disabled={state.pending} type="submit">
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
					aria-label="Plan code"
					name="code"
					placeholder="Plan code"
					required
				/>
				<Input
					aria-label="Plan title"
					name="title"
					placeholder="Plan title"
					required
				/>
				<Input
					aria-label="Planning scope key"
					name="planningScopeKey"
					placeholder="Planning scope key"
					required
				/>
				<Input
					aria-label="Period start"
					name="periodStart"
					required
					type="date"
				/>
				<Input aria-label="Period end" name="periodEnd" required type="date" />
			</div>
			<ActionResult state={state.feedback} />
			<Button disabled={state.pending} type="submit">
				{state.pending ? <Spinner /> : null}Create workforce plan
			</Button>
		</form>
	);
}
