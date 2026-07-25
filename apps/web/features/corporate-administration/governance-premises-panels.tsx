"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Checkbox,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Textarea,
} from "@afenda/ui-system";
import { useActionState, useId, useState } from "react";

import {
	amendAuthorityMandateAction,
	amendOfficerAction,
	appointGovernanceMembershipAction,
	appointOfficerAction,
	approveResolutionAction,
	closeGovernanceMeetingAction,
	createGovernanceBodyAction,
	endGovernanceMembershipAction,
	endOfficerAction,
	type GovernanceMutationActionState,
	grantAuthorityMandateAction,
	recordGovernanceMeetingAction,
	recordResolutionAction,
	registerCompanyPremiseAction,
	retireCompanyPremiseAction,
	retireGovernanceBodyAction,
	revokeAuthorityMandateAction,
	revokeResolutionAction,
	updateCompanyPremiseAction,
	updateGovernanceBodyAction,
} from "@/app/actions/corporate-administration-governance";

type GovernanceAction = (
	previousState: GovernanceMutationActionState,
	formData: FormData,
) => Promise<GovernanceMutationActionState>;

export type CorporateRegisterRow = {
	id: string;
	label: string;
	summary: string;
	status: string;
	version: number;
};

export type GovernancePremisesSnapshot = {
	officers: CorporateRegisterRow[];
	bodies: CorporateRegisterRow[];
	memberships: CorporateRegisterRow[];
	mandates: CorporateRegisterRow[];
	premises: CorporateRegisterRow[];
	meetings: CorporateRegisterRow[];
	resolutions: CorporateRegisterRow[];
};

type CommandField = {
	name: string;
	label: string;
	type?: "text" | "date" | "number";
	defaultValue?: string;
	required?: boolean;
	description?: string;
	options?: ReadonlyArray<{ value: string; label: string }>;
	multiline?: boolean;
};

type CommandDefinition = {
	id: string;
	title: string;
	description: string;
	action: GovernanceAction;
	hidden: Record<string, string>;
	fields: CommandField[];
	highRisk?: boolean;
};

function CommandResult({ state }: { state: GovernanceMutationActionState }) {
	if (!state) return null;
	return (
		<Alert variant={state.ok ? "default" : "destructive"} aria-live="polite">
			<AlertTitle>
				{state.ok ? "Governance record saved" : "Could not save"}
			</AlertTitle>
			<AlertDescription>
				{state.ok
					? `Record ${state.data.entity.id} is now at version ${state.data.entity.version}.`
					: state.message}
			</AlertDescription>
		</Alert>
	);
}

function GovernanceCommandForm({ command }: { command: CommandDefinition }) {
	const requestId = useId();
	const confirmationId = `${command.id}-${requestId}-confirmation`;
	const [confirmed, setConfirmed] = useState(false);
	const [state, action, pending] = useActionState<
		GovernanceMutationActionState,
		FormData
	>(command.action, null);

	return (
		<form action={action} className="space-y-4" aria-busy={pending}>
			<input type="hidden" name="requestId" value={requestId} />
			{Object.entries(command.hidden).map(([name, value]) => (
				<input key={name} type="hidden" name={name} value={value} />
			))}
			<div className="grid gap-4 md:grid-cols-2">
				{command.fields.map((field) => {
					const id = `${command.id}-${requestId}-${field.name}`;
					return (
						<div className="grid gap-2" key={field.name}>
							<Label htmlFor={id}>{field.label}</Label>
							{field.options ? (
								<NativeSelect
									id={id}
									name={field.name}
									defaultValue={field.defaultValue}
									required={field.required}
								>
									{!field.defaultValue ? (
										<NativeSelectOption value="">Select…</NativeSelectOption>
									) : null}
									{field.options.map((option) => (
										<NativeSelectOption key={option.value} value={option.value}>
											{option.label}
										</NativeSelectOption>
									))}
								</NativeSelect>
							) : field.multiline ? (
								<Textarea
									id={id}
									name={field.name}
									defaultValue={field.defaultValue}
									required={field.required}
								/>
							) : (
								<Input
									id={id}
									name={field.name}
									type={field.type ?? "text"}
									defaultValue={field.defaultValue}
									required={field.required}
								/>
							)}
							{field.description ? (
								<p className="text-sm text-muted-foreground">
									{field.description}
								</p>
							) : null}
						</div>
					);
				})}
			</div>
			{command.highRisk ? (
				<div className="flex items-start gap-3 rounded-md border p-4">
					<Checkbox
						id={confirmationId}
						checked={confirmed}
						onCheckedChange={(checked) => setConfirmed(checked === true)}
					/>
					<Label htmlFor={confirmationId}>
						I reviewed the effective date, reason, and evidence for this
						statutory change.
					</Label>
				</div>
			) : null}
			<CommandResult state={state} />
			<Button
				type="submit"
				disabled={pending || (command.highRisk === true && !confirmed)}
			>
				{pending ? "Saving…" : command.title}
			</Button>
			<span className="sr-only" role="status" aria-live="polite">
				{pending ? `${command.title} is in progress.` : ""}
			</span>
		</form>
	);
}

