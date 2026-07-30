// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
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

interface Props {
	asOf: string;
	employeeId?: string;
	kind: ManagerDecisionKind;
	label: string;
	relatedId?: string;
	targetId: string;
	version: number;
}

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

const operations: Record<ManagerDecisionKind, [string, string][]> = {
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
		if (state?.ok) {
			router.refresh();
		}
	}, [router, state]);

	const needsRating =
		props.kind === "performance-review" &&
		(operation === "submit-manager" || operation === "finalize");
	const needsEvidence = props.kind === "talent" || props.kind === "succession";

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
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
					<input name="targetId" type="hidden" value={props.targetId} />
					<input name="expectedVersion" type="hidden" value={props.version} />
					<input
						name="employeeId"
						type="hidden"
						value={props.employeeId ?? ""}
					/>
					<input name="relatedId" type="hidden" value={props.relatedId ?? ""} />
					<input
						name="resourceKind"
						type="hidden"
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
						fieldId={`${props.targetId}-operation`}
						label="Decision"
						required
					>
						<NativeSelect
							disabled={pending}
							name="operation"
							onChange={(event) => setOperation(event.target.value)}
							value={operation}
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
							fieldId={`${props.targetId}-rating`}
							label="Rating"
							required
						>
							<Input disabled={pending} maxLength={64} name="rating" />
						</FormField>
					) : (
						<input name="rating" type="hidden" value="" />
					)}
					{props.kind === "talent" ? (
						<>
							<FormField
								fieldId={`${props.targetId}-method`}
								label="Assessment method"
								required
							>
								<NativeSelect
									defaultValue="manager_evidence_review"
									disabled={pending}
									name="methodCode"
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
								fieldId={`${props.targetId}-classification`}
								label="Classification"
								required
							>
								<Input
									disabled={pending}
									maxLength={100}
									name="classification"
								/>
							</FormField>
						</>
					) : null}
					{props.kind === "succession" ? (
						<FormField
							fieldId={`${props.targetId}-readiness`}
							label="Readiness"
							required
						>
							<NativeSelect
								defaultValue="ready_soon"
								disabled={pending}
								name="readiness"
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
							fieldId={`${props.targetId}-date`}
							label="Effective date"
							required
						>
							<Input
								defaultValue={props.asOf}
								disabled={pending}
								name="effectiveOn"
								type="date"
							/>
						</FormField>
					) : null}
					<FormField
						fieldId={`${props.targetId}-note`}
						label={needsEvidence ? "Evidence" : "Decision note"}
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
							disabled={pending}
							maxLength={4000}
							name={needsEvidence ? "evidenceSummary" : "note"}
							rows={4}
						/>
					</FormField>
					<input
						name={needsEvidence ? "note" : "evidenceSummary"}
						type="hidden"
						value=""
					/>
					<input name="evidenceReference" type="hidden" value="" />
					<DialogFooter showCloseButton>
						<Button disabled={pending} type="submit">
							{pending ? <Spinner /> : null}Submit decision
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
