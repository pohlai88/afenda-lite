"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type MergePartiesActionState,
	mergePartiesAction,
} from "@/app/actions/merge-parties";
import {
	type SubmitChangeRequestActionState,
	submitChangeRequestAction,
} from "@/app/actions/submit-change-request";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: MergePartiesActionState = null;
const submitInitial: SubmitChangeRequestActionState = null;

interface PartyOption {
	id: string;
	label: string;
	version: number;
}

interface ApprovedMergeRequest {
	id: string;
	label: string;
	sourcePartyId: string;
	targetPartyId: string;
}

interface MergePartiesFormProps {
	approvedMergeRequests: ApprovedMergeRequest[];
	canManage: boolean;
	parties: PartyOption[];
}

function partyToken(party: PartyOption): string {
	return `${party.id}:${party.version}`;
}

/**
 * MDG merge UI — submit merge CR, then apply with approved changeRequestId.
 */
export function MergePartiesForm({
	canManage,
	parties,
	approvedMergeRequests,
}: MergePartiesFormProps) {
	const [state, formAction, pending] = useActionState(
		mergePartiesAction,
		initialState,
	);
	const [submitState, submitAction, submitPending] = useActionState(
		submitChangeRequestAction,
		submitInitial,
	);

	if (!canManage) {
		return null;
	}

	if (parties.length < 2) {
		return (
			<Alert role="status">
				<AlertTitle>Merge unavailable</AlertTitle>
				<AlertDescription>
					At least two parties are required for a governed merge.
				</AlertDescription>
			</Alert>
		);
	}

	const sourceError = actionFieldMessage(state, "sourcePartyId");
	const targetError = actionFieldMessage(state, "targetPartyId");
	const showFormError =
		!pending &&
		state?.ok === false &&
		sourceError === undefined &&
		targetError === undefined;

	const [defaultSource, defaultTarget] = parties;
	const [defaultApproved] = approvedMergeRequests;

	return (
		<div className="flex max-w-lg flex-col gap-8">
			<form
				action={submitAction}
				aria-busy={submitPending}
				className="flex flex-col gap-(--field-gap)"
			>
				<input name="commandKind" type="hidden" value="merge_parties" />
				<p className="text-muted-foreground text-sm">
					Step 1 — submit a merge change request for checker approval.
				</p>
				<FormField label="Source (will retire)" required>
					<NativeSelect
						defaultValue={defaultSource?.id}
						disabled={submitPending}
						name="sourcePartyId"
					>
						{parties.map((party) => (
							<NativeSelectOption key={party.id} value={party.id}>
								{party.label}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</FormField>
				<FormField label="Target (survivor)" required>
					<NativeSelect
						defaultValue={defaultTarget?.id}
						disabled={submitPending}
						name="targetPartyId"
					>
						{parties.map((party) => (
							<NativeSelectOption key={party.id} value={party.id}>
								{party.label}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</FormField>
				<FormField label="Name decision">
					<NativeSelect
						defaultValue="target"
						disabled={submitPending}
						name="nameDecision"
					>
						<NativeSelectOption value="target">
							Keep target name
						</NativeSelectOption>
						<NativeSelectOption value="source">
							Take source name
						</NativeSelectOption>
					</NativeSelect>
				</FormField>
				{!submitPending && submitState?.ok === false ? (
					<FormError>{submitState.message}</FormError>
				) : null}
				{!submitPending && submitState?.ok === true ? (
					<Alert role="status">
						<AlertTitle>Merge request submitted</AlertTitle>
						<AlertDescription>
							{submitState.data.changeRequest.code} awaits checker approval.
						</AlertDescription>
					</Alert>
				) : null}
				<Button disabled={submitPending} type="submit">
					{submitPending ? <Spinner /> : null}
					Submit merge request
				</Button>
			</form>

			<form
				action={formAction}
				aria-busy={pending}
				className="flex flex-col gap-(--field-gap)"
			>
				<p className="text-muted-foreground text-sm">
					Step 2 — apply an approved merge change request.
				</p>
				{state?.ok === true ? (
					<Alert role="status">
						<AlertTitle>Parties merged</AlertTitle>
						<AlertDescription>
							Survivor {state.data.survivor.code}; former{" "}
							{state.data.merged.code} retired into survivor.
						</AlertDescription>
					</Alert>
				) : null}
				{showFormError && state?.ok === false ? (
					<FormError>{state.message}</FormError>
				) : null}
				{approvedMergeRequests.length === 0 ? (
					<Alert role="status">
						<AlertTitle>No approved merge requests</AlertTitle>
						<AlertDescription>
							A checker must approve a merge change request before apply.
						</AlertDescription>
					</Alert>
				) : (
					<>
						<FormField label="Approved change request" required>
							<NativeSelect
								defaultValue={defaultApproved?.id}
								disabled={pending}
								name="changeRequestId"
							>
								{approvedMergeRequests.map((request) => (
									<NativeSelectOption key={request.id} value={request.id}>
										{request.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</FormField>
						<FormField
							error={sourceError}
							fieldId="merge-source"
							label="Source (will retire)"
							required
						>
							<NativeSelect
								defaultValue={
									defaultSource ? partyToken(defaultSource) : undefined
								}
								disabled={pending}
								name="sourceParty"
							>
								{parties.map((party) => (
									<NativeSelectOption key={party.id} value={partyToken(party)}>
										{party.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</FormField>
						<FormField
							error={targetError}
							fieldId="merge-target"
							label="Target (survivor)"
							required
						>
							<NativeSelect
								defaultValue={
									defaultTarget ? partyToken(defaultTarget) : undefined
								}
								disabled={pending}
								name="targetParty"
							>
								{parties.map((party) => (
									<NativeSelectOption key={party.id} value={partyToken(party)}>
										{party.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</FormField>
						<FormField fieldId="merge-name-decision" label="Name decision">
							<NativeSelect
								defaultValue="target"
								disabled={pending}
								name="nameDecision"
							>
								<NativeSelectOption value="target">
									Keep target name
								</NativeSelectOption>
								<NativeSelectOption value="source">
									Take source name
								</NativeSelectOption>
							</NativeSelect>
						</FormField>
						<Button disabled={pending} type="submit">
							{pending ? <Spinner /> : null}
							Apply merge
						</Button>
					</>
				)}
			</form>
		</div>
	);
}
