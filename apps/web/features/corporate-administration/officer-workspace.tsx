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
	appointOfficerFormAction,
	type OfficerAppointmentActionResult,
	type OfficerQualificationActionResult,
	recordOfficerQualificationFormAction,
	removeOfficerFormAction,
	resignOfficerFormAction,
} from "@/app/actions/corporate-administration-officer-actions";

export type OfficerWorkspaceOffice = Readonly<{
	id: string;
	displayName: string;
	officeTypeCode: string;
	protectedRole: boolean;
	required: boolean;
	status: string;
	version: number;
}>;

export type OfficerWorkspaceAppointment = Readonly<{
	id: string;
	statutoryOfficeId: string;
	officerPartyId: string;
	appointmentMethod: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: string;
	endReason: string | null;
	version: number;
}>;

const APPOINTMENT_METHODS = [
	"board_resolution",
	"shareholder_resolution",
	"statutory_filing",
	"delegated_authority",
	"court_order",
	"other",
] as const;

const APPOINTING_AUTHORITY_TYPES = [
	"governance_body",
	"shareholder_body",
	"statutory_authority",
	"court",
	"delegated_role",
	"other",
] as const;

const VERIFICATION_STATUSES = ["pending", "verified", "rejected", "expired"];

export function OfficerWorkspace({
	appointments,
	canManage,
	offices,
	organizationSlug,
	parties,
}: Readonly<{
	appointments: readonly OfficerWorkspaceAppointment[];
	canManage: boolean;
	offices: readonly OfficerWorkspaceOffice[];
	organizationSlug: string;
	parties: readonly { id: string; code: string; name: string }[];
}>) {
	const [appointState, appointAction] = useActionState<
		ActionResult<OfficerAppointmentActionResult> | null,
		FormData
	>(appointOfficerFormAction, null);
	const [qualificationState, qualificationAction] = useActionState<
		ActionResult<OfficerQualificationActionResult> | null,
		FormData
	>(recordOfficerQualificationFormAction, null);
	const [resignState, resignAction] = useActionState<
		ActionResult<OfficerAppointmentActionResult> | null,
		FormData
	>(resignOfficerFormAction, null);
	const [removeState, removeAction] = useActionState<
		ActionResult<OfficerAppointmentActionResult> | null,
		FormData
	>(removeOfficerFormAction, null);

	const ordinaryOffices = offices.filter((office) => !office.protectedRole);
	const protectedOffices = offices.filter((office) => office.protectedRole);
	const activeAppointments = appointments.filter(
		(appointment) => appointment.status === "active",
	);

	return (
		<section
			aria-labelledby="officers-heading"
			className="space-y-6 border-t pt-6"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-medium text-lg" id="officers-heading">
						Statutory officers
					</h2>
					<p className="text-muted-foreground text-sm">
						Ordinary appointments, tenure history, and supported departure
						actions for the selected legal company.
					</p>
				</div>
				<StatusBadge
					label={canManage ? "Officer changes available" : "Read only"}
					showIcon={false}
					status={canManage ? "success" : "inactive"}
				/>
			</div>

			{protectedOffices.length === 0 ? null : (
				<Alert role="status">
					<AlertTitle>Protected appointments unavailable</AlertTitle>
					<AlertDescription>
						{protectedOffices.map((office) => office.displayName).join(", ")}{" "}
						require platform approval, which is not yet available. These
						appointments fail closed until the approval capability exists.
					</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Appointment history</CardTitle>
					<CardDescription>
						Every appointment with its tenure and departure facts as recorded.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{appointments.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No officer appointment is recorded for this company.
						</p>
					) : (
						<Table aria-label="Officer appointments">
							<TableHeader>
								<TableRow>
									<TableHead>Office</TableHead>
									<TableHead>Officer party</TableHead>
									<TableHead>Method</TableHead>
									<TableHead>Tenure</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Version</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{appointments.map((appointment) => (
									<TableRow key={appointment.id}>
										<TableCell>
											{officeName(offices, appointment.statutoryOfficeId)}
										</TableCell>
										<TableCell>
											{partyName(parties, appointment.officerPartyId)}
										</TableCell>
										<TableCell>{appointment.appointmentMethod}</TableCell>
										<TableCell>
											{appointment.effectiveFrom}
											{appointment.effectiveTo === null
												? " — present"
												: ` — ${appointment.effectiveTo}`}
										</TableCell>
										<TableCell>
											{appointment.status}
											{appointment.endReason === null
												? null
												: ` (${appointment.endReason})`}
										</TableCell>
										<TableCell>{appointment.version}</TableCell>
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
						<CardTitle>Appoint officer</CardTitle>
						<CardDescription>
							Ordinary appointments only. Protected offices are excluded until
							platform approval exists.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={appointAction} aria-label="Appoint officer">
							<fieldset
								className="grid gap-4"
								disabled={!canManage || ordinaryOffices.length === 0}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<div className="grid gap-2">
									<Label htmlFor="statutoryOfficeId">Statutory office</Label>
									<NativeSelect
										id="statutoryOfficeId"
										name="statutoryOfficeId"
										required
									>
										{ordinaryOffices.map((office) => (
											<NativeSelectOption key={office.id} value={office.id}>
												{office.displayName}
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="officerPartyId">Officer party</Label>
									<NativeSelect
										id="officerPartyId"
										name="officerPartyId"
										required
									>
										{parties.map((party) => (
											<NativeSelectOption key={party.id} value={party.id}>
												{party.name} ({party.code})
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									<EnumSelect
										label="Appointment method"
										name="appointmentMethod"
										options={APPOINTMENT_METHODS}
									/>
									<EnumSelect
										label="Appointing authority"
										name="appointingAuthorityType"
										options={APPOINTING_AUTHORITY_TYPES}
									/>
								</div>
								<TextField
									label="Appointing authority reference"
									name="appointingAuthorityId"
								/>
								<TextField
									label="Consent document"
									name="consentDocumentId"
									required
								/>
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
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
									label="Expected office version"
									min="1"
									name="expectedOfficeVersion"
									required
									type="number"
								/>
								<SubmitButton
									disabled={!canManage || ordinaryOffices.length === 0}
								>
									Appoint officer
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback state={appointState} success={appointmentSuccess} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Record qualification</CardTitle>
						<CardDescription>
							Eligibility evidence for an existing appointment; verified entries
							require a verification timestamp.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form
							action={qualificationAction}
							aria-label="Record officer qualification"
						>
							<fieldset
								className="grid gap-4"
								disabled={!canManage || activeAppointments.length === 0}
							>
								<ActionMetadata organizationSlug={organizationSlug} />
								<AppointmentSelect
									appointments={activeAppointments}
									offices={offices}
									parties={parties}
								/>
								<TextField
									label="Qualification type code"
									name="qualificationTypeCode"
									required
								/>
								<TextField label="Issuer" name="issuer" required />
								<TextField label="Reference number" name="referenceNumber" />
								<div className="grid gap-4 sm:grid-cols-2">
									<TextField
										label="Valid from"
										name="validFrom"
										required
										type="date"
									/>
									<TextField label="Valid to" name="validTo" type="date" />
								</div>
								<div className="grid gap-2">
									<Label htmlFor="verificationStatus">
										Verification status
									</Label>
									<NativeSelect
										id="verificationStatus"
										name="verificationStatus"
										required
									>
										{VERIFICATION_STATUSES.map((status) => (
											<NativeSelectOption key={status} value={status}>
												{status}
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<TextField
									label="Verified at"
									name="verifiedAt"
									type="datetime-local"
								/>
								<TextField
									label="Source document"
									name="sourceDocumentId"
									required
								/>
								<TextField
									label="Expected appointment version"
									min="1"
									name="expectedAppointmentVersion"
									required
									type="number"
								/>
								<SubmitButton
									disabled={!canManage || activeAppointments.length === 0}
								>
									Record qualification
								</SubmitButton>
							</fieldset>
						</form>
						<ActionFeedback
							state={qualificationState}
							success={qualificationSuccess}
						/>
					</CardContent>
				</Card>

				<DepartureCard
					action={resignAction}
					appointments={activeAppointments}
					canManage={canManage}
					dateField="resignedOn"
					dateLabel="Resigned on"
					description="The officer leaves voluntarily. Tenure history is preserved."
					formLabel="Record officer resignation"
					offices={offices}
					organizationSlug={organizationSlug}
					parties={parties}
					state={resignState}
					submitLabel="Record resignation"
					title="Resignation"
				/>

				<DepartureCard
					action={removeAction}
					appointments={activeAppointments}
					canManage={canManage}
					dateField="removedOn"
					dateLabel="Removed on"
					description="The appointing authority ends the appointment. Tenure history is preserved."
					formLabel="Record officer removal"
					offices={offices}
					organizationSlug={organizationSlug}
					parties={parties}
					state={removeState}
					submitLabel="Record removal"
					title="Removal"
				/>
			</div>
		</section>
	);
}

function DepartureCard({
	action,
	appointments,
	canManage,
	dateField,
	dateLabel,
	description,
	formLabel,
	offices,
	organizationSlug,
	parties,
	state,
	submitLabel,
	title,
}: Readonly<{
	action: (formData: FormData) => void;
	appointments: readonly OfficerWorkspaceAppointment[];
	canManage: boolean;
	dateField: "resignedOn" | "removedOn";
	dateLabel: string;
	description: string;
	formLabel: string;
	offices: readonly OfficerWorkspaceOffice[];
	organizationSlug: string;
	parties: readonly { id: string; code: string; name: string }[];
	state: ActionResult<OfficerAppointmentActionResult> | null;
	submitLabel: string;
	title: string;
}>) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<form action={action} aria-label={formLabel}>
					<fieldset
						className="grid gap-4"
						disabled={!canManage || appointments.length === 0}
					>
						<ActionMetadata organizationSlug={organizationSlug} />
						<AppointmentSelect
							appointments={appointments}
							offices={offices}
							parties={parties}
						/>
						<TextField
							label={dateLabel}
							name={dateField}
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
							label="Expected appointment version"
							min="1"
							name="expectedVersion"
							required
							type="number"
						/>
						<SubmitButton disabled={!canManage || appointments.length === 0}>
							{submitLabel}
						</SubmitButton>
					</fieldset>
				</form>
				<ActionFeedback state={state} success={departureSuccess} />
			</CardContent>
		</Card>
	);
}

function AppointmentSelect({
	appointments,
	offices,
	parties,
}: Readonly<{
	appointments: readonly OfficerWorkspaceAppointment[];
	offices: readonly OfficerWorkspaceOffice[];
	parties: readonly { id: string; code: string; name: string }[];
}>) {
	return (
		<div className="grid gap-2">
			<Label htmlFor="officerAppointmentId">Appointment</Label>
			<NativeSelect
				id="officerAppointmentId"
				name="officerAppointmentId"
				required
			>
				{appointments.map((appointment) => (
					<NativeSelectOption key={appointment.id} value={appointment.id}>
						{officeName(offices, appointment.statutoryOfficeId)} —{" "}
						{partyName(parties, appointment.officerPartyId)}
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
				<AlertTitle>Officer change not saved</AlertTitle>
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

function officeName(
	offices: readonly OfficerWorkspaceOffice[],
	statutoryOfficeId: string,
): string {
	return (
		offices.find((office) => office.id === statutoryOfficeId)?.displayName ??
		statutoryOfficeId
	);
}

function partyName(
	parties: readonly { id: string; code: string; name: string }[],
	partyId: string,
): string {
	return parties.find((party) => party.id === partyId)?.name ?? partyId;
}

function appointmentSuccess(data: OfficerAppointmentActionResult): string {
	return `Appointment ${data.officerAppointmentId} recorded as ${data.status}.`;
}

function qualificationSuccess(data: OfficerQualificationActionResult): string {
	return `Qualification ${data.officerQualificationId} recorded (${data.verificationStatus}).`;
}

function departureSuccess(data: OfficerAppointmentActionResult): string {
	return `Appointment ${data.officerAppointmentId} is now ${data.status}.`;
}
