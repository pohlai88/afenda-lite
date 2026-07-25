"use client";

import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import { useActionState, useId } from "react";

import {
	amendChargeAction,
	cancelInsurancePolicyAction,
	disposeCorporateAssetAction,
	disposeIntellectualPropertyAction,
	disposePropertyAction,
	expireIntellectualPropertyAction,
	type PropertyAssetsMutationActionState,
	registerChargeAction,
	registerCorporateAssetAction,
	registerInsurancePolicyAction,
	registerIntellectualPropertyAction,
	registerPropertyAction,
	releaseChargeAction,
	renewInsurancePolicyAction,
	renewIntellectualPropertyAction,
	updateCorporateAssetAction,
	updateInsurancePolicyAction,
	updateIntellectualPropertyAction,
	updatePropertyAction,
	writeOffCorporateAssetAction,
} from "@/app/actions/corporate-administration-property-assets";

export type PropertyAssetsRegisterRow = {
	id: string;
	label: string;
	summary: string;
	status: string;
	version: number;
};

type MutationAction = (
	previousState: PropertyAssetsMutationActionState,
	formData: FormData,
) => Promise<PropertyAssetsMutationActionState>;

type Field = {
	name: string;
	label: string;
	type?: "text" | "date" | "number";
	required?: boolean;
	defaultValue?: string;
};

type Command = {
	label: string;
	description: string;
	action: MutationAction;
	fields: Field[];
	highRisk?: boolean;
};

