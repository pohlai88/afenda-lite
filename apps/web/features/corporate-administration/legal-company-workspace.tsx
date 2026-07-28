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
	Code,
	Input,
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
} from "@afenda/ui-system";
import type * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerLegalCompanyDraftFormAction } from "@/app/actions/register-legal-company-draft";
import { setCompanyJurisdictionProfileFormAction } from "@/app/actions/set-company-jurisdiction-profile";
import { supersedeCompanyJurisdictionProfileFormAction } from "@/app/actions/supersede-company-jurisdiction-profile";
import { updateLegalCompanyProfileFormAction } from "@/app/actions/update-legal-company-profile";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export type LegalCompanyWorkspaceParty = Readonly<{
	id: string;
	code: string;
	name: string;
}>;

export type LegalCompanyWorkspaceJurisdictionProfile = Readonly<{
	jurisdictionProfileId: string;
	jurisdictionCountryCode: string;
	entityType: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	version: number;
}>;

export type LegalCompanyWorkspaceCompany = Readonly<{
	legalCompanyId: string;
	companyCode: string;
	displayName: string;
	homeJurisdictionCountryCode: string;
	state:
		| "draft"
		| "active"
		| "suspended"
		| "struck_off"
		| "in_liquidation"
		| "dissolved"
		| "restored"
		| "archived";
	version: number;
	currentJurisdictionProfile: LegalCompanyWorkspaceJurisdictionProfile | null;
}>;

export type LegalCompanyWorkspaceProps = Readonly<{
	canWrite: boolean;
	companies: readonly LegalCompanyWorkspaceCompany[];
	parties: readonly LegalCompanyWorkspaceParty[];
}>;

type RegisterState = ActionResult<{ legalCompanyId: string }> | null;
type ProfileState = ActionResult<{
	legalCompanyId: string;
	version: number;
}> | null;
type JurisdictionState = ActionResult<{ jurisdictionProfileId: string }> | null;

