import { randomUUID } from "node:crypto";

import { authServer } from "@afenda/auth";
import {
	findCompanyFinancialYearAsOf,
	findCompanyLegalFormAsOf,
	findRegisteredAddressAsOf,
	getCompanyCompletenessForActivation,
	getLegalCompany,
	listCompanyActivitiesAsOf,
	listCompanyIdentifiers,
	listCompanyNames,
	listLegalCompanies,
	listLegalEstablishmentsAsOf,
	listPremisesAsOf,
} from "@afenda/corporate-administration";
import { Alert, AlertDescription, AlertTitle } from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import {
	type LegalCompanyIdentityActivity,
	type LegalCompanyIdentityFinancialYear,
	type LegalCompanyIdentityIdentifier,
	type LegalCompanyIdentityLegalForm,
	type LegalCompanyIdentityName,
	LegalCompanyIdentityWorkspace,
} from "@/features/corporate-administration/legal-company-identity-workspace";
import {
	type LegalCompanyActivationCompleteness,
	LegalCompanyLifecycleWorkspace,
} from "@/features/corporate-administration/legal-company-lifecycle-workspace";
import { LegalCompanyWorkspace } from "@/features/corporate-administration/legal-company-workspace";
import { LegalEstablishmentWorkspace } from "@/features/corporate-administration/legal-establishment-workspace";
import {
	createCorporateAdministrationCompanyDependencies,
	createCorporateAdministrationQueryOptions,
	listCorporateAdministrationActiveOrganizationParties,
	listCorporateAdministrationPartyAddresses,
} from "@/lib/erp/corporate-administration-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

const LEGAL_COMPANY_LIFECYCLE_UNAVAILABLE_MESSAGE =
	"Company lifecycle data is unavailable.";
const LEGAL_COMPANY_IDENTITY_UNAVAILABLE_MESSAGE =
	"Company identity data is unavailable.";

