"use client";

import type { Result as ActionResult } from "@afenda/errors";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Label,
	NativeSelect,
	NativeSelectOption,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TextField,
} from "@afenda/ui-system";
import type * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
	addCompanyNameFormAction,
	endCompanyActivityFormAction,
	registerCompanyActivityFormAction,
	registerCompanyIdentifierFormAction,
	setCompanyFinancialYearFormAction,
	setCompanyLegalFormFormAction,
	supersedeCompanyIdentifierFormAction,
	supersedeCompanyLegalFormFormAction,
	supersedeCompanyNameFormAction,
} from "@/app/actions/legal-company-identity-actions";

import { ActionFeedback } from "./legal-company-workspace";

type CompanyNameActionState = ActionResult<{
	companyNameId: string;
	version: number;
}> | null;
type LegalFormActionState = ActionResult<{
	legalFormHistoryId: string;
	version: number;
}> | null;
type IdentifierActionState = ActionResult<{
	companyIdentifierId: string;
	version: number;
}> | null;
type FinancialYearActionState = ActionResult<{
	companyFinancialYearId: string;
	version: number;
}> | null;
type ActivityActionState = ActionResult<{
	companyActivityId: string;
	version: number;
}> | null;

export type LegalCompanyIdentityCompany = Readonly<{
	legalCompanyId: string;
	companyCode: string;
	displayName: string;
	version: number;
}>;

export type LegalCompanyIdentityName = Readonly<{
	companyNameId: string;
	nameType: "legal" | "former" | "translated" | "trading";
	languageCode: string;
	displayName: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "superseded" | "retired";
	version: number | null;
}>;

export type LegalCompanyIdentityLegalForm = Readonly<{
	legalFormHistoryId: string;
	jurisdictionCode: string;
	entityTypeCode: string;
	legalFormCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "superseded";
	version: number;
}>;

export type LegalCompanyIdentityIdentifier = Readonly<{
	companyIdentifierId: string;
	identifierType: string;
	jurisdictionCode: string;
	issuingAuthorityCode: string;
	displayValue: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "superseded" | "retired";
	version: number | null;
}>;

export type LegalCompanyIdentityFinancialYear = Readonly<{
	companyFinancialYearId: string;
	fiscalYearStartMonth: number;
	fiscalYearStartDay: number;
	reportingCurrencyCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "superseded";
	version: number;
}>;

export type LegalCompanyIdentityActivity = Readonly<{
	companyActivityId: string;
	activityCode: string;
	classification: "registered_object" | "regulated" | "operational";
	jurisdictionCode: string;
	regulatorCode: string | null;
	description: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "ended";
	version: number;
}>;

export type LegalCompanyIdentityWorkspaceProps = Readonly<{
	canWrite: boolean;
	organizationSlug: string;
	company: LegalCompanyIdentityCompany;
	names: readonly LegalCompanyIdentityName[];
	legalForms: readonly LegalCompanyIdentityLegalForm[];
	identifiers: readonly LegalCompanyIdentityIdentifier[];
	financialYears: readonly LegalCompanyIdentityFinancialYear[];
	activities: readonly LegalCompanyIdentityActivity[];
}>;

type VersionedIdentityRow<T extends Readonly<{ version: number | null }>> = T &
	Readonly<{ version: number }>;

function hasVersion<T extends Readonly<{ version: number | null }>>(
	row: T,
): row is VersionedIdentityRow<T> {
	return row.version !== null;
}

