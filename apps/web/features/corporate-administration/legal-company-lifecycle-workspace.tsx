"use client";

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
	Input,
	Label,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
	activateLegalCompanyFormAction,
	archiveLegalCompanyFormAction,
	dissolveLegalCompanyFormAction,
	enterLiquidationFormAction,
	markCompanyStruckOffFormAction,
	restoreLegalCompanyFormAction,
	suspendLegalCompanyFormAction,
} from "@/app/actions/legal-company-lifecycle-actions";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export type LegalCompanyLifecycleStatus =
	| "draft"
	| "active"
	| "suspended"
	| "struck_off"
	| "in_liquidation"
	| "dissolved"
	| "restored"
	| "archived";

export type LegalCompanyLifecycleCompany = Readonly<{
	legalCompanyId: string;
	companyCode: string;
	displayName: string;
	state: LegalCompanyLifecycleStatus;
	version: number;
}>;

export type LegalCompanyActivationCompleteness = Readonly<{
	complete: boolean;
	missing: readonly string[];
	checks: readonly Readonly<{
		key: string;
		label: string;
		complete: boolean;
	}>[];
}>;

type LifecycleActionState = ActionResult<{
	companyStatusHistoryId: string;
	legalCompanyId: string;
	status: string;
	version: number;
}> | null;

type LifecycleAction = (payload: FormData) => void;