interface CorporateAdministrationShellProps {
	surface: "admin" | "client";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The RSC composes independently authorized corporate administration surfaces.
export async function CorporateAdministrationShell({
	surface,
}: CorporateAdministrationShellProps) {
	const session =
		surface === "admin"
			? await authServer.session.requireRole("operator")
			: await authServer.session.get();
	await requirePermission(session, "corporate_administration.company.read");
	const canWrite = await sessionHasPermission(
		session,
		"corporate_administration.company.manage",
	);
	const correlationId = `ca-page-${randomUUID()}`;
	const dependencies = createCorporateAdministrationCompanyDependencies();
	const queryOptions = createCorporateAdministrationQueryOptions({
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId,
	});
	const companiesResult = await listLegalCompanies(
		{ pagination: { limit: 50 } },
		queryOptions,
		{ store: dependencies.store },
	);
	const detailedCompanies = companiesResult.ok
		? await Promise.all(
				companiesResult.data.items.map(async (company) => {
					const detail = await getLegalCompany(
						{ legalCompanyId: company.legalCompanyId },
						queryOptions,
						{ store: dependencies.store },
					);
					return detail.ok ? detail.data : null;
				}),
			)
		: [];
	const partyRows = await listCorporateAdministrationActiveOrganizationParties({
		organizationId: session.orgId,
	});
	const companies = detailedCompanies
		.filter((company) => company !== null)
		.map((company) => ({
			legalCompanyId: company.legalCompanyId,
			companyCode: company.companyCode,
			displayName: company.profile.displayName,
			homeJurisdictionCountryCode: company.homeJurisdictionCountryCode,
			state: company.state,
			version: company.version,
			currentJurisdictionProfile:
				company.currentJurisdictionProfile === null
					? null
					: {
							jurisdictionProfileId:
								company.currentJurisdictionProfile.jurisdictionProfileId,
							jurisdictionCountryCode:
								company.currentJurisdictionProfile.jurisdictionCountryCode,
							entityType: company.currentJurisdictionProfile.entityType,
							effectiveFrom:
								company.currentJurisdictionProfile.effectiveRange.from,
							effectiveTo: company.currentJurisdictionProfile.effectiveRange.to,
							version: company.currentJurisdictionProfile.version,
						},
		}));
	const selectedCompany = detailedCompanies.find((company) => company !== null);
	const identityState =
		selectedCompany === undefined
			? null
			: await loadLegalCompanyIdentity({
					legalCompanyId: selectedCompany.legalCompanyId,
					queryOptions,
					dependencies,
				});
	const legalPresenceState =
		selectedCompany === undefined
			? null
			: await loadLegalPresence({
					legalCompanyId: selectedCompany.legalCompanyId,
					queryOptions,
					dependencies,
				});
	const lifecycleState =
		selectedCompany === undefined
			? null
			: await loadLegalCompanyLifecycle({
					legalCompanyId: selectedCompany.legalCompanyId,
					queryOptions,
					dependencies,
				});
	const partyAddresses =
		selectedCompany === undefined
			? []
			: await listCorporateAdministrationPartyAddresses({
					organizationId: session.orgId,
					actorUserId: session.userId,
					partyId: selectedCompany.masterDataPartyId,
				});

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
			<header className="space-y-2">
				<p className="text-muted-foreground text-sm">
					{surface === "admin" ? "Org admin" : "Client workspace"}
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">
					Corporate Administration
				</h1>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Draft legal-company roots only. This does not activate a company or
					claim incorporation.
				</p>
			</header>

			{companiesResult.ok ? null : (
				<Alert role="alert" variant="destructive">
					<AlertTitle>Legal companies unavailable</AlertTitle>
					<AlertDescription>{companiesResult.message}</AlertDescription>
				</Alert>
			)}

			<LegalCompanyWorkspace
				canWrite={canWrite}
				companies={companies}
				parties={partyRows}
			/>

			{selectedCompany === undefined ? null : (
				<>
					{identityState?.ok === false ? (
						<Alert role="alert" variant="destructive">
							<AlertTitle>Company identity unavailable</AlertTitle>
							<AlertDescription>{identityState.message}</AlertDescription>
						</Alert>
					) : null}
					<LegalCompanyIdentityWorkspace
						activities={
							identityState?.ok === true ? identityState.activities : []
						}
						canWrite={canWrite}
						company={{
							legalCompanyId: selectedCompany.legalCompanyId,
							companyCode: selectedCompany.companyCode,
							displayName: selectedCompany.profile.displayName,
							version: selectedCompany.version,
						}}
						financialYears={
							identityState?.ok === true ? identityState.financialYears : []
						}
						identifiers={
							identityState?.ok === true ? identityState.identifiers : []
						}
						legalForms={
							identityState?.ok === true ? identityState.legalForms : []
						}
						names={identityState?.ok === true ? identityState.names : []}
						organizationSlug="client"
					/>
					{legalPresenceState?.ok === false ? (
						<Alert role="alert" variant="destructive">
							<AlertTitle>Legal presence unavailable</AlertTitle>
							<AlertDescription>{legalPresenceState.message}</AlertDescription>
						</Alert>
					) : null}
					<LegalEstablishmentWorkspace
						canWrite={canWrite}
						company={{
							legalCompanyId: selectedCompany.legalCompanyId,
							version: selectedCompany.version,
						}}
						establishments={
							legalPresenceState?.ok === true
								? legalPresenceState.establishments
								: []
						}
						partyAddresses={partyAddresses}
						premises={
							legalPresenceState?.ok === true ? legalPresenceState.premises : []
						}
						registeredAddresses={
							legalPresenceState?.ok === true
								? legalPresenceState.registeredAddresses
								: []
						}
					/>
					{lifecycleState?.ok === false ? (
						<Alert role="alert" variant="destructive">
							<AlertTitle>Company lifecycle unavailable</AlertTitle>
							<AlertDescription>{lifecycleState.message}</AlertDescription>
						</Alert>
					) : null}
					<LegalCompanyLifecycleWorkspace
						canWrite={canWrite}
						company={{
							legalCompanyId: selectedCompany.legalCompanyId,
							companyCode: selectedCompany.companyCode,
							displayName: selectedCompany.profile.displayName,
							state: selectedCompany.state,
							version: selectedCompany.version,
						}}
						completeness={
							lifecycleState?.ok === true ? lifecycleState.completeness : null
						}
						organizationSlug="client"
					/>
				</>
			)}
		</section>
	);
}

async function loadLegalCompanyLifecycle(input: {
	legalCompanyId: string;
	queryOptions: ReturnType<typeof createCorporateAdministrationQueryOptions>;
	dependencies: CorporateAdministrationIdentityDependencies;
}): Promise<
	| Readonly<{
			ok: true;
			completeness: LegalCompanyActivationCompleteness;
	  }>
	| Readonly<{ ok: false; message: string }>