export function LegalCompanyIdentityWorkspace({
	canWrite,
	organizationSlug,
	company,
	names,
	legalForms,
	identifiers,
	financialYears,
	activities,
}: LegalCompanyIdentityWorkspaceProps) {
	const [addNameState, addNameAction] = useActionState<
		CompanyNameActionState,
		FormData
	>(addCompanyNameFormAction, null);
	const [supersedeNameState, supersedeNameAction] = useActionState<
		CompanyNameActionState,
		FormData
	>(supersedeCompanyNameFormAction, null);
	const [setLegalFormState, setLegalFormAction] = useActionState<
		LegalFormActionState,
		FormData
	>(setCompanyLegalFormFormAction, null);
	const [supersedeLegalFormState, supersedeLegalFormAction] = useActionState<
		LegalFormActionState,
		FormData
	>(supersedeCompanyLegalFormFormAction, null);
	const [identifierState, identifierAction] = useActionState<
		IdentifierActionState,
		FormData
	>(registerCompanyIdentifierFormAction, null);
	const [supersedeIdentifierState, supersedeIdentifierAction] = useActionState<
		IdentifierActionState,
		FormData
	>(supersedeCompanyIdentifierFormAction, null);
	const [financialYearState, financialYearAction] = useActionState<
		FinancialYearActionState,
		FormData
	>(setCompanyFinancialYearFormAction, null);
	const [activityState, activityAction] = useActionState<
		ActivityActionState,
		FormData
	>(registerCompanyActivityFormAction, null);
	const [endActivityState, endActivityAction] = useActionState<
		ActivityActionState,
		FormData
	>(endCompanyActivityFormAction, null);

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<CompanyNameSection
					action={addNameAction}
					canWrite={canWrite}
					company={company}
					names={names}
					organizationSlug={organizationSlug}
					state={addNameState}
					supersedeAction={supersedeNameAction}
					supersedeState={supersedeNameState}
				/>
				<LegalFormSection
					action={setLegalFormAction}
					canWrite={canWrite}
					company={company}
					legalForms={legalForms}
					organizationSlug={organizationSlug}
					state={setLegalFormState}
					supersedeAction={supersedeLegalFormAction}
					supersedeState={supersedeLegalFormState}
				/>
			</div>
			<div className="grid gap-6 xl:grid-cols-3">
				<IdentifiersSection
					action={identifierAction}
					canWrite={canWrite}
					company={company}
					identifiers={identifiers}
					organizationSlug={organizationSlug}
					state={identifierState}
					supersedeAction={supersedeIdentifierAction}
					supersedeState={supersedeIdentifierState}
				/>
				<FinancialYearSection
					action={financialYearAction}
					canWrite={canWrite}
					company={company}
					financialYears={financialYears}
					organizationSlug={organizationSlug}
					state={financialYearState}
				/>
				<ActivitiesSection
					action={activityAction}
					activities={activities}
					canWrite={canWrite}
					company={company}
					endAction={endActivityAction}
					endState={endActivityState}
					organizationSlug={organizationSlug}
					state={activityState}
				/>
			</div>
		</div>
	);
}

