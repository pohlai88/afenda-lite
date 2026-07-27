"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { ClipboardCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
	managerAttendanceDecisionAction,
	managerLeaveDecisionAction,
	managerPerformanceDecisionAction,
	managerProbationDecisionAction,
	managerSuccessionDecisionAction,
	managerTalentDecisionAction,
	managerTimesheetDecisionAction,
} from "@/app/actions/hr-manager-journeys";

export type ManagerDecisionKind =
	| "leave"
	| "timesheet"
	| "attendance"
	| "probation"
	| "performance-review"
	| "performance-goal"
	| "talent"
	| "succession";

type Props = {
	kind: ManagerDecisionKind;
	targetId: string;
	version: number;
	label: string;
	asOf: string;
	employeeId?: string;
	relatedId?: string;
};

const actions = {
	leave: managerLeaveDecisionAction,
	timesheet: managerTimesheetDecisionAction,
	attendance: managerAttendanceDecisionAction,
	probation: managerProbationDecisionAction,
	"performance-review": managerPerformanceDecisionAction,
	"performance-goal": managerPerformanceDecisionAction,
	talent: managerTalentDecisionAction,
	succession: managerSuccessionDecisionAction,
} as const;

const operations: Record<ManagerDecisionKind, Array<[string, string]>> = {
	leave: [
		["approve", "Approve"],
		["return", "Return"],
		["reject", "Reject"],
	],
	timesheet: [
		["approve", "Approve"],
		["return", "Return"],
		["reject", "Reject"],
	],
	attendance: [
		["review", "Start review"],
		["excuse", "Excuse"],
		["resolve", "Resolve"],
		["reject", "Reject"],
	],
	probation: [
		["assess", "Record review"],
		["pass", "Pass"],
		["fail", "Fail"],
		["confirm", "Confirm employment"],
	],
	"performance-review": [
		["submit-manager", "Submit manager assessment"],
		["return", "Return for correction"],
		["finalize", "Finalize"],
	],
	"performance-goal": [
		["approve-goal", "Approve goal"],
		["reject-goal", "Reject goal"],
	],
	talent: [["record", "Record assessment"]],
	succession: [
		["assess", "Assess readiness"],
		["approve", "Approve candidate"],
	],
};

export function ManagerDecisionDialog(props: Props) {
	const router = useRouter();
	const [operation, setOperation] = useState(
		operations[props.kind][0]?.[0] ?? "",
	);
	const [state, action, pending] = useActionState(actions[props.kind], null);

	useEffect(() => {
		if (state?.ok) router.refresh();
	}, [router, state]);

	const needsRating =
		props.kind === "performance-review" &&
		(operation === "submit-manager" || operation === "finalize");
	const needsEvidence = props.kind === "talent" || props.kind === "succession";

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<ClipboardCheckIcon aria-hidden="true" />
					Review
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{props.label}</DialogTitle>
					<DialogDescription>
						The decision is checked against your current reporting scope before
						it is applied.
					</DialogDescription>
				</DialogHeader>
				<form action={action} aria-busy={pending} className="space-y-4">
					<input type="hidden" name="targetId" value={props.targetId} />
					<input type="hidden" name="expectedVersion" value={props.version} />
					<input
						type="hidden"
						name="employeeId"
						value={props.employeeId ?? ""}
					/>
					<input type="hidden" name="relatedId" value={props.relatedId ?? ""} />
					<input
						type="hidden"
						name="resourceKind"
						value={props.kind === "performance-goal" ? "goal" : "review"}
					/>
					{state?.ok ? (
						<Alert role="status">
							<AlertTitle>Decision completed</AlertTitle>
							<AlertDescription>{state.data.message}</AlertDescription>
						</Alert>
					) : state?.ok === false ? (
						<FormError>{state.message}</FormError>
					) : null}
					<FormField
						label="Decision"
						fieldId={`${props.targetId}-operation`}
						required
					>
						<NativeSelect
							name="operation"
							value={operation}
							onChange={(event) => setOperation(event.target.value)}
							disabled={pending}
						>
							{operations[props.kind].map(([value, label]) => (
								<NativeSelectOption key={value} value={value}>
									{label}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</FormField>
					{needsRating ? (
						<FormField
							label="Rating"
							fieldId={`${props.targetId}-rating`}
							required
						>
							<Input name="rating" maxLength={64} disabled={pending} />
						</FormField>
					) : (
						<input type="hidden" name="rating" value="" />
					)}
					{props.kind === "talent" ? (
						<>
							<FormField
								label="Assessment method"
								fieldId={`${props.targetId}-method`}
								required
							>
								<NativeSelect
									name="methodCode"
									defaultValue="manager_evidence_review"
									disabled={pending}
								>
									<NativeSelectOption value="manager_evidence_review">
										Manager evidence review
									</NativeSelectOption>
									<NativeSelectOption value="calibration_panel">
										Calibration panel
									</NativeSelectOption>
									<NativeSelectOption value="assessment_center">
										Assessment center
									</NativeSelectOption>
								</NativeSelect>
							</FormField>
							<FormField
								label="Classification"
								fieldId={`${props.targetId}-classification`}
								required
							>
								<Input
									name="classification"
									maxLength={100}
									disabled={pending}
								/>
							</FormField>
						</>
					) : null}
					{props.kind === "succession" ? (
						<FormField
							label="Readiness"
							fieldId={`${props.targetId}-readiness`}
							required
						>
							<NativeSelect
								name="readiness"
								defaultValue="ready_soon"
								disabled={pending}
							>
								<NativeSelectOption value="not_ready">
									Not ready
								</NativeSelectOption>
								<NativeSelectOption value="emerging">
									Emerging
								</NativeSelectOption>
								<NativeSelectOption value="ready_soon">
									Ready soon
								</NativeSelectOption>
								<NativeSelectOption value="ready_now">
									Ready now
								</NativeSelectOption>
							</NativeSelect>
						</FormField>
					) : null}
					{props.kind === "probation" || props.kind === "succession" ? (
						<FormField
							label="Effective date"
							fieldId={`${props.targetId}-date`}
							required
						>
							<Input
								name="effectiveOn"
								type="date"
								defaultValue={props.asOf}
								disabled={pending}
							/>
						</FormField>
					) : null}
					<FormField
						label={needsEvidence ? "Evidence" : "Decision note"}
						fieldId={`${props.targetId}-note`}
						required={
							needsEvidence ||
							[
								"return",
								"reject",
								"assess",
								"pass",
								"fail",
								"confirm",
							].includes(operation)
						}
					>
						<Textarea
							name={needsEvidence ? "evidenceSummary" : "note"}
							rows={4}
							maxLength={4000}
							disabled={pending}
						/>
					</FormField>
					<input
						type="hidden"
						name={needsEvidence ? "note" : "evidenceSummary"}
						value=""
					/>
					<input type="hidden" name="evidenceReference" value="" />
					<DialogFooter showCloseButton>
						<Button type="submit" disabled={pending}>
							{pending ? <Spinner /> : null}Submit decision
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