> {
	const today = new Date().toISOString().slice(0, 10);
	const completeness = await getCompanyCompletenessForActivation(
		{ legalCompanyId: input.legalCompanyId, asOf: today },
		input.queryOptions,
		{
			store: input.dependencies.store,
			nameStore: input.dependencies.nameStore,
			legalFormStore: input.dependencies.legalFormStore,
			identifierStore: input.dependencies.identifierStore,
			financialYearStore: input.dependencies.financialYearStore,
			activityStore: input.dependencies.activityStore,
			establishmentStore: input.dependencies.establishmentStore,
		},
	);
	if (!completeness.ok) {
		return { ok: false, message: LEGAL_COMPANY_LIFECYCLE_UNAVAILABLE_MESSAGE };
	}
	return {
		ok: true,
		completeness: {
			complete: completeness.data.complete,
			missing: completeness.data.missing,
			checks: [
				{
					key: "hasJurisdictionProfile",
					label: "Jurisdiction profile",
					complete: completeness.data.hasJurisdictionProfile,
				},
				{
					key: "hasLegalName",
					label: "English legal name",
					complete: completeness.data.hasLegalName,
				},
				{
					key: "hasLegalForm",
					label: "Legal form",
					complete: completeness.data.hasLegalForm,
				},
				{
					key: "hasCompanyIdentifier",
					label: "Company registration identifier",
					complete: completeness.data.hasCompanyIdentifier,
				},
				{
					key: "hasFinancialYear",
					label: "Financial year",
					complete: completeness.data.hasFinancialYear,
				},
				{
					key: "hasRegisteredActivity",
					label: "Registered activity",
					complete: completeness.data.hasRegisteredActivity,
				},
				{
					key: "hasRegisteredAddress",
					label: "Registered office",
					complete: completeness.data.hasRegisteredAddress,
				},
			],
		},
	};
}

async function loadLegalPresence(input: {
	legalCompanyId: string;
	queryOptions: ReturnType<typeof createCorporateAdministrationQueryOptions>;
	dependencies: CorporateAdministrationIdentityDependencies;
}) {
	const today = new Date().toISOString().slice(0, 10);
	const establishments = await listLegalEstablishmentsAsOf(
		{ legalCompanyId: input.legalCompanyId, asOf: today },
		input.queryOptions,
		{ establishmentStore: input.dependencies.establishmentStore },
	);
	if (!establishments.ok) {
		return establishments;
	}
	const addressTypes = [
		"registered_office",
		"service_address",
		"place_of_business",
	] as const;
	const scopes = [null, ...establishments.data.map((item) => item.id)];
	const [addressResults, premises] = await Promise.all([
		Promise.all(
			scopes.flatMap((legalEstablishmentId) =>
				addressTypes.map((addressType) =>
					findRegisteredAddressAsOf(
						{
							legalCompanyId: input.legalCompanyId,
							legalEstablishmentId,
							addressType,
							asOf: today,
						},
						input.queryOptions,
						{ establishmentStore: input.dependencies.establishmentStore },
					),
				),
			),
		),
		listPremisesAsOf(
			{ legalCompanyId: input.legalCompanyId, asOf: today },
			input.queryOptions,
			{ establishmentStore: input.dependencies.establishmentStore },
		),
	]);
	const failedAddress = addressResults.find((result) => !result.ok);
	if (failedAddress !== undefined && !failedAddress.ok) {
		return failedAddress;
	}
	if (!premises.ok) {
		return premises;
	}
	return {
		ok: true as const,
		establishments: establishments.data.map((item) => ({
			id: item.id,
			type: item.establishmentType,
			jurisdictionCode: item.jurisdictionCode,
			registrationIdentifier: item.registrationIdentifier,
			displayName: item.displayName,
			status: item.currentStatus,
			registeredFrom: item.registeredFrom,
			version: item.version,
		})),
		registeredAddresses: addressResults.flatMap((result) =>
			result.ok && result.data !== null
				? [
						{
							id: result.data.id,
							type: result.data.addressType,
							scope: result.data.legalEstablishmentId ?? "Legal company",
							address: [
								result.data.address.line1,
								result.data.address.city,
								result.data.address.postalCode,
							]
								.filter((part) => part !== null)
								.join(", "),
							effectiveFrom: result.data.effectiveFrom,
						},
					]
				: [],
		),
		premises: premises.data.map((item) => ({
			id: item.id,
			type: item.premiseType,
			displayName: item.displayName,
			address: [item.address.line1, item.address.city, item.address.postalCode]
				.filter((part) => part !== null)
				.join(", "),
			status: item.status,
			effectiveFrom: item.effectiveFrom,
			version: item.version,
		})),
	};
}

type CorporateAdministrationIdentityDependencies = ReturnType<
	typeof createCorporateAdministrationCompanyDependencies
>;

async function loadLegalCompanyIdentity(input: {
	legalCompanyId: string;
	queryOptions: ReturnType<typeof createCorporateAdministrationQueryOptions>;
	dependencies: CorporateAdministrationIdentityDependencies;
}): Promise<
	| Readonly<{
			ok: true;
			names: readonly LegalCompanyIdentityName[];
			legalForms: readonly LegalCompanyIdentityLegalForm[];
			identifiers: readonly LegalCompanyIdentityIdentifier[];
			financialYears: readonly LegalCompanyIdentityFinancialYear[];
			activities: readonly LegalCompanyIdentityActivity[];
	  }>
	| Readonly<{ ok: false; message: string }>
