import { getSession, requireRole } from "@afenda/auth";
import {
	CA_PERMISSION_COMPANY_ACTIVATE,
	CA_PERMISSION_COMPANY_ARCHIVE,
	CA_PERMISSION_COMPANY_CREATE,
	CA_PERMISSION_COMPANY_DISSOLVE,
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	CA_PERMISSION_COMPANY_NAME_MANAGE,
	CA_PERMISSION_COMPANY_READ,
	CA_PERMISSION_COMPANY_SUSPEND,
	CA_PERMISSION_COMPANY_UPDATE,
	CA_PERMISSION_GOVERNANCE_MANAGE,
	CA_PERMISSION_GOVERNANCE_READ,
	CA_PERMISSION_PROPERTY_ASSETS_MANAGE,
	CA_PERMISSION_PROPERTY_ASSETS_READ,
	CA_PERMISSION_SHARE_CAPITAL_MANAGE,
	CA_PERMISSION_SHARE_CAPITAL_READ,
	canTransitionLegalCompany,
	canUpdateLegalCompanyProfile,
	getLegalCompany,
	listAuthorityMandates,
	listBeneficialOwnerDisclosures,
	listCharges,
	listCompanyPremises,
	listCorporateAssets,
	listGovernanceBodies,
	listGovernanceMeetings,
	listGovernanceMemberships,
	listInsurancePolicies,
	listIntellectualProperty,
	listLegalCompanies,
	listOfficerAppointments,
	listProperties,
	listResolutions,
	listShareCertificates,
	listShareClasses,
	listShareHoldingsAsOf,
	listShareTransactions,
} from "@afenda/corporate-administration";
import { listParties } from "@afenda/master-data";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
} from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import { ActivateLegalCompanyForm } from "@/features/corporate-administration/activate-legal-company-form";
import { AddCompanyIdentifierForm } from "@/features/corporate-administration/add-company-identifier-form";
import { AddCompanyNameForm } from "@/features/corporate-administration/add-company-name-form";
import { CompanyLifecycleForms } from "@/features/corporate-administration/company-lifecycle-forms";
import { CreateLegalCompanyForm } from "@/features/corporate-administration/create-legal-company-form";
import {
	type GovernancePremisesSnapshot,
	GovernanceRegisterPanel,
	PremisesRegisterPanel,
} from "@/features/corporate-administration/governance-premises-panels";
import { LegalCompanyDetail } from "@/features/corporate-administration/legal-company-detail";
import { LegalCompanyTable } from "@/features/corporate-administration/legal-company-table";
import {
	CorporateAssetRegisterPanel,
	InsuranceChargesRegisterPanel,
	IntellectualPropertyRegisterPanel,
	type PropertyAssetsRegisterRow,
	PropertyRegisterPanel,
} from "@/features/corporate-administration/property-assets-panels";
import {
	ShareCapitalPanel,
	type ShareCapitalSnapshot,
} from "@/features/corporate-administration/share-capital-panel";
import { UpdateLegalCompanyForm } from "@/features/corporate-administration/update-legal-company-form";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type CorporateAdministrationShellProps = {
	surface: "admin" | "client";
	companyId?: string;
};

