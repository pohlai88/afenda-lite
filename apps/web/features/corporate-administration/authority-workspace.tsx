"use client";

import type { Result as ActionResult } from "@afenda/errors";
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
	Label,
	NativeSelect,
	NativeSelectOption,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TextField,
} from "@afenda/ui-system";
import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
	type AuthorityMandateActionResult,
	amendAuthorityMandateFormAction,
	grantAuthorityMandateFormAction,
	revokeAuthorityMandateFormAction,
} from "@/app/actions/corporate-administration-authority-actions";

export type AuthorityWorkspaceMandate = Readonly<{
	id: string;
	mandateType: string;
	holderPartyId: string | null;
	holderOfficerAppointmentId: string | null;
	grantedByType: string;
	scopeDescription: string;
	monetaryLimitAmount: string | null;
	monetaryLimitCurrencyCode: string | null;
	jurisdictionCode: string | null;
	protectedAuthority: boolean;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: string;
	revocationReason: string | null;
	version: number;
}>;

export type AuthorityWorkspaceAppointment = Readonly<{
	id: string;
	officerPartyId: string;
	status: string;
}>;

type AuthorityWorkspaceParty = Readonly<{
	id: string;
	code: string;
	name: string;
}>;

const MANDATE_TYPES = [
	"signing_authority",
	"bank_mandate",
	"power_of_attorney",
	"delegated_authority",
	"other",
] as const;

const GRANTED_BY_TYPES = [
	"board_resolution",
	"shareholder_resolution",
	"statutory_office",
	"power_of_attorney",
] as const;

