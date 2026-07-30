// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Input,
	Label,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createBenefitPlanAction } from "@/app/actions/hr-benefits";
import {
	createCompensationGradeAction,
	createSalaryBandAction,
	getApprovedCompensationHandoffAction,
	listEmployeeCompensationsByEmployeeAction,
} from "@/app/actions/hr-compensation";
import { createCompensationReviewCycleAction } from "@/app/actions/hr-compensation-review";

type Feedback = { ok: boolean; message: string } | null;

function useJourney() {
	const router = useRouter();
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [pending, startTransition] = useTransition();
	return {
		feedback,
		pending,
		run(
			action: () => Promise<{ ok: boolean; message?: string }>,
			success: string,
		) {
			startTransition(async () => {
				const result = await action();
				setFeedback({
					ok: result.ok,
					message: result.ok
						? success
						: (result.message ?? "The request could not be completed."),
				});
				if (result.ok) {
					router.refresh();
				}
			});
		},
	};
}

function Notice({ feedback }: { feedback: Feedback }) {
	return feedback ? (
		<Alert
			role={feedback.ok ? "status" : "alert"}
			variant={feedback.ok ? "default" : "destructive"}
		>
			<AlertTitle>{feedback.ok ? "Completed" : "Request failed"}</AlertTitle>
			<AlertDescription>{feedback.message}</AlertDescription>
		</Alert>
	) : null;
}

const value = (data: FormData, name: string) => data.get(name);

export function GradeCreateForm() {
	const state = useJourney();
	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createCompensationGradeAction({
							code: value(data, "code"),
							name: value(data, "name"),
						}),
					"Compensation grade created.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Input
					aria-label="Grade code"
					name="code"
					placeholder="Grade code"
					required
				/>
				<Input
					aria-label="Grade name"
					name="name"
					placeholder="Grade name"
					required
				/>
			</div>
			<Notice feedback={state.feedback} />
			<Button disabled={state.pending}>
				{state.pending ? <Spinner /> : null}Create grade
			</Button>
		</form>
	);
}

export function SalaryBandCreateForm() {
	const state = useJourney();
	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createSalaryBandAction({
							gradeId: value(data, "gradeId"),
							currencyCode: value(data, "currencyCode"),
							minAmount: value(data, "minAmount"),
							midAmount: value(data, "midAmount"),
							maxAmount: value(data, "maxAmount"),
							effectiveFrom: value(data, "effectiveFrom"),
						}),
					"Salary band created.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Input
					aria-label="Grade ID"
					name="gradeId"
					placeholder="Grade ID"
					required
				/>
				<Input
					aria-label="Currency"
					maxLength={3}
					minLength={3}
					name="currencyCode"
					placeholder="Currency (USD)"
					required
				/>
				<Input
					aria-label="Minimum amount"
					inputMode="decimal"
					name="minAmount"
					placeholder="Minimum amount"
					required
				/>
				<Input
					aria-label="Midpoint amount"
					inputMode="decimal"
					name="midAmount"
					placeholder="Midpoint amount"
					required
				/>
				<Input
					aria-label="Maximum amount"
					inputMode="decimal"
					name="maxAmount"
					placeholder="Maximum amount"
					required
				/>
				<Input
					aria-label="Effective from"
					name="effectiveFrom"
					required
					type="date"
				/>
			</div>
			<Notice feedback={state.feedback} />
			<Button disabled={state.pending}>
				{state.pending ? <Spinner /> : null}Create salary band
			</Button>
		</form>
	);
}

export function ReviewCycleCreateForm() {
	const state = useJourney();
	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createCompensationReviewCycleAction({
							idempotencyKey: crypto.randomUUID(),
							code: value(data, "code"),
							name: value(data, "name"),
							periodStart: value(data, "periodStart"),
							periodEnd: value(data, "periodEnd"),
							budgetTotalAmount: value(data, "budgetTotalAmount"),
							budgetCurrencyCode: value(data, "budgetCurrencyCode"),
						}),
					"Review cycle created.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Input
					aria-label="Cycle code"
					name="code"
					placeholder="Cycle code"
					required
				/>
				<Input
					aria-label="Cycle name"
					name="name"
					placeholder="Cycle name"
					required
				/>
				<Input
					aria-label="Period start"
					name="periodStart"
					required
					type="date"
				/>
				<Input aria-label="Period end" name="periodEnd" required type="date" />
				<Input
					aria-label="Budget amount"
					inputMode="decimal"
					name="budgetTotalAmount"
					placeholder="Budget amount"
					required
				/>
				<Input
					aria-label="Budget currency"
					maxLength={3}
					minLength={3}
					name="budgetCurrencyCode"
					placeholder="Currency (USD)"
					required
				/>
			</div>
			<Notice feedback={state.feedback} />
			<Button disabled={state.pending}>
				{state.pending ? <Spinner /> : null}Create review cycle
			</Button>
		</form>
	);
}

