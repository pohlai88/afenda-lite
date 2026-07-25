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
	getLegalCompany,
	listLegalCompanies,
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
import { LegalCompanyDetail } from "@/features/corporate-administration/legal-company-detail";
import { LegalCompanyTable } from "@/features/corporate-administration/legal-company-table";
import { UpdateLegalCompanyForm } from "@/features/corporate-administration/update-legal-company-form";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type CorporateAdministrationShellProps = {
	surface: "admin" | "client";
};

export async function CorporateAdministrationShell({
	surface,
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
	] = await Promise.all([
		sessionHasPermission(session, CA_PERMISSION_COMPANY_CREATE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_UPDATE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_ACTIVATE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_SUSPEND),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_DISSOLVE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_ARCHIVE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_NAME_MANAGE),
		sessionHasPermission(session, CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE),
	]);

	const options = createCorporateAdministrationCommandOptions();
	const [companiesResult, partiesResult] = await Promise.all([
		listLegalCompanies(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
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
	const selectedCompany = firstDraft ?? companies[0];
	let selectedDetail = null;
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

			{selectedDetail ? <LegalCompanyDetail company={selectedDetail} /> : null}

			{surface === "admin" && canUpdate && selectedDetail ? (
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
			selectedDetail?.status === "draft" ? (
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

			{surface === "admin" && selectedDetail && (canSuspend || canDissolve || canArchive) ? (
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
