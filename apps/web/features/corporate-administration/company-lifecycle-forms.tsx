"use client";

import type { CaLegalCompany } from "@afenda/corporate-administration";
import { canTransitionLegalCompany } from "@afenda/corporate-administration";
import {
	Alert,
	AlertDescription,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertTitle,
	Button,
	Input,
	Label,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type ArchiveLegalCompanyActionState,
	archiveLegalCompanyAction,
} from "@/app/actions/archive-legal-company";
import {
	type DissolveLegalCompanyActionState,
	dissolveLegalCompanyAction,
} from "@/app/actions/dissolve-legal-company";
import {
	type SuspendLegalCompanyActionState,
	suspendLegalCompanyAction,
} from "@/app/actions/suspend-legal-company";

function LifecycleResult({
	state,
	action,
}: {
	state:
		| SuspendLegalCompanyActionState
		| DissolveLegalCompanyActionState
		| ArchiveLegalCompanyActionState;
	action: "suspend" | "dissolve" | "archive";
}) {
	if (!state) return null;
	if (!state.ok) {
		return (
			<Alert variant="destructive">
				<AlertTitle>Could not {action} company</AlertTitle>
				<AlertDescription>{state.message}</AlertDescription>
			</Alert>
		);
	}
	return (
		<Alert>
			<AlertTitle>Company {action}d</AlertTitle>
			<AlertDescription>
				Status is now {state.data.company.status}.
			</AlertDescription>
		</Alert>
	);
}

export function CompanyLifecycleForms({
	company,
	canSuspend,
	canDissolve,
	canArchive,
}: {
	company: CaLegalCompany;
	canSuspend: boolean;
	canDissolve: boolean;
	canArchive: boolean;
}) {
	const [suspendState, suspendAction, suspendPending] = useActionState<
		SuspendLegalCompanyActionState,
		FormData
	>(suspendLegalCompanyAction, null);
	const [dissolveState, dissolveAction, dissolvePending] = useActionState<
		DissolveLegalCompanyActionState,
		FormData
	>(dissolveLegalCompanyAction, null);
	const [archiveState, archiveAction, archivePending] = useActionState<
		ArchiveLegalCompanyActionState,
		FormData
	>(archiveLegalCompanyAction, null);

	const canSuspendTransition = canTransitionLegalCompany(
		company.status,
		"suspended",
	);
	const canDissolveTransition = canTransitionLegalCompany(
		company.status,
		"dissolved",
	);
	const canArchiveTransition = canTransitionLegalCompany(
		company.status,
		"archived",
	);

	if (
		!(canSuspend && canSuspendTransition) &&
		!(canDissolve && canDissolveTransition) &&
		!(canArchive && canArchiveTransition)
	) {
		return null;
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{canSuspend && canSuspendTransition ? (
				<form action={suspendAction} className="space-y-4">
					<input type="hidden" name="legalCompanyId" value={company.id} />
					<input type="hidden" name="expectedVersion" value={company.version} />
					<div className="grid gap-2">
						<Label htmlFor={`suspend-date-${company.id}`}>
							Suspension date
						</Label>
						<Input
							id={`suspend-date-${company.id}`}
							name="effectiveDate"
							type="date"
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={`suspend-reason-${company.id}`}>Reason</Label>
						<Input id={`suspend-reason-${company.id}`} name="reason" required />
					</div>
					<LifecycleResult state={suspendState} action="suspend" />
					<Button type="submit" variant="outline" disabled={suspendPending}>
						{suspendPending ? "Suspending…" : "Suspend company"}
					</Button>
				</form>
			) : null}

			{canDissolve && canDissolveTransition ? (
				<form action={dissolveAction} className="space-y-4">
					<input type="hidden" name="legalCompanyId" value={company.id} />
					<input type="hidden" name="expectedVersion" value={company.version} />
					<div className="grid gap-2">
						<Label htmlFor={`dissolve-date-${company.id}`}>
							Dissolution date
						</Label>
						<Input
							id={`dissolve-date-${company.id}`}
							name="effectiveDate"
							type="date"
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={`dissolve-reason-${company.id}`}>Reason</Label>
						<Input
							id={`dissolve-reason-${company.id}`}
							name="reason"
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={`dissolve-evidence-${company.id}`}>
							Evidence reference
						</Label>
						<Input
							id={`dissolve-evidence-${company.id}`}
							name="evidenceDocumentReference"
							required
						/>
					</div>
					<LifecycleResult state={dissolveState} action="dissolve" />
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button type="button" variant="destructive">
								Dissolve company
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Confirm company dissolution</AlertDialogTitle>
								<AlertDialogDescription>
									This records a high-risk statutory lifecycle transition.
									Review the effective date, reason, and evidence before
									continuing.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction asChild>
									<Button
										type="submit"
										variant="destructive"
										disabled={dissolvePending}
									>
										{dissolvePending ? "Dissolving…" : "Confirm dissolution"}
									</Button>
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</form>
			) : null}

			{canArchive && canArchiveTransition ? (
				<form action={archiveAction} className="space-y-4">
					<input type="hidden" name="legalCompanyId" value={company.id} />
					<input type="hidden" name="expectedVersion" value={company.version} />
					<div className="grid gap-2">
						<Label htmlFor={`archive-date-${company.id}`}>Archive date</Label>
						<Input
							id={`archive-date-${company.id}`}
							name="effectiveDate"
							type="date"
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={`archive-reason-${company.id}`}>Reason</Label>
						<Input
							id={`archive-reason-${company.id}`}
							name="reason"
							required
						/>
					</div>
					<LifecycleResult state={archiveState} action="archive" />
					<Button type="submit" variant="outline" disabled={archivePending}>
						{archivePending ? "Archiving…" : "Archive company"}
					</Button>
				</form>
			) : null}
		</div>
	);
}