export function LegalCompanyWorkspace({
	canWrite,
	companies,
	parties,
}: LegalCompanyWorkspaceProps) {
	const [registerState, registerAction] = useActionState<
		RegisterState,
		FormData
	>(registerLegalCompanyDraftFormAction, null);
	const [profileState, profileAction] = useActionState<ProfileState, FormData>(
		updateLegalCompanyProfileFormAction,
		null,
	);
	const [jurisdictionState, jurisdictionAction] = useActionState<
		JurisdictionState,
		FormData
	>(setCompanyJurisdictionProfileFormAction, null);
	const [supersedeState, supersedeAction] = useActionState<
		JurisdictionState,
		FormData
	>(supersedeCompanyJurisdictionProfileFormAction, null);
	const disabled = !canWrite;
	const noCompanies = companies.length === 0;
	const noParties = parties.length === 0;
	const profiles = companies
		.map((company) =>
			company.currentJurisdictionProfile === null
				? null
				: {
						company,
						profile: company.currentJurisdictionProfile,
					},
		)
		.filter((entry) => entry !== null);

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<Card>
					<CardHeader>
						<CardTitle>Register draft</CardTitle>
						<CardDescription>
							Requires an active organization party in the same tenant.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form action={registerAction} className="space-y-4">
							<fieldset className="space-y-4" disabled={disabled || noParties}>
								<FormField
									id="registerCompanyCode"
									name="companyCode"
									label="Company code"
									maxLength={64}
									required
								/>
								<FormField
									id="registerDisplayName"
									name="displayName"
									label="Display name"
									maxLength={256}
									required
								/>
								<div className="space-y-2">
									<Label htmlFor="masterDataPartyId">
										Active organization party
									</Label>
									<NativeSelect
										id="masterDataPartyId"
										name="masterDataPartyId"
										required
									>
										<NativeSelectOption value="">
											Select a party
										</NativeSelectOption>
										{parties.map((party) => (
											<NativeSelectOption key={party.id} value={party.id}>
												{party.code} - {party.name}
											</NativeSelectOption>
										))}
									</NativeSelect>
								</div>
								<FormField
									id="registerHomeJurisdictionCountryCode"
									name="homeJurisdictionCountryCode"
									label="Home jurisdiction"
									maxLength={2}
									pattern="[A-Za-z]{2}"
									required
									className="uppercase"
								/>
								<SubmitButton>Register draft</SubmitButton>
							</fieldset>
							<ActionFeedback
								state={registerState}
								success="Draft registered."
							/>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Draft legal companies</CardTitle>
						<CardDescription>
							{companies.length} loaded from ca_legal_company.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{noCompanies ? (
							<p className="text-sm text-muted-foreground">
								No legal company drafts yet.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Company</TableHead>
										<TableHead>Jurisdiction</TableHead>
										<TableHead>Version</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{companies.map((company) => (
										<TableRow key={company.legalCompanyId}>
											<TableCell>
												<Code>{company.companyCode}</Code> {company.displayName}
											</TableCell>
											<TableCell>
												{company.currentJurisdictionProfile === null ? (
													<span className="text-muted-foreground">Not set</span>
												) : (
													<span>
														{
															company.currentJurisdictionProfile
																.jurisdictionCountryCode
														}{" "}
														· {company.currentJurisdictionProfile.entityType}
													</span>
												)}
											</TableCell>
											<TableCell>
												<StatusBadge
													status="pending"
													label={`v${company.version}`}
													showIcon={false}
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<CompanyProfileForm
					companies={companies}
					disabled={disabled || noCompanies}
					action={profileAction}
					state={profileState}
				/>
				<SetJurisdictionProfileForm
					companies={companies}
					disabled={disabled || noCompanies}
					action={jurisdictionAction}
					state={jurisdictionState}
				/>
				<SupersedeJurisdictionProfileForm
					profiles={profiles}
					disabled={disabled || profiles.length === 0}
					action={supersedeAction}
					state={supersedeState}
				/>
			</div>
		</div>
	);
}

function CompanyProfileForm({
	companies,
	disabled,
	action,
	state,
}: Readonly<{
	companies: readonly LegalCompanyWorkspaceCompany[];
	disabled: boolean;
	action: (payload: FormData) => void;
	state: ProfileState;
}>) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile</CardTitle>
				<CardDescription>
					Update the draft company display profile.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={action} className="space-y-4">
					<fieldset className="space-y-4" disabled={disabled}>
						<CompanySelect
							companies={companies}
							idPrefix="profile"
							versionFieldName="expectedVersion"
						/>
						<FormField
							id="profileDisplayName"
							name="displayName"
							label="Display name"
							maxLength={256}
							required
						/>
						<FormField
							id="profileRegisteredName"
							name="registeredName"
							label="Registered name"
							maxLength={256}
						/>
						<FormField
							id="profileShortName"
							name="shortName"
							label="Short name"
							maxLength={128}
						/>
						<input
							type="hidden"
							name="sourceReference"
							value="web:legal-company-profile"
						/>
						<SubmitButton>Update profile</SubmitButton>
					</fieldset>
					<ActionFeedback state={state} success="Profile updated." />
				</form>
			</CardContent>
		</Card>
	);
}

function SetJurisdictionProfileForm({
	companies,
	disabled,
	action,
	state,
}: Readonly<{
	companies: readonly LegalCompanyWorkspaceCompany[];
	disabled: boolean;
	action: (payload: FormData) => void;
	state: JurisdictionState;
}>) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Jurisdiction</CardTitle>
				<CardDescription>
					Record an effective jurisdiction profile.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={action} className="space-y-4">
					<fieldset className="space-y-4" disabled={disabled}>
						<CompanySelect
							companies={companies}
							idPrefix="jurisdiction"
							versionFieldName="expectedCompanyVersion"
						/>
						<JurisdictionFields idPrefix="set" />
						<input
							type="hidden"
							name="sourceReference"
							value="web:jurisdiction-profile"
						/>
						<SubmitButton>Set profile</SubmitButton>
					</fieldset>
					<ActionFeedback
						state={state}
						success="Jurisdiction profile recorded."
					/>
				</form>
			</CardContent>
		</Card>
	);
}