export function LegalCompanyLifecycleWorkspace({
	canWrite,
	company,
	completeness,
	organizationSlug,
}: Readonly<{
	canWrite: boolean;
	company: LegalCompanyLifecycleCompany;
	completeness: LegalCompanyActivationCompleteness | null;
	organizationSlug: string;
}>) {
	const [activateState, activateAction] = useActionState<
		LifecycleActionState,
		FormData
	>(activateLegalCompanyFormAction, null);
	const [suspendState, suspendAction] = useActionState<
		LifecycleActionState,
		FormData
	>(suspendLegalCompanyFormAction, null);
	const [struckOffState, struckOffAction] = useActionState<
		LifecycleActionState,
		FormData
	>(markCompanyStruckOffFormAction, null);
	const [liquidationState, liquidationAction] = useActionState<
		LifecycleActionState,
		FormData
	>(enterLiquidationFormAction, null);
	const [dissolveState, dissolveAction] = useActionState<
		LifecycleActionState,
		FormData
	>(dissolveLegalCompanyFormAction, null);
	const [restoreState, restoreAction] = useActionState<
		LifecycleActionState,
		FormData
	>(restoreLegalCompanyFormAction, null);
	const [archiveState, archiveAction] = useActionState<
		LifecycleActionState,
		FormData
	>(archiveLegalCompanyFormAction, null);
	const today = new Date().toISOString().slice(0, 10);
	const transitionForms = availableLifecycleTransitions(company.state);

	return (
		<section
			aria-labelledby="legal-company-lifecycle-heading"
			className="space-y-6 border-t pt-6"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2
						id="legal-company-lifecycle-heading"
						className="text-lg font-medium"
					>
						Company status lifecycle
					</h2>
					<p className="text-sm text-muted-foreground">
						Effective company state and Phase 1 activation completeness.
					</p>
				</div>
				<StatusBadge
					status={company.state === "active" ? "success" : "pending"}
					label={`${statusLabel(company.state)} · v${company.version}`}
					showIcon={false}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<Card>
					<CardHeader>
						<CardTitle>Activation readiness</CardTitle>
						<CardDescription>
							All checks must pass before a draft can become active.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{completeness === null ? (
							<Alert variant="destructive" role="alert">
								<AlertTitle>Readiness unavailable</AlertTitle>
								<AlertDescription>
									Activation completeness could not be loaded.
								</AlertDescription>
							</Alert>
						) : (
							<div className="space-y-4">
								<StatusBadge
									status={completeness.complete ? "success" : "pending"}
									label={
										completeness.complete
											? "Activation ready"
											: "Activation incomplete"
									}
									showIcon={false}
								/>
								<Table aria-label="Activation completeness checks">
									<TableHeader>
										<TableRow>
											<TableHead>Check</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{completeness.checks.map((check) => (
											<TableRow key={check.key}>
												<TableCell>{check.label}</TableCell>
												<TableCell>
													{check.complete ? "Complete" : "Missing"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Available transitions</CardTitle>
						<CardDescription>
							Only transitions valid for the current status are shown.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{transitionForms.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No further status transition is available.
							</p>
						) : null}
						{transitionForms.includes("activate") ? (
							<LifecycleTransitionForm
								action={activateAction}
								canWrite={
									canWrite &&
									(completeness === null ? false : completeness.complete)
								}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								state={activateState}
								submitLabel="Activate"
								success="Company activated."
							/>
						) : null}
						{transitionForms.includes("suspend") ? (
							<LifecycleTransitionForm
								action={suspendAction}
								canWrite={canWrite}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								requireReason
								state={suspendState}
								submitLabel="Suspend"
								success="Company suspended."
							/>
						) : null}
						{transitionForms.includes("strike_off") ? (
							<LifecycleTransitionForm
								action={struckOffAction}
								canWrite={canWrite}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								requireApproval
								requireReason
								state={struckOffState}
								submitLabel="Mark struck off"
								success="Company marked struck off."
							/>
						) : null}
						{transitionForms.includes("liquidate") ? (
							<LifecycleTransitionForm
								action={liquidationAction}
								canWrite={canWrite}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								requireApproval
								requireReason
								state={liquidationState}
								submitLabel="Enter liquidation"
								success="Liquidation entered."
							/>
						) : null}
						{transitionForms.includes("dissolve") ? (
							<LifecycleTransitionForm
								action={dissolveAction}
								canWrite={canWrite}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								requireApproval
								requireReason
								state={dissolveState}
								submitLabel="Dissolve"
								success="Company dissolved."
							/>
						) : null}
						{transitionForms.includes("restore") ? (
							<LifecycleTransitionForm
								action={restoreAction}
								canWrite={canWrite}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								requireApproval
								requireReason
								state={restoreState}
								submitLabel="Restore"
								success="Company restored."
							/>
						) : null}
						{transitionForms.includes("archive") ? (
							<LifecycleTransitionForm
								action={archiveAction}
								canWrite={canWrite}
								company={company}
								defaultEffectiveFrom={today}
								organizationSlug={organizationSlug}
								requireReason
								state={archiveState}
								submitLabel="Archive"
								success="Company archived."
							/>
						) : null}
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

function LifecycleTransitionForm({
	action,
	canWrite,
	company,
	defaultEffectiveFrom,
	organizationSlug,
	requireApproval,
	requireReason,
	state,
	submitLabel,
	success,
}: Readonly<{
	action: LifecycleAction;
	canWrite: boolean;
	company: LegalCompanyLifecycleCompany;
	defaultEffectiveFrom: string;
	organizationSlug: string;
	requireApproval?: boolean;
	requireReason?: boolean;
	state: LifecycleActionState;
	submitLabel: string;
	success: string;
}>) {
	const idPrefix = `companyLifecycle${submitLabel.replaceAll(" ", "")}`;
	return (
		<form action={action} aria-label={submitLabel} className="space-y-3">
			<fieldset className="space-y-3" disabled={!canWrite}>
				<input name="organizationSlug" type="hidden" value={organizationSlug} />
				<input
					name="legalCompanyId"
					type="hidden"
					value={company.legalCompanyId}
				/>
				<input
					name="expectedCompanyVersion"
					type="hidden"
					value={company.version}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<TextField
						defaultValue={defaultEffectiveFrom}
						id={`${idPrefix}EffectiveFrom`}
						label="Effective from"
						name="effectiveFrom"
						type="date"
					/>
					<TextField
						id={`${idPrefix}SourceDocument`}
						label="Source document"
						name="sourceDocumentId"
					/>
				</div>
				{requireReason ? (
					<TextField id={`${idPrefix}Reason`} label="Reason" name="reason" />
				) : null}
				{requireApproval ? (
					<div className="grid gap-3 sm:grid-cols-2">
						<TextField
							id={`${idPrefix}ApprovalRequest`}
							label="Approval request"
							name="approvalRequestId"
							required={false}
						/>
						<TextField
							id={`${idPrefix}ApprovalDecision`}
							label="Approval decision"
							name="approvalDecisionId"
							required={false}
						/>
					</div>
				) : null}
				<SubmitButton disabled={!canWrite}>{submitLabel}</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success={success} />
		</form>
	);
}

function TextField({
	id,
	label,
	name,
	type,
	defaultValue,
	required = true,
}: Readonly<{
	id: string;
	label: string;
	name: string;
	type?: string;
	defaultValue?: string;
	required?: boolean;
}>) {
	return (
		<div className="space-y-1">
			<Label htmlFor={id}>{label}</Label>
			<Input
				defaultValue={defaultValue}
				id={id}
				name={name}
				required={required}
				type={type}
			/>
		</div>
	);
}

function SubmitButton({
	children,
	disabled,
}: Readonly<{ children: ReactNode; disabled: boolean }>) {
	const status = useFormStatus();
	return (
		<Button type="submit" disabled={disabled || status.pending}>
			{status.pending ? "Saving..." : children}
		</Button>
	);
}

function ActionFeedback({
	state,
	success,
}: Readonly<{ state: LifecycleActionState; success: string }>) {
	if (state === null) return null;
	if (!state.ok) {
		return (
			<Alert variant="destructive" role="alert">
				<AlertTitle>Change not saved</AlertTitle>
				<AlertDescription>{state.message}</AlertDescription>
			</Alert>
		);
	}
	return (
		<p className="text-sm text-success-subtle-foreground" role="status">
			{success}
		</p>
	);
}

type LifecycleTransition =
	| "activate"
	| "suspend"
	| "strike_off"
	| "liquidate"
	| "dissolve"
	| "restore"
	| "archive";

export function availableLifecycleTransitions(
	status: LegalCompanyLifecycleStatus,
): readonly LifecycleTransition[] {
	switch (status) {
		case "draft":
			return ["activate", "archive"];
		case "active":
			return ["suspend", "strike_off", "liquidate", "dissolve", "archive"];
		case "suspended":
			return ["activate", "strike_off", "liquidate", "dissolve", "archive"];
		case "struck_off":
			return ["restore", "dissolve", "archive"];
		case "in_liquidation":
			return ["dissolve", "restore"];
		case "dissolved":
			return ["restore", "archive"];
		case "restored":
			return ["activate", "suspend", "liquidate", "dissolve", "archive"];
		case "archived":
			return [];
	}
}

function statusLabel(status: LegalCompanyLifecycleStatus): string {
	return status
		.split("_")
		.map((part) => part[0]?.toUpperCase() + part.slice(1))
		.join(" ");
}