function RegisterTable({
	caption,
	rows,
}: {
	caption: string;
	rows: CorporateRegisterRow[];
}) {
	return (
		<Table>
			<TableCaption>{caption}</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Record</TableHead>
					<TableHead>Details</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Version</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.length === 0 ? (
					<TableRow>
						<TableCell colSpan={4} className="text-muted-foreground">
							No records for this company.
						</TableCell>
					</TableRow>
				) : (
					rows.map((row) => (
						<TableRow key={row.id}>
							<TableCell className="font-medium">{row.label}</TableCell>
							<TableCell>{row.summary}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>{row.version}</TableCell>
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}

const officerRoleOptions = [
	{ value: "director", label: "Director" },
	{ value: "secretary", label: "Company secretary" },
	{ value: "auditor", label: "Auditor" },
	{ value: "public_officer", label: "Public officer" },
	{ value: "authorized_representative", label: "Authorized representative" },
	{ value: "other", label: "Other" },
] as const;

const bodyTypeOptions = [
	{ value: "board", label: "Board" },
	{ value: "committee", label: "Committee" },
	{ value: "other", label: "Other" },
] as const;

const mandateTypeOptions = [
	{ value: "signing_authority", label: "Signing authority" },
	{ value: "power_of_attorney", label: "Power of attorney" },
	{ value: "other", label: "Other" },
] as const;

function targetHidden(
	legalCompanyId: string,
	row: CorporateRegisterRow,
): Record<string, string> {
	return {
		legalCompanyId,
		id: row.id,
		expectedVersion: String(row.version),
	};
}

function lifecycleFields(extra: CommandField[] = []): CommandField[] {
	return [
		{
			name: "reason",
			label: "Reason",
			required: true,
			multiline: true,
		},
		...extra,
	];
}

function GovernanceCommands({
	legalCompanyId,
	snapshot,
	defaultPartyId,
}: {
	legalCompanyId: string;
	snapshot: GovernancePremisesSnapshot;
	defaultPartyId?: string;
}) {
	const officer = snapshot.officers[0];
	const body = snapshot.bodies[0];
	const membership = snapshot.memberships[0];
	const mandate = snapshot.mandates[0];
	const meeting = snapshot.meetings[0];
	const resolution = snapshot.resolutions[0];
	const commands: CommandDefinition[] = [
		{
			id: "appoint-officer",
			title: "Appoint officer",
			description: "Create an effective-dated controlled-party appointment.",
			action: appointOfficerAction,
			hidden: { legalCompanyId },
			fields: [
				{
					name: "officerRole",
					label: "Officer role",
					options: officerRoleOptions,
					defaultValue: "director",
					required: true,
				},
				{
					name: "partyId",
					label: "Party ID",
					defaultValue: defaultPartyId,
					required: true,
				},
				{
					name: "appointedDate",
					label: "Appointment date",
					type: "date",
					required: true,
				},
				{ name: "authorityLimits", label: "Authority limits" },
			],
		},
		{
			id: "create-body",
			title: "Create governance body",
			description: "Register a board or committee with a company-local code.",
			action: createGovernanceBodyAction,
			hidden: { legalCompanyId },
			fields: [
				{ name: "code", label: "Body code", required: true },
				{
					name: "bodyType",
					label: "Body type",
					options: bodyTypeOptions,
					defaultValue: "board",
					required: true,
				},
				{ name: "displayName", label: "Display name", required: true },
			],
		},
		{
			id: "grant-mandate",
			title: "Grant authority mandate",
			description:
				"Record scope, holder identity, signature rule, limits, and evidence.",
			action: grantAuthorityMandateAction,
			hidden: { legalCompanyId },
			fields: [
				{
					name: "mandateType",
					label: "Mandate type",
					options: mandateTypeOptions,
					defaultValue: "signing_authority",
					required: true,
				},
				{
					name: "scopeDescription",
					label: "Scope",
					required: true,
					multiline: true,
				},
				{
					name: "signingRule",
					label: "Signing rule",
					options: [
						{ value: "single", label: "Single" },
						{ value: "joint", label: "Joint" },
					],
					defaultValue: "single",
					required: true,
				},
				{
					name: "minimumSignatories",
					label: "Minimum signatories",
					type: "number",
					defaultValue: "1",
					required: true,
				},
				{
					name: "holderKind1",
					label: "Holder 1 kind",
					options: [
						{ value: "party", label: "Party" },
						{ value: "officer", label: "Officer appointment" },
					],
					defaultValue: "party",
					required: true,
				},
				{
					name: "holderId1",
					label: "Holder 1 ID",
					defaultValue: defaultPartyId,
					required: true,
				},
				{
					name: "holderKind2",
					label: "Holder 2 kind",
					options: [
						{ value: "party", label: "Party" },
						{ value: "officer", label: "Officer appointment" },
					],
				},
				{ name: "holderId2", label: "Holder 2 ID" },
				{ name: "amountLimit", label: "Amount limit" },
				{ name: "currencyCode", label: "Currency code" },
				{
					name: "effectiveFrom",
					label: "Effective from",
					type: "date",
					required: true,
				},
				{
					name: "grantEvidenceReference",
					label: "Grant evidence reference",
				},
			],
		},
	];

	if (officer) {
		commands.push(
			{
				id: "amend-officer",
				title: "Amend officer",
				description:
					"Supersede the selected appointment effective on a new date.",
				action: amendOfficerAction,
				hidden: targetHidden(legalCompanyId, officer),
				fields: lifecycleFields([
					{
						name: "effectiveFrom",
						label: "Effective from",
						type: "date",
						required: true,
					},
					{
						name: "officerRole",
						label: "Replacement role",
						options: officerRoleOptions,
					},
					{ name: "authorityLimits", label: "Authority limits" },
				]),
				highRisk: true,
			},
			{
				id: "end-officer",
				title: "End officer appointment",
				description: "End the selected statutory appointment with evidence.",
				action: endOfficerAction,
				hidden: targetHidden(legalCompanyId, officer),
				fields: lifecycleFields([
					{
						name: "effectiveTo",
						label: "Effective to",
						type: "date",
						required: true,
					},
					{
						name: "endKind",
						label: "End kind",
						options: [
							{ value: "resigned", label: "Resigned" },
							{ value: "removed", label: "Removed" },
						],
						defaultValue: "resigned",
						required: true,
					},
					{ name: "evidenceReference", label: "Evidence reference" },
				]),
				highRisk: true,
			},
		);
	}

	if (body) {
		commands.push(
			{
				id: "update-body",
				title: "Update governance body",
				description:
					"Update the selected active body using optimistic concurrency.",
				action: updateGovernanceBodyAction,
				hidden: targetHidden(legalCompanyId, body),
				fields: lifecycleFields([
					{ name: "displayName", label: "Display name" },
					{ name: "bodyType", label: "Body type", options: bodyTypeOptions },
				]),
			},
			{
				id: "retire-body",
				title: "Retire governance body",
				description: "Retire the selected body without deleting its history.",
				action: retireGovernanceBodyAction,
				hidden: targetHidden(legalCompanyId, body),
				fields: lifecycleFields(),
				highRisk: true,
			},
			{
				id: "appoint-membership",
				title: "Appoint governance membership",
				description: "Add a party or officer appointment to the selected body.",
				action: appointGovernanceMembershipAction,
				hidden: { legalCompanyId, governanceBodyId: body.id },
				fields: [
					{
						name: "subjectKind",
						label: "Member source",
						options: [
							{ value: "party", label: "Party" },
							{ value: "officer", label: "Officer appointment" },
						],
						defaultValue: "party",
						required: true,
					},
					{
						name: "subjectId",
						label: "Party or appointment ID",
						defaultValue: defaultPartyId,
						required: true,
					},
					{ name: "roleTitle", label: "Role title", required: true },
					{
						name: "effectiveFrom",
						label: "Effective from",
						type: "date",
						required: true,
					},
				],
			},
			{
				id: "record-meeting",
				title: "Record governance meeting",
				description:
					"Record a standard meeting or a correction to a closed meeting.",
				action: recordGovernanceMeetingAction,
				hidden: { legalCompanyId, governanceBodyId: body.id },
				fields: [
					{
						name: "mode",
						label: "Record mode",
						options: [
							{ value: "standard", label: "Standard" },
							{ value: "correction", label: "Correction" },
						],
						defaultValue: "standard",
						required: true,
					},
					{
						name: "meetingAt",
						label: "Meeting timestamp (UTC ISO)",
						required: true,
						description: "Example: 2026-07-25T09:00:00.000Z",
					},
					{
						name: "quorumResult",
						label: "Quorum result",
						options: [
							{ value: "pending", label: "Pending" },
							{ value: "met", label: "Met" },
							{ value: "not_met", label: "Not met" },
							{ value: "waived", label: "Waived" },
						],
						defaultValue: "pending",
						required: true,
					},
					{
						name: "status",
						label: "Status",
						options: [
							{ value: "scheduled", label: "Scheduled" },
							{ value: "held", label: "Held" },
							{ value: "cancelled", label: "Cancelled" },
						],
						defaultValue: "scheduled",
					},
					{
						name: "minutesDocumentReference",
						label: "Minutes document reference",
					},
					{
						name: "correctsGovernanceMeetingId",
						label: "Closed meeting corrected",
					},
					{ name: "correctionReason", label: "Correction reason" },
				],
			},
		);
	}

	if (membership) {
		commands.push({
			id: "end-membership",
			title: "End governance membership",
			description: "End the selected effective-dated membership.",
			action: endGovernanceMembershipAction,
			hidden: targetHidden(legalCompanyId, membership),
			fields: lifecycleFields([
				{
					name: "effectiveTo",
					label: "Effective to",
					type: "date",
					required: true,
				},
			]),
			highRisk: true,
		});
	}

	if (mandate) {
		const mandateFields = lifecycleFields([
			{
				name: "effectiveFrom",
				label: "Effective from",
				type: "date",
				required: true,
			},
			{
				name: "mandateType",
				label: "Mandate type",
				options: mandateTypeOptions,
				defaultValue: "signing_authority",
				required: true,
			},
			{
				name: "scopeDescription",
				label: "Scope",
				required: true,
				multiline: true,
			},
			{
				name: "signingRule",
				label: "Signing rule",
				options: [
					{ value: "single", label: "Single" },
					{ value: "joint", label: "Joint" },
				],
				defaultValue: "single",
				required: true,
			},
			{
				name: "minimumSignatories",
				label: "Minimum signatories",
				type: "number",
				defaultValue: "1",
				required: true,
			},
			{
				name: "holderKind1",
				label: "Holder kind",
				options: [
					{ value: "party", label: "Party" },
					{ value: "officer", label: "Officer appointment" },
				],
				defaultValue: "party",
				required: true,
			},
			{
				name: "holderId1",
				label: "Holder ID",
				defaultValue: defaultPartyId,
				required: true,
			},
			{
				name: "grantEvidenceReference",
				label: "Grant evidence reference",
				required: true,
			},
		]);
		commands.push(
			{
				id: "amend-mandate",
				title: "Amend authority mandate",
				description:
					"Supersede the selected mandate with a new effective record.",
				action: amendAuthorityMandateAction,
				hidden: targetHidden(legalCompanyId, mandate),
				fields: mandateFields,
				highRisk: true,
			},
			{
				id: "revoke-mandate",
				title: "Revoke authority mandate",
				description: "Revoke the selected mandate with evidence.",
				action: revokeAuthorityMandateAction,
				hidden: targetHidden(legalCompanyId, mandate),
				fields: lifecycleFields([
					{
						name: "effectiveTo",
						label: "Effective to",
						type: "date",
						required: true,
					},
					{
						name: "evidenceReference",
						label: "Revocation evidence reference",
						required: true,
					},
				]),
				highRisk: true,
			},
		);
	}

	if (meeting) {
		commands.push({
			id: "close-meeting",
			title: "Close governance meeting",
			description: "Close the selected meeting with final quorum and minutes.",
			action: closeGovernanceMeetingAction,
			hidden: targetHidden(legalCompanyId, meeting),
			fields: lifecycleFields([
				{
					name: "quorumResult",
					label: "Quorum result",
					options: [
						{ value: "met", label: "Met" },
						{ value: "not_met", label: "Not met" },
						{ value: "waived", label: "Waived" },
					],
					defaultValue: "met",
					required: true,
				},
				{
					name: "minutesDocumentReference",
					label: "Minutes document reference",
					required: true,
				},
			]),
			highRisk: true,
		});
	}

	commands.push({
		id: "record-resolution",
		title: "Record resolution",
		description: "Create a draft standard or superseding resolution.",
		action: recordResolutionAction,
		hidden: { legalCompanyId },
		fields: [
			{
				name: "mode",
				label: "Record mode",
				options: [
					{ value: "standard", label: "Standard" },
					{ value: "superseding", label: "Superseding" },
				],
				defaultValue: "standard",
				required: true,
			},
			{ name: "governanceMeetingId", label: "Meeting ID" },
			{ name: "resolutionNumber", label: "Resolution number", required: true },
			{
				name: "resolutionYear",
				label: "Resolution year",
				type: "number",
				required: true,
			},
			{ name: "title", label: "Title", required: true },
			{ name: "description", label: "Description", multiline: true },
			{
				name: "supersedesResolutionId",
				label: "Approved resolution superseded",
			},
		],
	});

	if (resolution) {
		commands.push(
			{
				id: "approve-resolution",
				title: "Approve resolution",
				description: "Approve the selected draft resolution with evidence.",
				action: approveResolutionAction,
				hidden: targetHidden(legalCompanyId, resolution),
				fields: lifecycleFields([
					{
						name: "approvedDate",
						label: "Approved date",
						type: "date",
						required: true,
					},
					{
						name: "evidenceReference",
						label: "Approval evidence reference",
						required: true,
					},
				]),
				highRisk: true,
			},
			{
				id: "revoke-resolution",
				title: "Revoke resolution",
				description: "Revoke the selected approved resolution explicitly.",
				action: revokeResolutionAction,
				hidden: targetHidden(legalCompanyId, resolution),
				fields: lifecycleFields([
					{
						name: "revokedDate",
						label: "Revoked date",
						type: "date",
						required: true,
					},
					{ name: "evidenceReference", label: "Revocation evidence" },
				]),
				highRisk: true,
			},
		);
	}

	return (
		<Accordion type="single" collapsible>
			{commands.map((command) => (
				<AccordionItem key={command.id} value={command.id}>
					<AccordionTrigger>{command.title}</AccordionTrigger>
					<AccordionContent>
						<p className="mb-4 text-sm text-muted-foreground">
							{command.description}
						</p>
						<GovernanceCommandForm command={command} />
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

function PremiseCommands({
	legalCompanyId,
	premise,
}: {
	legalCompanyId: string;
	premise?: CorporateRegisterRow;
}) {
	const addressFields: CommandField[] = [
		{
			name: "premiseType",
			label: "Premise type",
			options: [
				{ value: "registered_office", label: "Registered office" },
				{ value: "branch", label: "Branch" },
				{ value: "records_location", label: "Records location" },
				{ value: "other", label: "Other" },
			],
			defaultValue: "registered_office",
			required: true,
		},
		{
			name: "addressKind",
			label: "Address source",
			options: [
				{ value: "manual", label: "Manual statutory snapshot" },
				{ value: "master", label: "Master-data party address" },
			],
			defaultValue: "manual",
			required: true,
		},
		{ name: "partyAddressId", label: "Master-data party address ID" },
		{ name: "addressLine1", label: "Address line 1" },
		{ name: "addressLine2", label: "Address line 2" },
		{ name: "city", label: "City" },
		{ name: "region", label: "Region" },
		{ name: "postalCode", label: "Postal code" },
		{ name: "countryCode", label: "Country code" },
		{
			name: "isPrimary",
			label: "Primary office",
			options: [
				{ value: "false", label: "No" },
				{ value: "true", label: "Yes" },
			],
			defaultValue: "false",
			required: true,
		},
		{
			name: "effectiveFrom",
			label: "Effective from",
			type: "date",
			required: true,
		},
	];
	const commands: CommandDefinition[] = [
		{
			id: "register-premise",
			title: "Register premise",
			description: "Register an effective-dated immutable address snapshot.",
			action: registerCompanyPremiseAction,
			hidden: { legalCompanyId },
			fields: addressFields,
		},
	];
	if (premise) {
		commands.push(
			{
				id: "update-premise",
				title: "Update premise",
				description:
					"Supersede the selected premise from a new effective date.",
				action: updateCompanyPremiseAction,
				hidden: targetHidden(legalCompanyId, premise),
				fields: lifecycleFields(addressFields),
				highRisk: true,
			},
			{
				id: "retire-premise",
				title: "Retire premise",
				description: "End-date the selected premise without deleting history.",
				action: retireCompanyPremiseAction,
				hidden: targetHidden(legalCompanyId, premise),
				fields: lifecycleFields([
					{
						name: "effectiveTo",
						label: "Effective to",
						type: "date",
						required: true,
					},
				]),
				highRisk: true,
			},
		);
	}
	return (
		<Accordion type="single" collapsible>
			{commands.map((command) => (
				<AccordionItem key={command.id} value={command.id}>
					<AccordionTrigger>{command.title}</AccordionTrigger>
					<AccordionContent>
						<p className="mb-4 text-sm text-muted-foreground">
							{command.description}
						</p>
						<GovernanceCommandForm command={command} />
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

export function GovernanceRegisterPanel({
	legalCompanyId,
	snapshot,
	canManage,
	defaultPartyId,
}: {
	legalCompanyId: string;
	snapshot: GovernancePremisesSnapshot;
	canManage: boolean;
	defaultPartyId?: string;
}) {
	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Governance register</CardTitle>
					<CardDescription>
						Effective-dated officers, bodies, memberships, mandates, meetings,
						and resolutions.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-6">
					<RegisterTable
						caption="Officer appointments"
						rows={snapshot.officers}
					/>
					<RegisterTable caption="Governance bodies" rows={snapshot.bodies} />
					<RegisterTable
						caption="Governance memberships"
						rows={snapshot.memberships}
					/>
					<RegisterTable
						caption="Authority mandates"
						rows={snapshot.mandates}
					/>
					<RegisterTable
						caption="Governance meetings"
						rows={snapshot.meetings}
					/>
					<RegisterTable caption="Resolutions" rows={snapshot.resolutions} />
				</CardContent>
			</Card>
			{canManage ? (
				<Card>
					<CardHeader>
						<CardTitle>Governance controls</CardTitle>
						<CardDescription>
							Every mutation is permission checked, tenant stamped, versioned,
							and idempotent.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<GovernanceCommands
							legalCompanyId={legalCompanyId}
							snapshot={snapshot}
							defaultPartyId={defaultPartyId}
						/>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

export function PremisesRegisterPanel({
	legalCompanyId,
	snapshot,
	canManage,
}: {
	legalCompanyId: string;
	snapshot: GovernancePremisesSnapshot;
	canManage: boolean;
}) {
	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Premises register</CardTitle>
					<CardDescription>
						Registered offices, branches, and statutory records locations with
						immutable address snapshots.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<RegisterTable
						caption="Effective and historical company premises"
						rows={snapshot.premises}
					/>
				</CardContent>
			</Card>
			{canManage ? (
				<Card>
					<CardHeader>
						<CardTitle>Premises controls</CardTitle>
						<CardDescription>
							Register, supersede, or retire premises without deleting history.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<PremiseCommands
							legalCompanyId={legalCompanyId}
							premise={snapshot.premises[0]}
						/>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