export function CompanyNameSection({
	action,
	canWrite,
	company,
	names,
	organizationSlug,
	state,
	supersedeAction,
	supersedeState,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	names: readonly LegalCompanyIdentityName[];
	organizationSlug: string;
	state: CompanyNameActionState;
	supersedeAction: (payload: FormData) => void;
	supersedeState: CompanyNameActionState;
}>) {
	const activeLegalName = names.find(
		(name): name is VersionedIdentityRow<LegalCompanyIdentityName> =>
			name.nameType === "legal" && name.status === "active" && hasVersion(name),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Company names</CardTitle>
				<CardDescription>
					Multilingual statutory, translated, trading and former names.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<CompanyNameForm
					action={action}
					canWrite={canWrite}
					company={company}
					organizationSlug={organizationSlug}
					state={state}
				/>
				<CompanyNameHistory names={names} />
				{activeLegalName ? (
					<CompanyNameSupersessionForm
						action={supersedeAction}
						canWrite={canWrite}
						company={company}
						name={activeLegalName}
						organizationSlug={organizationSlug}
						state={supersedeState}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}

export function CompanyNameForm({
	action,
	canWrite,
	company,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	state: CompanyNameActionState;
}>) {
	return (
		<form action={action} aria-label="Add company name" className="space-y-4">
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
					versionFieldName="expectedCompanyVersion"
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="companyNameType">Name type</Label>
						<NativeSelect id="companyNameType" name="nameType" required>
							<NativeSelectOption value="legal">Legal</NativeSelectOption>
							<NativeSelectOption value="translated">
								Translated
							</NativeSelectOption>
							<NativeSelectOption value="trading">Trading</NativeSelectOption>
							<NativeSelectOption value="former">Former</NativeSelectOption>
						</NativeSelect>
					</div>
					<TextField
						id="companyNameLanguage"
						label="Language"
						maxLength={8}
						name="languageCode"
						required
					/>
				</div>
				<TextField
					id="companyNameDisplay"
					label="Display name"
					maxLength={256}
					name="displayName"
					required
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="companyNameEffectiveFrom"
						label="Effective from"
						name="effectiveFrom"
						required
						type="date"
					/>
					<TextField
						id="companyNameEffectiveTo"
						label="Effective to"
						name="effectiveTo"
						type="date"
					/>
				</div>
				<TextField
					id="companyNameSourceDocument"
					label="Source document"
					maxLength={256}
					name="sourceDocumentId"
				/>
				<SubmitButton>Add name</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Company name added." />
		</form>
	);
}

export function CompanyNameHistory({
	names,
}: Readonly<{ names: readonly LegalCompanyIdentityName[] }>) {
	if (names.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No statutory name history has been recorded.
			</p>
		);
	}
	return (
		<Table aria-label="Company name history">
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Scope</TableHead>
					<TableHead>Effective period</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{names.map((name) => (
					<TableRow key={name.companyNameId}>
						<TableCell>{name.displayName}</TableCell>
						<TableCell>
							{name.nameType} / {name.languageCode}
						</TableCell>
						<TableCell>
							{name.effectiveFrom} to {name.effectiveTo ?? "open"}
						</TableCell>
						<TableCell>{name.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function CompanyNameSupersessionForm({
	action,
	canWrite,
	company,
	name,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	name: LegalCompanyIdentityName & Readonly<{ version: number }>;
	organizationSlug: string;
	state: CompanyNameActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="Supersede legal company name"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
				/>
				<input name="companyNameId" type="hidden" value={name.companyNameId} />
				<input name="expectedNameVersion" type="hidden" value={name.version} />
				<input name="replacement.nameType" type="hidden" value="legal" />
				<input
					name="replacement.languageCode"
					type="hidden"
					value={name.languageCode}
				/>
				<TextField
					id="replacementCompanyName"
					label="Replacement legal name"
					maxLength={256}
					name="replacement.displayName"
					required
				/>
				<TextField
					id="replacementNameEffectiveFrom"
					label="Effective from"
					name="replacement.effectiveFrom"
					required
					type="date"
				/>
				<TextField
					id="replacementNameSource"
					label="Source document"
					name="replacement.sourceDocumentId"
					required
				/>
				<TextField
					id="replacementNameReason"
					label="Correction reason"
					name="replacement.correctionReason"
					required
				/>
				<SubmitButton>Supersede legal name</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Company name superseded." />
		</form>
	);
}

export function LegalFormSection({
	action,
	canWrite,
	company,
	legalForms,
	organizationSlug,
	state,
	supersedeAction,
	supersedeState,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	legalForms: readonly LegalCompanyIdentityLegalForm[];
	organizationSlug: string;
	state: LegalFormActionState;
	supersedeAction: (payload: FormData) => void;
	supersedeState: LegalFormActionState;
}>) {
	const activeLegalForm = legalForms.find((form) => form.status === "active");
	return (
		<Card>
			<CardHeader>
				<CardTitle>Legal form</CardTitle>
				<CardDescription>
					Effective-dated legal form history by jurisdiction.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<LegalFormForm
					action={action}
					canWrite={canWrite}
					company={company}
					organizationSlug={organizationSlug}
					state={state}
				/>
				<LegalFormHistory legalForms={legalForms} />
				{activeLegalForm ? (
					<LegalFormSupersessionForm
						action={supersedeAction}
						canWrite={canWrite}
						company={company}
						legalForm={activeLegalForm}
						organizationSlug={organizationSlug}
						state={supersedeState}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}

export function LegalFormForm({
	action,
	canWrite,
	company,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	state: LegalFormActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="Set company legal form"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
					versionFieldName="expectedCompanyVersion"
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="legalFormJurisdiction"
						label="Jurisdiction"
						maxLength={2}
						name="jurisdictionCode"
						required
					/>
					<TextField
						id="legalFormEntityType"
						label="Entity type"
						name="entityTypeCode"
						required
					/>
				</div>
				<TextField
					id="legalFormCode"
					label="Legal form"
					name="legalFormCode"
					required
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="legalFormEffectiveFrom"
						label="Effective from"
						name="effectiveFrom"
						required
						type="date"
					/>
					<TextField
						id="legalFormEffectiveTo"
						label="Effective to"
						name="effectiveTo"
						type="date"
					/>
				</div>
				<TextField
					id="legalFormSource"
					label="Source document"
					name="sourceDocumentId"
					required
				/>
				<SubmitButton>Set legal form</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Legal form changed." />
		</form>
	);
}

export function LegalFormHistory({
	legalForms,
}: Readonly<{ legalForms: readonly LegalCompanyIdentityLegalForm[] }>) {
	if (legalForms.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No legal form history has been recorded.
			</p>
		);
	}
	return (
		<Table aria-label="Company legal form history">
			<TableHeader>
				<TableRow>
					<TableHead>Legal form</TableHead>
					<TableHead>Jurisdiction</TableHead>
					<TableHead>Effective period</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{legalForms.map((legalForm) => (
					<TableRow key={legalForm.legalFormHistoryId}>
						<TableCell>{legalForm.legalFormCode}</TableCell>
						<TableCell>
							{legalForm.jurisdictionCode} / {legalForm.entityTypeCode}
						</TableCell>
						<TableCell>
							{legalForm.effectiveFrom} to {legalForm.effectiveTo ?? "open"}
						</TableCell>
						<TableCell>{legalForm.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function LegalFormSupersessionForm({
	action,
	canWrite,
	company,
	legalForm,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	legalForm: LegalCompanyIdentityLegalForm;
	organizationSlug: string;
	state: LegalFormActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="Supersede legal form"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
				/>
				<input
					name="companyLegalFormHistoryId"
					type="hidden"
					value={legalForm.legalFormHistoryId}
				/>
				<input
					name="expectedLegalFormVersion"
					type="hidden"
					value={legalForm.version}
				/>
				<TextField
					id="replacementLegalFormCode"
					label="Replacement legal form"
					name="replacement.legalFormCode"
					required
				/>
				<TextField
					id="replacementLegalFormJurisdiction"
					label="Jurisdiction"
					maxLength={2}
					name="replacement.jurisdictionCode"
					required
				/>
				<TextField
					id="replacementLegalFormEntityType"
					label="Entity type"
					name="replacement.entityTypeCode"
					required
				/>
				<TextField
					id="replacementLegalFormEffectiveFrom"
					label="Effective from"
					name="replacement.effectiveFrom"
					required
					type="date"
				/>
				<TextField
					id="replacementLegalFormSource"
					label="Source document"
					name="replacement.sourceDocumentId"
					required
				/>
				<TextField
					id="replacementLegalFormReason"
					label="Correction reason"
					name="replacement.correctionReason"
					required
				/>
				<SubmitButton>Supersede legal form</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Legal form superseded." />
		</form>
	);
}

function IdentifiersSection({
	action,
	canWrite,
	company,
	identifiers,
	organizationSlug,
	state,
	supersedeAction,
	supersedeState,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	identifiers: readonly LegalCompanyIdentityIdentifier[];
	organizationSlug: string;
	state: IdentifierActionState;
	supersedeAction: (payload: FormData) => void;
	supersedeState: IdentifierActionState;
}>) {
	const activeIdentifier = identifiers.find(
		(
			identifier,
		): identifier is VersionedIdentityRow<LegalCompanyIdentityIdentifier> =>
			identifier.status === "active" && hasVersion(identifier),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Identifiers</CardTitle>
				<CardDescription>
					Non-tax company identifiers by authority and jurisdiction.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<IdentifierForm
					action={action}
					canWrite={canWrite}
					company={company}
					organizationSlug={organizationSlug}
					state={state}
				/>
				<IdentifierHistory identifiers={identifiers} />
				{activeIdentifier ? (
					<IdentifierSupersessionForm
						action={supersedeAction}
						canWrite={canWrite}
						company={company}
						identifier={activeIdentifier}
						organizationSlug={organizationSlug}
						state={supersedeState}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}

export function IdentifierForm({
	action,
	canWrite,
	company,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	state: IdentifierActionState;
}>) {
	return (
		<form
			action={action}
			aria-describedby="identifierTaxBoundary"
			aria-label="Register company identifier"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
					versionFieldName="expectedCompanyVersion"
				/>
				<p className="text-muted-foreground text-sm" id="identifierTaxBoundary">
					Tax, VAT and GST registrations are owned by Master Data and are
					rejected here.
				</p>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="companyIdentifierType">Identifier type</Label>
						<NativeSelect
							id="companyIdentifierType"
							name="identifierType"
							required
						>
							<NativeSelectOption value="company_registration">
								Company registration
							</NativeSelectOption>
							<NativeSelectOption value="registry_number">
								Registry number
							</NativeSelectOption>
							<NativeSelectOption value="legal_entity_identifier">
								Legal entity identifier
							</NativeSelectOption>
							<NativeSelectOption value="other_non_tax_identifier">
								Other non-tax identifier
							</NativeSelectOption>
						</NativeSelect>
					</div>
					<TextField
						id="identifierJurisdiction"
						label="Jurisdiction"
						maxLength={2}
						name="jurisdictionCode"
						required
					/>
				</div>
				<TextField
					id="identifierAuthority"
					label="Issuing authority"
					name="issuingAuthorityCode"
					required
				/>
				<TextField
					id="identifierValue"
					label="Identifier value"
					maxLength={128}
					name="identifierValue"
					required
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="identifierEffectiveFrom"
						label="Effective from"
						name="effectiveFrom"
						required
						type="date"
					/>
					<TextField
						id="identifierEffectiveTo"
						label="Effective to"
						name="effectiveTo"
						type="date"
					/>
				</div>
				<TextField
					id="identifierSourceDocument"
					label="Source document"
					name="sourceDocumentId"
					required
				/>
				<SubmitButton>Register identifier</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Identifier registered." />
		</form>
	);
}

export function IdentifierHistory({
	identifiers,
}: Readonly<{ identifiers: readonly LegalCompanyIdentityIdentifier[] }>) {
	if (identifiers.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No company identifiers have been recorded.
			</p>
		);
	}
	return (
		<Table aria-label="Company identifier history">
			<TableHeader>
				<TableRow>
					<TableHead>Identifier</TableHead>
					<TableHead>Authority</TableHead>
					<TableHead>Effective period</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{identifiers.map((identifier) => (
					<TableRow key={identifier.companyIdentifierId}>
						<TableCell>{identifier.displayValue}</TableCell>
						<TableCell>
							{identifier.jurisdictionCode} / {identifier.issuingAuthorityCode}
						</TableCell>
						<TableCell>
							{identifier.effectiveFrom} to {identifier.effectiveTo ?? "open"}
						</TableCell>
						<TableCell>{identifier.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function IdentifierSupersessionForm({
	action,
	canWrite,
	company,
	identifier,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	identifier: LegalCompanyIdentityIdentifier & Readonly<{ version: number }>;
	organizationSlug: string;
	state: IdentifierActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="Supersede company identifier"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
				/>
				<input
					name="companyIdentifierId"
					type="hidden"
					value={identifier.companyIdentifierId}
				/>
				<input
					name="expectedIdentifierVersion"
					type="hidden"
					value={identifier.version}
				/>
				<input
					name="replacement.identifierType"
					type="hidden"
					value={identifier.identifierType}
				/>
				<input
					name="replacement.jurisdictionCode"
					type="hidden"
					value={identifier.jurisdictionCode}
				/>
				<input
					name="replacement.issuingAuthorityCode"
					type="hidden"
					value={identifier.issuingAuthorityCode}
				/>
				<TextField
					id="replacementIdentifierValue"
					label="Replacement identifier value"
					name="replacement.identifierValue"
					required
				/>
				<TextField
					id="replacementIdentifierEffectiveFrom"
					label="Effective from"
					name="replacement.effectiveFrom"
					required
					type="date"
				/>
				<TextField
					id="replacementIdentifierSource"
					label="Source document"
					name="replacement.sourceDocumentId"
					required
				/>
				<TextField
					id="replacementIdentifierReason"
					label="Correction reason"
					name="replacement.correctionReason"
					required
				/>
				<SubmitButton>Supersede identifier</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Identifier superseded." />
		</form>
	);
}

function FinancialYearSection({
	action,
	canWrite,
	company,
	financialYears,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	financialYears: readonly LegalCompanyIdentityFinancialYear[];
	organizationSlug: string;
	state: FinancialYearActionState;
}>) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Financial year</CardTitle>
				<CardDescription>
					Statutory financial-year definition history.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<FinancialYearForm
					action={action}
					canWrite={canWrite}
					company={company}
					organizationSlug={organizationSlug}
					state={state}
				/>
				{financialYears.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No financial-year history has been recorded.
					</p>
				) : (
					<Table aria-label="Company financial-year history">
						<TableHeader>
							<TableRow>
								<TableHead>Year start</TableHead>
								<TableHead>Currency</TableHead>
								<TableHead>Effective period</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{financialYears.map((financialYear) => (
								<TableRow key={financialYear.companyFinancialYearId}>
									<TableCell>
										{financialYear.fiscalYearStartMonth}/
										{financialYear.fiscalYearStartDay}
									</TableCell>
									<TableCell>{financialYear.reportingCurrencyCode}</TableCell>
									<TableCell>
										{financialYear.effectiveFrom} to{" "}
										{financialYear.effectiveTo ?? "open"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

export function FinancialYearForm({
	action,
	canWrite,
	company,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	state: FinancialYearActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="Set company financial year"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
					versionFieldName="expectedCompanyVersion"
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="financialYearStartMonth"
						label="Start month"
						max={12}
						min={1}
						name="fiscalYearStartMonth"
						required
						type="number"
					/>
					<TextField
						id="financialYearStartDay"
						label="Start day"
						max={31}
						min={1}
						name="fiscalYearStartDay"
						required
						type="number"
					/>
				</div>
				<TextField
					id="financialYearCurrency"
					label="Reporting currency"
					maxLength={3}
					name="reportingCurrencyCode"
					required
				/>
				<TextField
					id="financialYearEffectiveFrom"
					label="Effective from"
					name="effectiveFrom"
					required
					type="date"
				/>
				<TextField
					id="financialYearSource"
					label="Source document"
					name="sourceDocumentId"
					required
				/>
				<SubmitButton>Set financial year</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Financial year recorded." />
		</form>
	);
}

function ActivitiesSection({
	action,
	canWrite,
	activities,
	company,
	endAction,
	endState,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	activities: readonly LegalCompanyIdentityActivity[];
	company: LegalCompanyIdentityCompany;
	endAction: (payload: FormData) => void;
	endState: ActivityActionState;
	organizationSlug: string;
	state: ActivityActionState;
}>) {
	const activeActivity = activities.find(
		(activity) => activity.status === "active",
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Activities</CardTitle>
				<CardDescription>
					Registered, regulated and operational classifications.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<ActivityForm
					action={action}
					canWrite={canWrite}
					company={company}
					organizationSlug={organizationSlug}
					state={state}
				/>
				<ActivityHistory activities={activities} />
				{activeActivity ? (
					<EndActivityForm
						action={endAction}
						activity={activeActivity}
						canWrite={canWrite}
						company={company}
						organizationSlug={organizationSlug}
						state={endState}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}

export function ActivityForm({
	action,
	canWrite,
	company,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	state: ActivityActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="Register company activity"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
					versionFieldName="expectedCompanyVersion"
				/>
				<div className="space-y-2">
					<Label htmlFor="companyActivityType">Activity type</Label>
					<NativeSelect id="companyActivityType" name="classification" required>
						<NativeSelectOption value="registered_object">
							Registered object
						</NativeSelectOption>
						<NativeSelectOption value="regulated">Regulated</NativeSelectOption>
						<NativeSelectOption value="operational">
							Operational
						</NativeSelectOption>
					</NativeSelect>
				</div>
				<TextField
					id="activityCode"
					label="Activity code"
					name="activityCode"
					required
				/>
				<TextField
					id="activityDescription"
					label="Description"
					name="description"
					required
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="activityJurisdiction"
						label="Jurisdiction"
						maxLength={2}
						name="jurisdictionCode"
						required
					/>
					<TextField
						id="activityRegulator"
						label="Regulator"
						name="regulatorCode"
					/>
				</div>
				<TextField
					id="activityEffectiveFrom"
					label="Effective from"
					name="effectiveFrom"
					required
					type="date"
				/>
				<TextField
					id="activitySource"
					label="Source document"
					name="sourceDocumentId"
					required
				/>
				<SubmitButton>Register activity</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Activity registered." />
		</form>
	);
}

export function ActivityHistory({
	activities,
}: Readonly<{ activities: readonly LegalCompanyIdentityActivity[] }>) {
	if (activities.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No company activities have been recorded.
			</p>
		);
	}
	return (
		<Table aria-label="Company activity history">
			<TableHeader>
				<TableRow>
					<TableHead>Activity</TableHead>
					<TableHead>Jurisdiction</TableHead>
					<TableHead>Effective period</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{activities.map((activity) => (
					<TableRow key={activity.companyActivityId}>
						<TableCell>
							{activity.classification} / {activity.activityCode}
						</TableCell>
						<TableCell>
							{activity.jurisdictionCode}
							{activity.regulatorCode ? ` / ${activity.regulatorCode}` : ""}
						</TableCell>
						<TableCell>
							{activity.effectiveFrom} to {activity.effectiveTo ?? "open"}
						</TableCell>
						<TableCell>{activity.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function EndActivityForm({
	action,
	activity,
	canWrite,
	company,
	organizationSlug,
	state,
}: Readonly<{
	action: (payload: FormData) => void;
	activity: LegalCompanyIdentityActivity;
	canWrite: boolean;
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	state: ActivityActionState;
}>) {
	return (
		<form
			action={action}
			aria-label="End company activity"
			className="space-y-4"
		>
			<fieldset className="space-y-4" disabled={!canWrite}>
				<IdentityHiddenFields
					company={company}
					organizationSlug={organizationSlug}
				/>
				<input
					name="companyActivityId"
					type="hidden"
					value={activity.companyActivityId}
				/>
				<input
					name="expectedActivityVersion"
					type="hidden"
					value={activity.version}
				/>
				<TextField
					id="activityEndedAt"
					label="End date"
					name="endedAt"
					required
					type="date"
				/>
				<TextField
					id="activityEndReason"
					label="End reason"
					name="endReason"
					required
				/>
				<SubmitButton>End activity</SubmitButton>
			</fieldset>
			<ActionFeedback state={state} success="Activity ended." />
		</form>
	);
}

function IdentityHiddenFields({
	company,
	organizationSlug,
	versionFieldName,
}: Readonly<{
	company: LegalCompanyIdentityCompany;
	organizationSlug: string;
	versionFieldName?: "expectedCompanyVersion";
}>) {
	return (
		<>
			<input name="organizationSlug" type="hidden" value={organizationSlug} />
			<input
				name="legalCompanyId"
				type="hidden"
				value={company.legalCompanyId}
			/>
			{versionFieldName ? (
				<input name={versionFieldName} type="hidden" value={company.version} />
			) : null}
		</>
	);
}

function SubmitButton({ children }: Readonly<{ children: React.ReactNode }>) {
	const status = useFormStatus();
	return (
		<Button disabled={status.pending} type="submit">
			{status.pending ? "Saving..." : <span>{children}</span>}
		</Button>
	);
}