export function BenefitPlanCreateForm() {
	const state = useJourney();
	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				state.run(
					() =>
						createBenefitPlanAction({
							code: value(data, "code"),
							name: value(data, "name"),
							eligibilityNote: value(data, "eligibilityNote") || undefined,
						}),
					"Benefit plan created.",
				);
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Input
					aria-label="Benefit code"
					name="code"
					placeholder="Benefit code"
					required
				/>
				<Input
					aria-label="Benefit name"
					name="name"
					placeholder="Benefit name"
					required
				/>
			</div>
			<Label htmlFor="benefit-note">Eligibility note</Label>
			<Textarea id="benefit-note" maxLength={2000} name="eligibilityNote" />
			<Notice feedback={state.feedback} />
			<Button disabled={state.pending}>
				{state.pending ? <Spinner /> : null}Create benefit plan
			</Button>
		</form>
	);
}

export function EmployeeCompensationLookup() {
	const [rows, setRows] = useState<
		Array<{
			id?: string;
			baseAmount?: string;
			currencyCode?: string;
			effectiveFrom?: string;
			status?: string;
		}>
	>([]);
	const state = useJourney();
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const employeeId = new FormData(event.currentTarget).get("employeeId");
		state.run(async () => {
			const result = await listEmployeeCompensationsByEmployeeAction({
				employeeId,
				page: 1,
				pageSize: 100,
			});
			if (result.ok) {
				setRows(result.data.page.compensations);
			}
			return result;
		}, "Compensation history loaded.");
	};
	return (
		<div className="space-y-4">
			<form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
				<Input
					aria-label="Employee ID"
					name="employeeId"
					placeholder="Employee ID"
					required
				/>
				<Button disabled={state.pending}>
					{state.pending ? <Spinner /> : null}Load history
				</Button>
			</form>
			<Notice feedback={state.feedback} />
			{rows.map((row, index) => (
				<div
					className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-4"
					key={row.id ?? index}
				>
					<span>
						{row.baseAmount ?? "—"} {row.currencyCode ?? ""}
					</span>
					<span>{row.effectiveFrom ?? "—"}</span>
					<span>{row.status ?? "—"}</span>
					<span className="font-mono text-xs">{row.id ?? "—"}</span>
				</div>
			))}
		</div>
	);
}

export function PayrollHandoffLookup() {
	const [summary, setSummary] = useState<string | null>(null);
	const state = useJourney();
	return (
		<div className="space-y-4">
			<form
				className="flex flex-col gap-3 sm:flex-row"
				onSubmit={(event) => {
					event.preventDefault();
					const employeeId = new FormData(event.currentTarget).get(
						"employeeId",
					);
					state.run(async () => {
						const result = await getApprovedCompensationHandoffAction({
							employeeId,
						});
						if (result.ok) {
							setSummary(
								result.data.handoff?.activeCompensation
									? `Ready · ${result.data.handoff.activeBenefitEnrollments.length} active benefit enrollments`
									: "Not ready · no approved compensation handoff",
							);
						}
						return result;
					}, "Payroll handoff status loaded.");
				}}
			>
				<Input
					aria-label="Payroll employee ID"
					name="employeeId"
					placeholder="Employee ID"
					required
				/>
				<Button disabled={state.pending}>
					{state.pending ? <Spinner /> : null}Check delivery status
				</Button>
			</form>
			<Notice feedback={state.feedback} />
			{summary ? (
				<Alert role="status">
					<AlertTitle>Payroll handoff</AlertTitle>
					<AlertDescription>{summary}</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