function CommandForm({
	legalCompanyId,
	command,
}: {
	legalCompanyId: string;
	command: Command;
}) {
	const [state, action, pending] = useActionState(command.action, null);
	const requestId = useId();
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					{command.label}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{command.label}</DialogTitle>
					<DialogDescription>{command.description}</DialogDescription>
				</DialogHeader>
				<form action={action} className="space-y-4">
					<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
					<input type="hidden" name="requestId" value={requestId} />
					{command.fields.map((field) => {
						const id = `${requestId}-${field.name}`;
						return (
							<div className="space-y-2" key={field.name}>
								<Label htmlFor={id}>{field.label}</Label>
								<Input
									id={id}
									name={field.name}
									type={field.type ?? "text"}
									required={field.required}
									defaultValue={field.defaultValue}
								/>
							</div>
						);
					})}
					{command.highRisk ? (
						<div className="flex items-start gap-2">
							<input
								id={`${requestId}-confirm`}
								name="confirm"
								type="checkbox"
								value="true"
								required
								className="mt-1"
							/>
							<Label htmlFor={`${requestId}-confirm`}>
								I confirm this statutory lifecycle change and its evidence.
							</Label>
						</div>
					) : null}
					<div aria-live="polite" className="text-sm">
						{pending
							? "Saving statutory record…"
							: state?.ok
								? "Record saved."
								: state?.message}
					</div>
					<Button type="submit" disabled={pending}>
						{pending ? "Saving…" : command.label}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function RegisterPanel({
	title,
	description,
	caption,
	rows,
	legalCompanyId,
	commands,
	canManage,
}: {
	title: string;
	description: string;
	caption: string;
	rows: PropertyAssetsRegisterRow[];
	legalCompanyId: string;
	commands: Command[];
	canManage: boolean;
}) {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableCaption>{caption}</TableCaption>
						<TableHeader>
							<TableRow>
								<TableHead>Record</TableHead>
								<TableHead>Summary</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Version</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4}>No statutory records found.</TableCell>
								</TableRow>
							) : (
								rows.map((row) => (
									<TableRow key={row.id}>
										<TableCell>{row.label}</TableCell>
										<TableCell>{row.summary}</TableCell>
										<TableCell>{row.status}</TableCell>
										<TableCell>{row.version}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			{canManage ? (
				<Card>
					<CardHeader>
						<CardTitle>{title} controls</CardTitle>
						<CardDescription>
							Commands use optimistic concurrency and durable request identity.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						{commands.map((command) => (
							<CommandForm
								key={command.label}
								legalCompanyId={legalCompanyId}
								command={command}
							/>
						))}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

const text = (
	name: string,
	label: string,
	required = false,
	defaultValue?: string,
): Field => ({ name, label, required, defaultValue });
const date = (name: string, label: string, required = true): Field => ({
	name,
	label,
	type: "date",
	required,
});
const existing = (row?: PropertyAssetsRegisterRow): Field[] => [
	text("id", "Record ID", true, row?.id),
	{
		name: "expectedVersion",
		label: "Expected version",
		type: "number",
		required: true,
		defaultValue: row ? String(row.version) : undefined,
	},
];
const terminal = (row?: PropertyAssetsRegisterRow): Field[] => [
	...existing(row),
	date("effectiveDate", "Effective date"),
	text("reason", "Reason", true),
	text("evidenceReference", "Evidence reference", true),
];

export function PropertyRegisterPanel({
	legalCompanyId,
	rows,
	canManage,
}: {
	legalCompanyId: string;
	rows: PropertyAssetsRegisterRow[];
	canManage: boolean;
}) {
	const row = rows.find((item) => item.status === "active");
	const commands: Command[] = [
		{
			label: "Register property",
			description: "Register a legal real-property holding.",
			action: registerPropertyAction,
			fields: [
				text("code", "Property code", true),
				text("propertyType", "Property type", true),
				text("titleReference", "Title reference", true),
				text("propertyDescription", "Description", true),
				text("ownershipPercentage", "Ownership percentage", true),
				date("acquisitionDate", "Acquisition date"),
				text("tenureType", "Tenure type"),
				text("valuationReference", "Valuation reference"),
			],
		},
		{
			label: "Update property",
			description: "Correct mutable property details using CAS.",
			action: updatePropertyAction,
			fields: [
				...existing(row),
				text("propertyDescription", "Description"),
				text("ownershipPercentage", "Ownership percentage"),
				text("tenureType", "Tenure type"),
				text("valuationReference", "Valuation reference"),
			],
		},
		{
			label: "Dispose property",
			description: "Terminate an active property holding.",
			action: disposePropertyAction,
			fields: terminal(row),
			highRisk: true,
		},
	];
	return (
		<RegisterPanel
			title="Property register"
			description="Current and historical real-property title and tenure facts."
			caption="Property holdings"
			rows={rows}
			legalCompanyId={legalCompanyId}
			commands={commands}
			canManage={canManage}
		/>
	);
}

export function CorporateAssetRegisterPanel({
	legalCompanyId,
	rows,
	canManage,
}: {
	legalCompanyId: string;
	rows: PropertyAssetsRegisterRow[];
	canManage: boolean;
}) {
	const row = rows.find((item) => item.status === "active");
	const commands: Command[] = [
		{
			label: "Register asset",
			description: "Register a non-stock legal or administrative asset.",
			action: registerCorporateAssetAction,
			fields: [
				text("code", "Asset code", true),
				text("assetCategory", "Category", true),
				text("identifier", "Stable identifier"),
				text("description", "Description", true),
				text("custodianPartyId", "Custodian party ID"),
				date("acquisitionDate", "Acquisition date"),
			],
		},
		{
			label: "Update asset",
			description: "Correct mutable asset details using CAS.",
			action: updateCorporateAssetAction,
			fields: [
				...existing(row),
				text("description", "Description"),
				text("custodianPartyId", "Custodian party ID"),
			],
		},
		{
			label: "Dispose asset",
			description: "Dispose an active corporate asset.",
			action: disposeCorporateAssetAction,
			fields: terminal(row),
			highRisk: true,
		},
		{
			label: "Write off asset",
			description: "Write off an active corporate asset.",
			action: writeOffCorporateAssetAction,
			fields: terminal(row),
			highRisk: true,
		},
	];
	return (
		<RegisterPanel
			title="Corporate asset register"
			description="Administrative assets without inventory or depreciation facts."
			caption="Corporate assets"
			rows={rows}
			legalCompanyId={legalCompanyId}
			commands={commands}
			canManage={canManage}
		/>
	);
}

export function IntellectualPropertyRegisterPanel({
	legalCompanyId,
	rows,
	canManage,
	defaultPartyId,
}: {
	legalCompanyId: string;
	rows: PropertyAssetsRegisterRow[];
	canManage: boolean;
	defaultPartyId?: string;
}) {
	const row = rows.find(
		(item) => item.status === "active" || item.status === "pending",
	);
	const commands: Command[] = [
		{
			label: "Register IP",
			description:
				"Register an application or granted intellectual-property right.",
			action: registerIntellectualPropertyAction,
			fields: [
				text("code", "IP code", true),
				text("rightType", "Right type", true),
				text("jurisdictionCode", "Jurisdiction code", true),
				text("applicationNumber", "Application number"),
				text("registrationNumber", "Registration number"),
				text("ownerPartyId", "Owner party ID", true, defaultPartyId),
				date("filingDate", "Filing date", false),
				date("grantDate", "Grant date", false),
				date("expiryDate", "Expiry date", false),
			],
		},
		{
			label: "Update IP",
			description: "Correct mutable IP ownership and date facts.",
			action: updateIntellectualPropertyAction,
			fields: [
				...existing(row),
				text("ownerPartyId", "Owner party ID"),
				date("grantDate", "Grant date", false),
				date("expiryDate", "Expiry date", false),
			],
		},
		{
			label: "Renew IP",
			description: "Append an immutable renewal fact and extend expiry.",
			action: renewIntellectualPropertyAction,
			fields: [
				...existing(row),
				date("renewalDate", "Renewal date"),
				date("newExpiryDate", "New expiry date"),
				text("evidenceReference", "Evidence reference", true),
			],
		},
		{
			label: "Expire IP",
			description: "Mark an IP right expired.",
			action: expireIntellectualPropertyAction,
			fields: terminal(row),
			highRisk: true,
		},
		{
			label: "Dispose IP",
			description: "Record disposal or assignment of an IP right.",
			action: disposeIntellectualPropertyAction,
			fields: terminal(row),
			highRisk: true,
		},
	];
	return (
		<RegisterPanel
			title="Intellectual property register"
			description="Applications, registrations, renewals, expiry, and disposals."
			caption="Intellectual-property rights"
			rows={rows}
			legalCompanyId={legalCompanyId}
			commands={commands}
			canManage={canManage}
		/>
	);
}

export function InsuranceChargesRegisterPanel({
	legalCompanyId,
	insuranceRows,
	chargeRows,
	canManage,
	defaultPartyId,
}: {
	legalCompanyId: string;
	insuranceRows: PropertyAssetsRegisterRow[];
	chargeRows: PropertyAssetsRegisterRow[];
	canManage: boolean;
	defaultPartyId?: string;
}) {
	const policy = insuranceRows.find((item) => item.status === "active");
	const charge = chargeRows.find((item) => item.status === "active");
	const policyCommands: Command[] = [
		{
			label: "Register policy",
			description: "Register corporate insurance and its covered subject.",
			action: registerInsurancePolicyAction,
			fields: [
				text("policyNumber", "Policy number", true),
				text("insurerPartyId", "Insurer party ID", true, defaultPartyId),
				text("subjectKind", "Subject kind", true, "company"),
				text("subjectId", "Typed subject ID"),
				text("subjectDescription", "Other subject description"),
				date("effectiveFrom", "Effective from"),
				date("effectiveTo", "Effective to", false),
				text("limitAmount", "Limit amount"),
				text("currencyCode", "Currency code"),
				text("documentReference", "Policy document reference", true),
			],
		},
		{
			label: "Update policy",
			description: "Correct mutable insurance facts.",
			action: updateInsurancePolicyAction,
			fields: [
				...existing(policy),
				text("limitAmount", "Limit amount"),
				text("currencyCode", "Currency code"),
				text("documentReference", "Policy document reference"),
			],
		},
		{
			label: "Renew policy",
			description: "Append a renewal fact and extend coverage.",
			action: renewInsurancePolicyAction,
			fields: [
				...existing(policy),
				date("renewalDate", "Renewal date"),
				date("newEffectiveTo", "New effective-to date"),
				text("limitAmount", "Limit amount"),
				text("currencyCode", "Currency code"),
				text("documentReference", "Policy document reference", true),
				text("evidenceReference", "Renewal evidence reference", true),
			],
		},
		{
			label: "Cancel policy",
			description: "Cancel an active policy with reason and evidence.",
			action: cancelInsurancePolicyAction,
			fields: [
				...existing(policy),
				date("cancellationDate", "Cancellation date"),
				text("reason", "Reason", true),
				text("evidenceReference", "Evidence reference", true),
			],
			highRisk: true,
		},
	];
	const chargeCommands: Command[] = [
		{
			label: "Register charge",
			description: "Register a charge or security interest.",
			action: registerChargeAction,
			fields: [
				text("code", "Charge code", true),
				text("chargeType", "Charge type", true),
				text("securedPartyId", "Secured party ID", true, defaultPartyId),
				text("subjectKind", "Subject kind", true, "company"),
				text("subjectId", "Typed subject ID"),
				text("subjectDescription", "Other subject description"),
				text("amount", "Secured amount"),
				text("currencyCode", "Currency code"),
				{
					name: "priorityRank",
					label: "Priority",
					type: "number",
					required: true,
					defaultValue: "1",
				},
				date("createdDate", "Created date"),
				text("evidenceReference", "Creation evidence reference", true),
			],
		},
		{
			label: "Amend charge",
			description: "Append an immutable variation fact.",
			action: amendChargeAction,
			fields: [
				...existing(charge),
				date("variationDate", "Variation date"),
				text("amount", "Secured amount"),
				text("currencyCode", "Currency code"),
				{ name: "priorityRank", label: "Priority", type: "number" },
				text("evidenceReference", "Variation evidence reference", true),
			],
		},
		{
			label: "Release charge",
			description: "Release an active charge while retaining history.",
			action: releaseChargeAction,
			fields: [
				...existing(charge),
				date("releasedDate", "Release date"),
				text("reason", "Reason", true),
				text("evidenceReference", "Release evidence reference", true),
			],
			highRisk: true,
		},
	];
	return (
		<div className="space-y-6">
			<RegisterPanel
				title="Insurance register"
				description="Corporate policies and append-only renewal history."
				caption="Insurance policies"
				rows={insuranceRows}
				legalCompanyId={legalCompanyId}
				commands={policyCommands}
				canManage={canManage}
			/>
			<RegisterPanel
				title="Charges register"
				description="Security interests, variations, and historical releases."
				caption="Charges and encumbrances"
				rows={chargeRows}
				legalCompanyId={legalCompanyId}
				commands={chargeCommands}
				canManage={canManage}
			/>
		</div>
	);
}