export function AuthorityWorkspace({
	appointments,
	canManage,
	company,
	mandates,
	organizationSlug,
	parties,
}: Readonly<{
	appointments: readonly AuthorityWorkspaceAppointment[];
	canManage: boolean;
	company: Readonly<{ legalCompanyId: string; version: number }>;
	mandates: readonly AuthorityWorkspaceMandate[];
	organizationSlug: string;
	parties: readonly AuthorityWorkspaceParty[];
}>) {
	const [grantState, grantAction] = useActionState<
		ActionResult<AuthorityMandateActionResult> | null,
		FormData
	>(grantAuthorityMandateFormAction, null);
	const [amendState, amendAction] = useActionState<
		ActionResult<AuthorityMandateActionResult> | null,
		FormData
	>(amendAuthorityMandateFormAction, null);
	const [revokeState, revokeAction] = useActionState<
		ActionResult<AuthorityMandateActionResult> | null,
		FormData
	>(revokeAuthorityMandateFormAction, null);

	const activeAppointments = appointments.filter(
		(appointment) => appointment.status === "active",
	);
	const activeMandates = mandates.filter(
		(mandate) => mandate.status === "active",
	);
	const protectedMandates = mandates.filter(
		(mandate) => mandate.protectedAuthority,
	);

	return (
		<section
			aria-labelledby="authority-heading"
			className="space-y-6 border-t pt-6"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-medium text-lg" id="authority-heading">
						Corporate authority
					</h2>
					<p className="text-muted-foreground text-sm">
						Authority mandates granted by the selected legal company: who may
						bind it, within which scope and limits.
					</p>
				</div>
				<StatusBadge
					label={canManage ? "Mandate changes available" : "Read only"}
					showIcon={false}
					status={canManage ? "success" : "inactive"}
				/>
			</div>

			{protectedMandates.length === 0 ? null : (
				<Alert role="status">
					<AlertTitle>Protected mandates require platform approval</AlertTitle>
					<AlertDescription>
						Protected authority mandates require platform approval, which is not
						yet available. Grants of protected mandates fail closed until the
						approval capability exists.
					</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Authority mandates</CardTitle>
					<CardDescription>
						Mandates effective as of today, with scope, monetary limits, and
						tenure as recorded.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{mandates.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No authority mandate is recorded for this company.
						</p>
					) : (
						<Table aria-label="Authority mandates">
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Holder</TableHead>
									<TableHead>Scope</TableHead>
									<TableHead>Monetary limit</TableHead>
									<TableHead>Tenure</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Version</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{mandates.map((mandate) => (
									<TableRow key={mandate.id}>
										<TableCell>
											{mandate.mandateType}
											{mandate.protectedAuthority ? " (Protected)" : null}
										</TableCell>
										<TableCell>
											{holderLabel(mandate, appointments, parties)}
										</TableCell>
										<TableCell>{mandate.scopeDescription}</TableCell>
										<TableCell>
											{mandate.monetaryLimitAmount === null
												? "—"
												: `${mandate.monetaryLimitAmount} ${mandate.monetaryLimitCurrencyCode ?? ""}`.trim()}
										</TableCell>
										<TableCell>
											{mandate.effectiveFrom}
											{mandate.effectiveTo === null
												? " — present"
												: ` — ${mandate.effectiveTo}`}
										</TableCell>
										<TableCell>
											{mandate.status}
											{mandate.revocationReason === null
												? null
												: ` (${mandate.revocationReason})`}
										</TableCell>
										<TableCell>{mandate.version}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Grant mandate</CardTitle>
						<CardDescription>
							Grant an authority mandate to a party or to an active officer
							appointment. Choose exactly one holder.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={grantAction} aria-label="Grant authority mandate">
							<fieldset className="grid gap-4" disabled={!canManage}>
								<ActionMetadata organizationSlug={organizationSlug} />
								<input
									name="legalCompanyId"
									type="hidden"
									value={company.legalCompanyId}
								/>
								<EnumSelect
									label="Mandate type"
									name="mandateType"
									options={MANDATE_TYPES}
								/>
								<div className="grid gap-2">
									<Label htmlFor="holderPartyId">Holder party</Label>
									<NativeSelect id="holderPartyId" name="holderPartyId">
										<NativeSelectOption value="">
											No party holder
										</NativeSelectOption>
										{parties.map((party) => (
											<NativeSelectOption key={party.id} value={party.id}>
												{party.name} ({party.code})
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="holderOfficerAppointmentId">
										Holder officer appointment
									</Label>
									<NativeSelect
										id="holderOfficerAppointmentId"
										name="holderOfficerAppointmentId"
									>
										<NativeSelectOption value="">
											No officer holder
										</NativeSelectOption>
										{activeAppointments.map((appointment) => (
											<NativeSelectOption
												key={appointment.id}
												value={appointment.id}
											>
												{partyName(parties, appointment.officerPartyId)}{" "}
												(officer)
											</NativeSelectOption>
										))}
									</NativeSelect>
									<p className="text-muted-foreground text-xs">
										Exactly one holder must be chosen: a party or an officer
										appointment, never both.
									</p>
								</div>
								<EnumSelect
									label="Granted by"
									name="grantedByType"
									options={GRANTED_BY_TYPES}
								/>
								<TextField
									label="Granting resolution reference"
									name="grantingResolutionId"
								/>
								<TextField
									label="Scope description"
									name="scopeDescription"
									required
								/>
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Monetary limit amount"
										name="monetaryLimitAmount"
									/>
									<TextField
										label="Monetary limit currency"
										name="monetaryLimitCurrencyCode"
									/>
								</div>
								<TextField label="Jurisdiction code" name="jurisdictionCode" />
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Effective from"
										name="effectiveFrom"
										required
										type="date"
									/>
									<TextField
										label="Effective to"
										name="effectiveTo"
										type="date"
									/>
								</div>
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected company version"
									min="1"
									name="expectedCompanyVersion"
									required
									type="number"
								/>
								<div className="grid gap-2">
									<Label htmlFor="protectedAuthority">
										Protected authority
									</Label>
									<NativeSelect
										id="protectedAuthority"
										name="protectedAuthority"
									>
										<NativeSelectOption value="false">No</NativeSelectOption>
										<NativeSelectOption value="true">Yes</NativeSelectOption>
									</NativeSelect>
									<p className="text-muted-foreground text-xs">
										Protected mandates require platform approval, which is not
										yet available; protected grants currently fail closed.
									</p>
								</div>
								<SubmitButton disabled={!canManage}>Grant mandate</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={grantState} success={grantSuccess} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Amend mandate</CardTitle>
						<CardDescription>
							Update the scope, monetary limit, jurisdiction, or end date of an
							existing mandate.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={amendAction} aria-label="Amend authority mandate">
							<fieldset
								className="grid gap-4"
								disabled={!canManage || mandates.length === 0}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<MandateSelect
									appointments={appointments}
									mandates={mandates}
									parties={parties}
								/>
								<TextField
									label="Scope description"
									name="scopeDescription"
									required
								/>
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Monetary limit amount"
										name="monetaryLimitAmount"
									/>
									<TextField
										label="Monetary limit currency"
										name="monetaryLimitCurrencyCode"
									/>
								</div>
								<TextField label="Jurisdiction code" name="jurisdictionCode" />
								<TextField
									label="Effective to"
									name="effectiveTo"
									type="date"
								/>
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected mandate version"
									min="1"
									name="expectedVersion"
									required
									type="number"
								/>
								<SubmitButton disabled={!canManage || mandates.length === 0}>
									Amend mandate
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={amendState} success={amendSuccess} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Revoke mandate</CardTitle>
						<CardDescription>
							Revoke an active mandate. The mandate history is preserved.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={revokeAction} aria-label="Revoke authority mandate">
							<fieldset
								className="grid gap-4"
								disabled={!canManage || activeMandates.length === 0}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<MandateSelect
									appointments={appointments}
									mandates={activeMandates}
									parties={parties}
								/>
								<TextField
									label="Revoked on"
									name="revokedOn"
									required
									type="date"
								/>
								<TextField label="Reason" name="reason" required />
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected mandate version"
									min="1"
									name="expectedVersion"
									required
									type="number"
								/>
								<SubmitButton
									disabled={!canManage || activeMandates.length === 0}
								>
									Revoke mandate
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={revokeState} success={revokeSuccess} />
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

function MandateSelect({
	appointments,
	mandates,
	parties,
}: Readonly<{
	appointments: readonly AuthorityWorkspaceAppointment[];
	mandates: readonly AuthorityWorkspaceMandate[];
	parties: readonly AuthorityWorkspaceParty[];
}>) {
	return (
		<div className="grid gap-2">
			<Label htmlFor="authorityMandateId">Mandate</Label>
			<NativeSelect id="authorityMandateId" name="authorityMandateId" required>
				{mandates.map((mandate) => (
					<NativeSelectOption key={mandate.id} value={mandate.id}>
						{mandate.mandateType} —{" "}
						{holderLabel(mandate, appointments, parties)}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

function EnumSelect({
	label,
	name,
	options,
}: Readonly<{
	label: string;
	name: string;
	options: readonly string[];
}>) {
	return (
		<div className="grid gap-2">
			<Label htmlFor={name}>{label}</Label>
			<NativeSelect id={name} name={name} required>
				{options.map((option) => (
					<NativeSelectOption key={option} value={option}>
						{option}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

function ActionMetadata({
	organizationSlug,
}: Readonly<{ organizationSlug: string }>) {
	return (
		<input name="organizationSlug" type="hidden" value={organizationSlug} />
	);
}

function SubmitButton({
	children,
	disabled,
}: Readonly<{ children: ReactNode; disabled: boolean }>) {
	const status = useFormStatus();
	return (
		<Button
			aria-busy={status.pending}
			disabled={disabled || status.pending}
			type="submit"
		>
			{status.pending ? "Saving…" : <span>{children}</span>}
		</Button>
	);
}

function ActionFeedback<T>({
	state,
	success,
}: Readonly<{ state: ActionResult<T> | null; success: (data: T) => string }>) {
	if (state === null) {
		return null;
	}
	if (!state.ok) {
		return (
			<Alert role="alert" variant="destructive">
				<AlertTitle>Mandate change not saved</AlertTitle>
				<AlertDescription>{state.message}</AlertDescription>
			</Alert>
		);
	}
	return (
		<p className="text-sm text-success-subtle-foreground" role="status">
			{success(state.data)}
		</p>
	);
}

function holderLabel(
	mandate: AuthorityWorkspaceMandate,
	appointments: readonly AuthorityWorkspaceAppointment[],
	parties: readonly AuthorityWorkspaceParty[],
): string {
	if (mandate.holderPartyId !== null) {
		return partyName(parties, mandate.holderPartyId);
	}
	if (mandate.holderOfficerAppointmentId !== null) {
		const appointment = appointments.find(
			(candidate) => candidate.id === mandate.holderOfficerAppointmentId,
		);
		return appointment === undefined
			? mandate.holderOfficerAppointmentId
			: `${partyName(parties, appointment.officerPartyId)} (officer)`;
	}
	return "Unknown holder";
}

function partyName(
	parties: readonly AuthorityWorkspaceParty[],
	partyId: string,
): string {
	return parties.find((party) => party.id === partyId)?.name ?? partyId;
}

function grantSuccess(data: AuthorityMandateActionResult): string {
	return `Mandate ${data.authorityMandateId} granted as ${data.status}.`;
}

function amendSuccess(data: AuthorityMandateActionResult): string {
	return `Mandate ${data.authorityMandateId} amended (version ${data.version}).`;
}

function revokeSuccess(data: AuthorityMandateActionResult): string {
	return `Mandate ${data.authorityMandateId} is now ${data.status}.`;
}