function SupersedeJurisdictionProfileForm({
	profiles,
	disabled,
	action,
	state,
}: Readonly<{
	profiles: readonly {
		company: LegalCompanyWorkspaceCompany;
		profile: LegalCompanyWorkspaceJurisdictionProfile;
	}[];
	disabled: boolean;
	action: (payload: FormData) => void;
	state: JurisdictionState;
}>) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Supersede</CardTitle>
				<CardDescription>
					Replace a visible jurisdiction profile.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={action} className="space-y-4">
					<fieldset className="space-y-4" disabled={disabled}>
						<div className="space-y-2">
							<Label htmlFor="supersedeProfile">Current profile</Label>
							<NativeSelect
								id="supersedeProfile"
								name="jurisdictionProfileId"
								required
							>
								<NativeSelectOption value="">
									Select a profile
								</NativeSelectOption>
								{profiles.map(({ company, profile }) => (
									<NativeSelectOption
										key={profile.jurisdictionProfileId}
										value={profile.jurisdictionProfileId}
									>
										{company.companyCode} - {profile.jurisdictionCountryCode} ·{" "}
										{profile.entityType} · v{profile.version}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
						<div className="space-y-2">
							<Label htmlFor="supersedeCompany">Legal company</Label>
							<NativeSelect
								id="supersedeCompany"
								name="legalCompanyId"
								required
							>
								<NativeSelectOption value="">Select a draft</NativeSelectOption>
								{profiles.map(({ company }) => (
									<NativeSelectOption
										key={company.legalCompanyId}
										value={company.legalCompanyId}
									>
										{company.companyCode} - {company.displayName}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
						<div className="space-y-2">
							<Label htmlFor="expectedProfileVersion">
								Expected profile version
							</Label>
							<Input
								id="expectedProfileVersion"
								name="expectedProfileVersion"
								type="number"
								min={0}
								required
							/>
						</div>
						<JurisdictionFields idPrefix="supersede" />
						<input
							type="hidden"
							name="sourceReference"
							value="web:jurisdiction-profile-supersession"
						/>
						<SubmitButton>Supersede profile</SubmitButton>
					</fieldset>
					<ActionFeedback
						state={state}
						success="Jurisdiction profile superseded."
					/>
				</form>
			</CardContent>
		</Card>
	);
}

function CompanySelect({
	companies,
	idPrefix,
	versionFieldName,
}: Readonly<{
	companies: readonly LegalCompanyWorkspaceCompany[];
	idPrefix: string;
	versionFieldName: "expectedCompanyVersion" | "expectedVersion";
}>) {
	const companyFieldId = `${idPrefix}LegalCompanyId`;
	const versionFieldId = `${idPrefix}Version`;
	return (
		<div className="space-y-2">
			<Label htmlFor={companyFieldId}>Legal company draft</Label>
			<NativeSelect id={companyFieldId} name="legalCompanyId" required>
				<NativeSelectOption value="">Select a draft</NativeSelectOption>
				{companies.map((company) => (
					<NativeSelectOption
						key={company.legalCompanyId}
						value={company.legalCompanyId}
					>
						{company.companyCode} - {company.displayName}
						{` · v${company.version}`}
					</NativeSelectOption>
				))}
			</NativeSelect>
			<div className="space-y-2">
				<Label htmlFor={versionFieldId}>Expected company version</Label>
				<Input
					id={versionFieldId}
					name={versionFieldName}
					type="number"
					min={0}
					required
				/>
			</div>
		</div>
	);
}

function JurisdictionFields({
	idPrefix,
}: Readonly<{ idPrefix: "set" | "supersede" }>) {
	return (
		<>
			<FormField
				id={`${idPrefix}JurisdictionCountryCode`}
				name="jurisdictionCountryCode"
				label="Jurisdiction"
				maxLength={2}
				pattern="[A-Za-z]{2}"
				required
				className="uppercase"
			/>
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}EntityType`}>Entity type</Label>
				<NativeSelect id={`${idPrefix}EntityType`} name="entityType" required>
					<NativeSelectOption value="private_limited_company">
						Private limited company
					</NativeSelectOption>
					<NativeSelectOption value="draft_legal_company">
						Draft legal company
					</NativeSelectOption>
				</NativeSelect>
			</div>
			<FormField
				id={`${idPrefix}EffectiveFrom`}
				name="effectiveFrom"
				label="Effective from"
				type="date"
				required
			/>
			<FormField
				id={`${idPrefix}EffectiveTo`}
				name="effectiveTo"
				label="Effective to"
				type="date"
			/>
		</>
	);
}

function FormField({
	id,
	label,
	...props
}: Readonly<
	React.ComponentProps<typeof Input> & { id: string; label: string }
>) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Input id={id} name={props.name ?? id} {...props} />
		</div>
	);
}

function SubmitButton({ children }: Readonly<{ children: React.ReactNode }>) {
	const status = useFormStatus();
	return (
		<Button type="submit" disabled={status.pending}>
			{status.pending ? "Saving..." : children}
		</Button>
	);
}

export function ActionFeedback({
	state,
	success,
}: Readonly<{
	state: ActionResult<unknown> | null;
	success: string;
}>) {
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