export async function CorporateAdministrationShell({
	surface,
	companyId,
}: CorporateAdministrationShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();

	await requirePermission(session, CA_PERMISSION_COMPANY_READ);
	const [
		canCreate,
		canUpdate,
		canActivate,
		canSuspend,
		canDissolve,
		canArchive,
		canManageNames,
		canManageIdentifiers,
		canReadGovernance,
		canManageGovernance,
		canReadShareCapital,
		canManageShareCapital,
		canReadPropertyAssets,
		canManagePropertyAssets,
	] = await Promise.all([
		sessionHasPermission(session, CA_PERMISSION_COMPANY_CREATE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_UPDATE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_ACTIVATE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_SUSPEND),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_DISSOLVE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_ARCHIVE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_NAME_MANAGE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE),
		sessionHasPermission(session, CA_PERMISSION_GOVERNANCE_READ),
		sessionHasPermission(session, CA_PERMISSION_GOVERNANCE_MANAGE),
		sessionHasPermission(session, CA_PERMISSION_SHARE_CAPITAL_READ),
		sessionHasPermission(session, CA_PERMISSION_SHARE_CAPITAL_MANAGE),
		sessionHasPermission(session, CA_PERMISSION_PROPERTY_ASSETS_READ),
		sessionHasPermission(session, CA_PERMISSION_PROPERTY_ASSETS_MANAGE),
	]);

	const options = createCorporateAdministrationCommandOptions();
	const [companiesResult, partiesResult] = await Promise.all([
		listLegalCompanies(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				limit: 50,
			},
			options,
		),
		listParties(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		),
	]);

	const companies = companiesResult.ok ? companiesResult.data.items : [];
	const orgParties = partiesResult.ok
		? partiesResult.data.filter((party) => party.partyKind === "organization")
		: [];
	const seedParty = orgParties[0];

	const firstDraft = companies.find((company) => company.status === "draft");
	const selectedCompany = companyId
		? companies.find((company) => company.id === companyId)
		: (firstDraft ?? companies[0]);
	let selectedDetail = null;
	let governanceSnapshot: GovernancePremisesSnapshot = {
		officers: [],
		bodies: [],
		memberships: [],
		mandates: [],
		premises: [],
		meetings: [],
		resolutions: [],
	};
	let shareCapitalSnapshot: ShareCapitalSnapshot = {
		classes: [],
		transactions: [],
		holdings: [],
		certificates: [],
		beneficialOwners: [],
	};
	let propertyRows: PropertyAssetsRegisterRow[] = [];
	let corporateAssetRows: PropertyAssetsRegisterRow[] = [];
	let intellectualPropertyRows: PropertyAssetsRegisterRow[] = [];
	let insuranceRows: PropertyAssetsRegisterRow[] = [];
	let chargeRows: PropertyAssetsRegisterRow[] = [];
	if (selectedCompany) {
		const detail = await getLegalCompany(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				legalCompanyId: selectedCompany.id,
			},
			options,
		);
		if (detail.ok) {
			selectedDetail = detail.data;
		}
		if (canReadGovernance) {
			const query = {
				organizationId: session.orgId,
				actorUserId: session.userId,
				legalCompanyId: selectedCompany.id,
			};
			const [
				officers,
				bodies,
				memberships,
				mandates,
				premises,
				meetings,
				resolutions,
			] = await Promise.all([
				listOfficerAppointments(query, options),
				listGovernanceBodies(query, options),
				listGovernanceMemberships(query, options),
				listAuthorityMandates(query, options),
				listCompanyPremises(query, options),
				listGovernanceMeetings(query, options),
				listResolutions(query, options),
			]);
			governanceSnapshot = {
				officers: officers.ok
					? officers.data.map((record) => ({
							id: record.id,
							label: record.officerRole.replaceAll("_", " "),
							summary:
								record.partyNameSnapshot ??
								record.partyCodeSnapshot ??
								record.partyId ??
								"Controlled party",
							status: record.status,
							version: record.version,
						}))
					: [],
				bodies: bodies.ok
					? bodies.data.map((record) => ({
							id: record.id,
							label: record.displayName,
							summary: `${record.code} · ${record.bodyType}`,
							status: record.status,
							version: record.version,
						}))
					: [],
				memberships: memberships.ok
					? memberships.data.map((record) => ({
							id: record.id,
							label: record.roleTitle,
							summary:
								record.memberPartyNameSnapshot ??
								record.memberPartyCodeSnapshot ??
								record.officerAppointmentId ??
								"Controlled member",
							status: record.effectiveTo ? "ended" : "active",
							version: record.version,
						}))
					: [],
				mandates: mandates.ok
					? mandates.data.map((record) => ({
							id: record.id,
							label: record.mandateType.replaceAll("_", " "),
							summary: record.scopeDescription,
							status: record.status,
							version: record.version,
						}))
					: [],
				premises: premises.ok
					? premises.data.map((record) => ({
							id: record.id,
							label: record.premiseType.replaceAll("_", " "),
							summary: [
								record.addressLine1Snapshot,
								record.citySnapshot,
								record.countryCodeSnapshot,
							]
								.filter(Boolean)
								.join(", "),
							status: record.status,
							version: record.version,
						}))
					: [],
				meetings: meetings.ok
					? meetings.data.map((record) => ({
							id: record.id,
							label: new Date(record.meetingAt).toISOString(),
							summary: `Quorum: ${record.quorumResult.replaceAll("_", " ")}`,
							status: record.status,
							version: record.version,
						}))
					: [],
				resolutions: resolutions.ok
					? resolutions.data.map((record) => ({
							id: record.id,
							label: `${record.resolutionYear}/${record.resolutionNumber}`,
							summary: record.title,
							status: record.status,
							version: record.version,
						}))
					: [],
			};
		}
		if (canReadShareCapital) {
			const query = {
				organizationId: session.orgId,
				actorUserId: session.userId,
				legalCompanyId: selectedCompany.id,
			};
			const asOf = new Date().toISOString().slice(0, 10);
			const [classes, transactions, holdings, certificates, beneficialOwners] =
				await Promise.all([
					listShareClasses(query, options),
					listShareTransactions(query, options),
					listShareHoldingsAsOf({ ...query, asOf }, options),
					listShareCertificates(query, options),
					listBeneficialOwnerDisclosures(query, options),
				]);
			shareCapitalSnapshot = {
				classes: classes.ok
					? classes.data.map((record) => ({
							id: record.id,
							label: record.code,
							summary: `${record.classType} · ${record.currencyCode} · par ${record.parValue}`,
							status: record.status,
							version: record.version,
						}))
					: [],
				transactions: transactions.ok
					? transactions.data.map((record) => ({
							id: record.id,
							label: record.transactionReference,
							summary: `${record.transactionType} · ${record.transactionDate}`,
							status: record.status,
						}))
					: [],
				holdings: holdings.ok
					? holdings.data.map((record) => ({
							shareClassId: record.shareClassId,
							holderPartyId: record.holderPartyId,
							holderLabel:
								record.holderPartyNameSnapshot ??
								record.holderPartyCodeSnapshot ??
								record.holderPartyId,
							quantity: record.quantity,
						}))
					: [],
				certificates: certificates.ok
					? certificates.data.map((record) => ({
							id: record.id,
							label: record.certificateNumber,
							summary: record.holderPartyNameSnapshot ?? record.holderPartyId,
							status: record.status,
							version: record.version,
						}))
					: [],
				beneficialOwners: beneficialOwners.ok
					? beneficialOwners.data.map((record) => ({
							id: record.id,
							label: record.partyNameSnapshot ?? record.partyId,
							summary: record.natureOfControlCodes,
							status: record.effectiveTo ? "ended" : "active",
							version: record.version,
						}))
					: [],
			};
		}
		if (canReadPropertyAssets) {
			const query = {
				organizationId: session.orgId,
				actorUserId: session.userId,
				legalCompanyId: selectedCompany.id,
			};
			const [properties, assets, intellectualProperty, insurance, charges] =
				await Promise.all([
					listProperties(query, options),
					listCorporateAssets(query, options),
					listIntellectualProperty(query, options),
					listInsurancePolicies(query, options),
					listCharges(query, options),
				]);
			propertyRows = properties.ok
				? properties.data.map((record) => ({
						id: record.id,
						label: record.code,
						summary: `${record.titleReference} · ${record.ownershipPercentage}%`,
						status: record.status,
						version: record.version,
					}))
				: [];
			corporateAssetRows = assets.ok
				? assets.data.map((record) => ({
						id: record.id,
						label: record.code,
						summary: `${record.assetCategory} · ${record.description}`,
						status: record.status,
						version: record.version,
					}))
				: [];
			intellectualPropertyRows = intellectualProperty.ok
				? intellectualProperty.data.map((record) => ({
						id: record.id,
						label: record.code,
						summary: `${record.rightType} · ${record.jurisdictionCode} · ${record.registrationNumber ?? record.applicationNumber}`,
						status: record.status,
						version: record.version,
					}))
				: [];
			insuranceRows = insurance.ok
				? insurance.data.map((record) => ({
						id: record.id,
						label: record.policyNumber,
						summary: `${record.insurerPartyNameSnapshot ?? "Controlled insurer"} · ${record.effectiveFrom}`,
						status: record.status,
						version: record.version,
					}))
				: [];
			chargeRows = charges.ok
				? charges.data.map((record) => ({
						id: record.id,
						label: record.code,
						summary: `${record.chargeType} · priority ${record.priorityRank}`,
						status: record.status,
						version: record.version,
					}))
				: [];
		}
	}

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Corporate
					Administration
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Legal companies
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Statutory registry bound to <Code>md_organization_dimension</Code> (
					<Code>legal_entity</Code>) and <Code>md_party</Code> organization
					parties.
				</p>
			</div>

			{!companiesResult.ok ? (
				<Alert>
					<AlertTitle>Could not load companies</AlertTitle>
					<AlertDescription>{companiesResult.message}</AlertDescription>
				</Alert>
			) : null}

			{companyId && !selectedCompany ? (
				<Alert variant="destructive">
					<AlertTitle>Company is unavailable</AlertTitle>
					<AlertDescription>
						The selected company does not exist in this organization or is not
						available to your session.
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Companies</CardTitle>
					<CardDescription>
						{companies.length} registered company record(s)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<LegalCompanyTable
						rows={companies.map((company) => ({
							id: company.id,
							code: company.code,
							legalEntityName: company.legalEntityNameSnapshot,
							status: company.status,
							version: company.version,
							updatedAt: company.updatedAt.toISOString(),
						}))}
					/>
				</CardContent>
			</Card>

			{selectedDetail ? (
				<LegalCompanyDetail
					company={selectedDetail}
					governance={
						canReadGovernance ? (
							<GovernanceRegisterPanel
								legalCompanyId={selectedDetail.id}
								snapshot={governanceSnapshot}
								canManage={surface === "admin" && canManageGovernance}
								defaultPartyId={seedParty?.id}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Governance access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company governance register.
								</AlertDescription>
							</Alert>
						)
					}
					premises={
						canReadGovernance ? (
							<PremisesRegisterPanel
								legalCompanyId={selectedDetail.id}
								snapshot={governanceSnapshot}
								canManage={surface === "admin" && canManageGovernance}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Premises access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company premises register.
								</AlertDescription>
							</Alert>
						)
					}
					capital={
						canReadShareCapital ? (
							<ShareCapitalPanel
								legalCompanyId={selectedDetail.id}
								snapshot={shareCapitalSnapshot}
								canManage={surface === "admin" && canManageShareCapital}
								defaultPartyId={seedParty?.id}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Share capital access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company share capital register.
								</AlertDescription>
							</Alert>
						)
					}
					property={
						canReadPropertyAssets ? (
							<PropertyRegisterPanel
								legalCompanyId={selectedDetail.id}
								rows={propertyRows}
								canManage={surface === "admin" && canManagePropertyAssets}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Property access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company property register.
								</AlertDescription>
							</Alert>
						)
					}
					corporateAssets={
						canReadPropertyAssets ? (
							<CorporateAssetRegisterPanel
								legalCompanyId={selectedDetail.id}
								rows={corporateAssetRows}
								canManage={surface === "admin" && canManagePropertyAssets}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Corporate asset access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company corporate asset
									register.
								</AlertDescription>
							</Alert>
						)
					}
					intellectualProperty={
						canReadPropertyAssets ? (
							<IntellectualPropertyRegisterPanel
								legalCompanyId={selectedDetail.id}
								rows={intellectualPropertyRows}
								canManage={surface === "admin" && canManagePropertyAssets}
								defaultPartyId={seedParty?.id}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Intellectual property access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company intellectual-property
									register.
								</AlertDescription>
							</Alert>
						)
					}
					insuranceCharges={
						canReadPropertyAssets ? (
							<InsuranceChargesRegisterPanel
								legalCompanyId={selectedDetail.id}
								insuranceRows={insuranceRows}
								chargeRows={chargeRows}
								canManage={surface === "admin" && canManagePropertyAssets}
								defaultPartyId={seedParty?.id}
							/>
						) : (
							<Alert variant="destructive">
								<AlertTitle>Insurance and charge access required</AlertTitle>
								<AlertDescription>
									Your session cannot read this company insurance and charge
									register.
								</AlertDescription>
							</Alert>
						)
					}
				/>
			) : null}

			{surface === "admin" &&
			canUpdate &&
			selectedDetail &&
			canUpdateLegalCompanyProfile(selectedDetail.status) ? (
				<Card>
					<CardHeader>
						<CardTitle>Edit {selectedDetail.code}</CardTitle>
						<CardDescription>
							Optimistic concurrency protects this versioned company profile.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<UpdateLegalCompanyForm company={selectedDetail} />
					</CardContent>
				</Card>
			) : null}

			{surface === "admin" && canCreate ? (
				<Card>
					<CardHeader>
						<CardTitle>Create draft</CardTitle>
						<CardDescription>
							Requires an effective legal entity dimension and optional
							organization party.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateLegalCompanyForm defaultLegalPartyId={seedParty?.id} />
					</CardContent>
				</Card>
			) : null}

			{surface === "admin" && canManageNames && firstDraft ? (
				<Card>
					<CardHeader>
						<CardTitle>Add name · {firstDraft.code}</CardTitle>
						<CardDescription>
							Primary legal name required before activation.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<AddCompanyNameForm legalCompanyId={firstDraft.id} />
					</CardContent>
				</Card>
			) : null}

			{surface === "admin" && canManageIdentifiers && firstDraft ? (
				<Card>
					<CardHeader>
						<CardTitle>Add identifier · {firstDraft.code}</CardTitle>
						<CardDescription>
							Company registration identifier required before activation (not
							tax types).
						</CardDescription>
					</CardHeader>
					<CardContent>
						<AddCompanyIdentifierForm legalCompanyId={firstDraft.id} />
					</CardContent>
				</Card>
			) : null}

			{surface === "admin" &&
			canActivate &&
			selectedDetail &&
			canTransitionLegalCompany(selectedDetail.status, "active") ? (
				<Card>
					<CardHeader>
						<CardTitle>Activate {selectedDetail.code}</CardTitle>
						<CardDescription>
							Requires primary legal name, company registration identifier, and
							active organization party.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ActivateLegalCompanyForm
							legalCompanyId={selectedDetail.id}
							expectedVersion={selectedDetail.version}
						/>
					</CardContent>
				</Card>
			) : null}

			{surface === "admin" &&
			selectedDetail &&
			(canSuspend || canDissolve || canArchive) ? (
				<Card>
					<CardHeader>
						<CardTitle>Lifecycle controls</CardTitle>
						<CardDescription>
							High-risk transitions require effective evidence and explicit
							confirmation.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CompanyLifecycleForms
							company={selectedDetail}
							canSuspend={canSuspend}
							canDissolve={canDissolve}
							canArchive={canArchive}
						/>
					</CardContent>
				</Card>
			) : null}
		</section>
	);
}
