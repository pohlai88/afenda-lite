"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import { type ReactNode, useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
	activateLegalEstablishmentFormAction,
	closeLegalEstablishmentFormAction,
	endPremiseFormAction,
	registerLegalEstablishmentFormAction,
	registerPremiseFormAction,
	setRegisteredAddressFormAction,
	suspendLegalEstablishmentFormAction,
	updateLegalEstablishmentFormAction,
} from "@/app/actions/legal-establishment-actions";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

type MutationState = ActionResult<{ id: string; version: number }> | null;

export type LegalEstablishmentView = Readonly<{
	id: string;
	type: string;
	jurisdictionCode: string;
	registrationIdentifier: string;
	displayName: string;
	status: string;
	registeredFrom: string;
	version: number;
}>;

export type RegisteredAddressView = Readonly<{
	id: string;
	type: string;
	scope: string;
	address: string;
	effectiveFrom: string;
}>;

export type PremiseView = Readonly<{
	id: string;
	type: string;
	displayName: string;
	address: string;
	status: string;
	effectiveFrom: string;
	version: number;
}>;

export function LegalEstablishmentWorkspace(props: {
	canWrite: boolean;
	company: { legalCompanyId: string; version: number };
	establishments: readonly LegalEstablishmentView[];
	registeredAddresses: readonly RegisteredAddressView[];
	premises: readonly PremiseView[];
	partyAddresses: readonly { id: string; label: string }[];
}) {
	const [registerState, registerAction] = useActionState<
		MutationState,
		FormData
	>(registerLegalEstablishmentFormAction, null);
	const [addressState, addressAction] = useActionState<MutationState, FormData>(
		setRegisteredAddressFormAction,
		null,
	);
	const [premiseState, premiseAction] = useActionState<MutationState, FormData>(
		registerPremiseFormAction,
		null,
	);
	const today = new Date().toISOString().slice(0, 10);

	return (
		<section
			aria-labelledby="legal-presence-heading"
			className="space-y-6 border-t pt-6"
		>
			<div>
				<h2 className="font-medium text-lg" id="legal-presence-heading">
					Legal presence and premises
				</h2>
				<p className="text-muted-foreground text-sm">
					Statutory establishments, registered addresses, and physical premises
					are maintained as separate histories.
				</p>
			</div>

			<div className="grid gap-6 xl:grid-cols-3">
				<form action={registerAction} className="space-y-3 border-t pt-4">
					<h3 className="font-medium">Register establishment</h3>
					<input
						name="legalCompanyId"
						type="hidden"
						value={props.company.legalCompanyId}
					/>
					<input
						name="expectedCompanyVersion"
						type="hidden"
						value={props.company.version}
					/>
					<SelectField
						label="Type"
						name="establishmentType"
						options={[
							["branch", "Branch"],
							["representative_office", "Representative office"],
							["foreign_registration", "Foreign registration"],
							["other", "Other"],
						]}
					/>
					<TextField
						label="Jurisdiction"
						maxLength={2}
						name="jurisdictionCode"
						pattern="[A-Za-z]{2}"
					/>
					<TextField
						label="Registration identifier"
						maxLength={256}
						name="registrationIdentifier"
					/>
					<TextField label="Display name" maxLength={256} name="displayName" />
					<TextField
						defaultValue={today}
						label="Registered from"
						name="registeredFrom"
						type="date"
					/>
					<TextField
						label="Source document reference"
						maxLength={128}
						name="sourceDocumentId"
					/>
					<SubmitButton disabled={!props.canWrite}>
						Register establishment
					</SubmitButton>
					<ActionFeedback
						state={registerState}
						success="Establishment registered."
					/>
				</form>

				<form action={addressAction} className="space-y-3 border-t pt-4">
					<h3 className="font-medium">Set statutory address</h3>
					<input
						name="legalCompanyId"
						type="hidden"
						value={props.company.legalCompanyId}
					/>
					<input
						name="expectedCompanyVersion"
						type="hidden"
						value={props.company.version}
					/>
					<SelectField
						label="Address type"
						name="addressType"
						options={[
							["registered_office", "Registered office"],
							["service_address", "Service address"],
							["place_of_business", "Place of business"],
						]}
					/>
					<EstablishmentScopeSelect establishments={props.establishments} />
					<AddressSelect addresses={props.partyAddresses} />
					<TextField
						defaultValue={today}
						label="Effective from"
						name="effectiveFrom"
						type="date"
					/>
					<TextField
						label="Effective to (optional)"
						name="effectiveTo"
						required={false}
						type="date"
					/>
					<TextField
						label="Source document reference"
						maxLength={128}
						name="sourceDocumentId"
					/>
					<SubmitButton
						disabled={!props.canWrite || props.partyAddresses.length === 0}
					>
						Set address
					</SubmitButton>
					<ActionFeedback
						state={addressState}
						success="Statutory address recorded."
					/>
				</form>

				<form action={premiseAction} className="space-y-3 border-t pt-4">
					<h3 className="font-medium">Register premise</h3>
					<input
						name="legalCompanyId"
						type="hidden"
						value={props.company.legalCompanyId}
					/>
					<input
						name="expectedCompanyVersion"
						type="hidden"
						value={props.company.version}
					/>
					<SelectField
						label="Premise type"
						name="premiseType"
						options={[
							["office", "Office"],
							["warehouse", "Warehouse"],
							["operational_site", "Operational site"],
							["other", "Other"],
						]}
					/>
					<EstablishmentScopeSelect establishments={props.establishments} />
					<TextField label="Premise name" maxLength={256} name="displayName" />
					<AddressSelect addresses={props.partyAddresses} />
					<TextField
						defaultValue={today}
						label="Effective from"
						name="effectiveFrom"
						type="date"
					/>
					<TextField
						label="Effective to (optional)"
						name="effectiveTo"
						required={false}
						type="date"
					/>
					<TextField
						label="Source document reference"
						maxLength={128}
						name="sourceDocumentId"
					/>
					<SubmitButton
						disabled={!props.canWrite || props.partyAddresses.length === 0}
					>
						Register premise
					</SubmitButton>
					<ActionFeedback state={premiseState} success="Premise registered." />
				</form>
			</div>

			<div className="space-y-3">
				<h3 className="font-medium">Establishment history</h3>
				{props.establishments.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No statutory establishments recorded.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Establishment</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Effective</TableHead>
								<TableHead>Controls</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{props.establishments.map((item) => (
								<EstablishmentRow
									canWrite={props.canWrite}
									item={item}
									key={item.id}
								/>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<HistoryTable
					empty="No statutory addresses recorded."
					rows={props.registeredAddresses.map((item) => [
						item.type,
						item.scope,
						item.address,
						item.effectiveFrom,
					])}
					title="Statutory addresses"
				/>
				<div className="space-y-3">
					<h3 className="font-medium">Premises</h3>
					{props.premises.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No physical premises recorded.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Premise</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Control</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{props.premises.map((item) => (
									<PremiseRow
										canWrite={props.canWrite}
										item={item}
										key={item.id}
									/>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</section>
	);
}

function EstablishmentRow({
	item,
	canWrite,
}: {
	item: LegalEstablishmentView;
	canWrite: boolean;
}) {
	const [updateState, updateAction] = useActionState<MutationState, FormData>(
		updateLegalEstablishmentFormAction,
		null,
	);
	const [activateState, activateAction] = useActionState<
		MutationState,
		FormData
	>(activateLegalEstablishmentFormAction, null);
	const [suspendState, suspendAction] = useActionState<MutationState, FormData>(
		suspendLegalEstablishmentFormAction,
		null,
	);
	const [closeState, closeAction] = useActionState<MutationState, FormData>(
		closeLegalEstablishmentFormAction,
		null,
	);
	const common = (
		<>
			<input name="legalEstablishmentId" type="hidden" value={item.id} />
			<input name="expectedVersion" type="hidden" value={item.version} />
		</>
	);
	return (
		<TableRow>
			<TableCell>
				<span className="font-medium">{item.displayName}</span>
				<br />
				<span className="text-muted-foreground text-xs">
					{item.type} · {item.jurisdictionCode} · {item.registrationIdentifier}
				</span>
			</TableCell>
			<TableCell>
				{item.status} (v{item.version})
			</TableCell>
			<TableCell>{item.registeredFrom}</TableCell>
			<TableCell className="min-w-80 space-y-3">
				<form action={updateAction} className="grid gap-2 sm:grid-cols-2">
					{common}
					<TextField
						defaultValue={item.displayName}
						label="Updated display name"
						name="displayName"
					/>
					<TextField label="Update evidence" name="sourceDocumentId" />
					<SubmitButton disabled={!canWrite}>Update</SubmitButton>
				</form>
				{item.status === "registered" || item.status === "suspended" ? (
					<TransitionForm
						action={activateAction}
						disabled={!canWrite}
						item={item}
						label="Activate"
					/>
				) : null}
				{item.status === "active" ? (
					<TransitionForm
						action={suspendAction}
						disabled={!canWrite}
						item={item}
						label="Suspend"
					/>
				) : null}
				{item.status === "closed" ? null : (
					<TransitionForm
						action={closeAction}
						disabled={!canWrite}
						item={item}
						label="Close"
					/>
				)}
				<ActionFeedback
					state={updateState ?? activateState ?? suspendState ?? closeState}
					success="Establishment updated."
				/>
			</TableCell>
		</TableRow>
	);
}

function TransitionForm({
	action,
	item,
	label,
	disabled,
}: {
	action: (payload: FormData) => void;
	item: LegalEstablishmentView;
	label: string;
	disabled: boolean;
}) {
	return (
		<form action={action} className="grid gap-2 sm:grid-cols-3">
			<input name="legalEstablishmentId" type="hidden" value={item.id} />
			<input name="expectedVersion" type="hidden" value={item.version} />
			<TextField label={`${label} date`} name="effectiveFrom" type="date" />
			<TextField label={`${label} reason`} name="reason" />
			<TextField label={`${label} evidence`} name="sourceDocumentId" />
			<SubmitButton disabled={disabled}>{label}</SubmitButton>
		</form>
	);
}

function PremiseRow({
	item,
	canWrite,
}: {
	item: PremiseView;
	canWrite: boolean;
}) {
	const [state, action] = useActionState<MutationState, FormData>(
		endPremiseFormAction,
		null,
	);
	return (
		<TableRow>
			<TableCell>
				{item.displayName}
				<br />
				<span className="text-muted-foreground text-xs">
					{item.type} · {item.address}
				</span>
			</TableCell>
			<TableCell>{item.status}</TableCell>
			<TableCell>
				{item.status === "active" ? (
					<form action={action} className="space-y-2">
						<input name="premiseId" type="hidden" value={item.id} />
						<input name="expectedVersion" type="hidden" value={item.version} />
						<TextField label="End date" name="endedOn" type="date" />
						<TextField label="End reason" name="reason" />
						<TextField label="End evidence" name="sourceDocumentId" />
						<SubmitButton disabled={!canWrite}>End premise</SubmitButton>
						<ActionFeedback state={state} success="Premise ended." />
					</form>
				) : null}
			</TableCell>
		</TableRow>
	);
}

function TextField(props: {
	label: string;
	name: string;
	type?: string;
	defaultValue?: string;
	maxLength?: number;
	pattern?: string;
	required?: boolean;
}) {
	const id = `ca-establishment-${props.name}-${props.label.replaceAll(" ", "-").toLowerCase()}`;
	return (
		<div className="space-y-1">
			<Label htmlFor={id}>{props.label}</Label>
			<Input
				defaultValue={props.defaultValue}
				id={id}
				maxLength={props.maxLength}
				name={props.name}
				pattern={props.pattern}
				required={props.required ?? true}
				type={props.type}
			/>
		</div>
	);
}

function SelectField({
	label,
	name,
	options,
}: {
	label: string;
	name: string;
	options: readonly (readonly [string, string])[];
}) {
	const id = `ca-establishment-${name}`;
	return (
		<div className="space-y-1">
			<Label htmlFor={id}>{label}</Label>
			<NativeSelect id={id} name={name} required>
				{options.map(([value, text]) => (
					<NativeSelectOption key={value} value={value}>
						{text}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

function EstablishmentScopeSelect({
	establishments,
}: {
	establishments: readonly LegalEstablishmentView[];
}) {
	return (
		<div className="space-y-1">
			<Label htmlFor="ca-establishment-scope">
				Establishment scope (optional)
			</Label>
			<NativeSelect id="ca-establishment-scope" name="legalEstablishmentId">
				<NativeSelectOption value="">Legal company</NativeSelectOption>
				{establishments.map((item) => (
					<NativeSelectOption key={item.id} value={item.id}>
						{item.displayName}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

function AddressSelect({
	addresses,
}: {
	addresses: readonly { id: string; label: string }[];
}) {
	return (
		<div className="space-y-1">
			<Label htmlFor="ca-source-party-address">Master Data address</Label>
			<NativeSelect
				id="ca-source-party-address"
				name="sourcePartyAddressId"
				required
			>
				<NativeSelectOption value="">Select an address</NativeSelectOption>
				{addresses.map((item) => (
					<NativeSelectOption key={item.id} value={item.id}>
						{item.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
			{addresses.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					Add an active party address in Master Data first.
				</p>
			) : null}
		</div>
	);
}

function HistoryTable({
	title,
	empty,
	rows,
}: {
	title: string;
	empty: string;
	rows: readonly (readonly string[])[];
}) {
	return (
		<div className="space-y-3">
			<h3 className="font-medium">{title}</h3>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">{empty}</p>
			) : (
				<Table>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.join("|")}>
								{row.map((cell) => (
									<TableCell key={cell}>{cell}</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}

function SubmitButton({
	children,
	disabled,
}: {
	children: ReactNode;
	disabled: boolean;
}) {
	const status = useFormStatus();
	return (
		<Button disabled={disabled || status.pending} type="submit">
			{status.pending ? "Saving..." : <span>{children}</span>}
		</Button>
	);
}

function ActionFeedback({
	state,
	success,
}: {
	state: MutationState;
	success: string;
}) {
	if (state === null) {
		return null;
	}
	return state.ok ? (
		<p
			aria-live="polite"
			className="text-sm text-success-subtle-foreground"
			role="status"
		>
			{success}
		</p>
	) : (
		<Alert role="alert" variant="destructive">
			<AlertTitle>Change not saved</AlertTitle>
			<AlertDescription>{state.message}</AlertDescription>
		</Alert>
	);
}