> {
	const today = new Date().toISOString().slice(0, 10);
	const [names, legalForm, identifiers, financialYear, activities] =
		await Promise.all([
			listCompanyNames(
				{
					legalCompanyId: input.legalCompanyId,
					includeFormer: true,
					pageSize: 50,
				},
				input.queryOptions,
				{
					store: input.dependencies.store,
					nameStore: input.dependencies.nameStore,
				},
			),
			findCompanyLegalFormAsOf(
				{ legalCompanyId: input.legalCompanyId, asOf: today },
				input.queryOptions,
				{
					store: input.dependencies.store,
					legalFormStore: input.dependencies.legalFormStore,
				},
			),
			listCompanyIdentifiers(
				{
					legalCompanyId: input.legalCompanyId,
					includeRetired: true,
					pageSize: 50,
				},
				input.queryOptions,
				{
					store: input.dependencies.store,
					identifierStore: input.dependencies.identifierStore,
				},
			),
			findCompanyFinancialYearAsOf(
				{ legalCompanyId: input.legalCompanyId, asOf: today },
				input.queryOptions,
				{
					store: input.dependencies.store,
					financialYearStore: input.dependencies.financialYearStore,
				},
			),
			listCompanyActivitiesAsOf(
				{ legalCompanyId: input.legalCompanyId, asOf: today },
				input.queryOptions,
				{
					store: input.dependencies.store,
					activityStore: input.dependencies.activityStore,
				},
			),
		]);

	const failed = [
		names,
		legalForm,
		identifiers,
		financialYear,
		activities,
	].find((result) => !result.ok);
	if (failed !== undefined && !failed.ok) {
		return { ok: false, message: LEGAL_COMPANY_IDENTITY_UNAVAILABLE_MESSAGE };
	}
	if (
		!(
			names.ok &&
			legalForm.ok &&
			identifiers.ok &&
			financialYear.ok &&
			activities.ok
		)
	) {
		return { ok: false, message: LEGAL_COMPANY_IDENTITY_UNAVAILABLE_MESSAGE };
	}

	return {
		ok: true,
		names: names.data.items.map((name) => ({
			companyNameId: name.id,
			nameType: name.nameType,
			languageCode: name.languageCode,
			displayName: name.displayName,
			effectiveFrom: name.effectiveFrom,
			effectiveTo: name.effectiveTo,
			status: name.status,
			version: null,
		})),
		legalForms:
			legalForm.data === null
				? []
				: [
						{
							legalFormHistoryId: legalForm.data.id,
							jurisdictionCode: legalForm.data.jurisdictionCode,
							entityTypeCode: legalForm.data.entityTypeCode,
							legalFormCode: legalForm.data.legalFormCode,
							effectiveFrom: legalForm.data.effectiveFrom,
							effectiveTo: legalForm.data.effectiveTo,
							status: legalForm.data.status,
							version: legalForm.data.version,
						},
					],
		identifiers: identifiers.data.items.map((identifier) => ({
			companyIdentifierId: identifier.id,
			identifierType: identifier.identifierType,
			jurisdictionCode: identifier.jurisdictionCode,
			issuingAuthorityCode: identifier.issuingAuthorityCode,
			displayValue: identifier.identifierValue,
			effectiveFrom: identifier.effectiveFrom,
			effectiveTo: identifier.effectiveTo,
			status: identifier.status,
			version: null,
		})),
		financialYears:
			financialYear.data === null
				? []
				: [
						{
							companyFinancialYearId: financialYear.data.id,
							fiscalYearStartMonth: financialYear.data.fiscalYearStartMonth,
							fiscalYearStartDay: financialYear.data.fiscalYearStartDay,
							reportingCurrencyCode: financialYear.data.reportingCurrencyCode,
							effectiveFrom: financialYear.data.effectiveFrom,
							effectiveTo: financialYear.data.effectiveTo,
							status: financialYear.data.status,
							version: financialYear.data.version,
						},
					],
		activities: activities.data.map((activity) => ({
			companyActivityId: activity.id,
			activityCode: activity.activityCode,
			classification: activity.classification,
			jurisdictionCode: activity.jurisdictionCode,
			regulatorCode: activity.regulatorCode,
			description: activity.description,
			effectiveFrom: activity.effectiveFrom,
			effectiveTo: activity.effectiveTo,
			status: activity.status,
			version: activity.version,
		})),
	};
}
