import { authServer } from "@afenda/auth";
import {
	ITEM_TYPES,
	listChangeRequests,
	listItemGroups,
	listItems,
	listItemTemplateAttributeOptions,
	listItemTemplateAttributes,
	listItemTemplates,
	listItemVariantsByTemplate,
	listParties,
	listPaymentTerms,
	listTaxRegistrations,
	listWarehouses,
	type MergePartiesChangePayload,
	PARTY_KINDS,
	PARTY_ROLE_CODES,
	TAX_REGISTRATION_TYPES,
	WAREHOUSE_LOCATION_TYPES,
} from "@afenda/master-data";
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
} from "@afenda/ui-system";

import { activateItemTemplateFormAction } from "@/app/actions/activate-item-template";
import { requireAnyPermission } from "@/features/auth/require-permission";
import { AddItemTemplateAttributeForm } from "@/features/master-data/add-item-template-attribute-form";
import { AddItemTemplateAttributeOptionForm } from "@/features/master-data/add-item-template-attribute-option-form";
import { ChangeRequestPanel } from "@/features/master-data/change-request-panel";
import { CreateItemForm } from "@/features/master-data/create-item-form";
import { CreateItemGroupForm } from "@/features/master-data/create-item-group-form";
import { CreateItemTemplateForm } from "@/features/master-data/create-item-template-form";
import { CreateItemVariantForm } from "@/features/master-data/create-item-variant-form";
import { CreatePartyForm } from "@/features/master-data/create-party-form";
import { CreatePartyRoleForm } from "@/features/master-data/create-party-role-form";
import { CreatePaymentTermForm } from "@/features/master-data/create-payment-term-form";
import { CreateTaxRegistrationForm } from "@/features/master-data/create-tax-registration-form";
import { CreateWarehouseForm } from "@/features/master-data/create-warehouse-form";
import { MasterDataImportPanel } from "@/features/master-data/master-data-import-panel";
import { MasterDataSearchPanel } from "@/features/master-data/master-data-search-panel";
import { MasterRootLifecycleForm } from "@/features/master-data/master-root-lifecycle-form";
import { MergePartiesForm } from "@/features/master-data/merge-parties-form";
import { PaymentTermLifecycleForm } from "@/features/master-data/payment-term-lifecycle-form";
import { TaxRegistrationLifecycleForm } from "@/features/master-data/tax-registration-lifecycle-form";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { ITEM_TEMPLATE_ATTRIBUTE_FORM_DATA_TYPES } from "@/lib/erp/master-data-item-template-ui-policy";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";
const TAX_JURISDICTION_COUNTRY_CODES = ["MY", "SG", "US"] as const;
const MASTER_DATA_WORKSPACE_READ_PERMISSIONS = [
	"master_data.party_read",
	"master_data.item_read",
	"master_data.warehouse_read",
	"master_data.payment_term_read",
	"master_data.tax_registration_read",
	"master_data.change_request_read",
	"master_data.search_read",
] as const;

interface MasterDataShellProps {
	/** Operator admin chrome vs client workspace. */
	surface: "admin" | "client";
}

function loadWhenAllowed<T>(
	allowed: boolean,
	load: () => Promise<T>,
): Promise<T | null> {
	return allowed ? load() : Promise.resolve(null);
}

function getMasterDataSession(surface: MasterDataShellProps["surface"]) {
	return surface === "admin"
		? authServer.session.requireRole("operator")
		: authServer.session.get();
}

/**
 * Master-data console — RSC load via package commands; mutations via Actions.
 */
export async function MasterDataShell({ surface }: MasterDataShellProps) {
	const session = await getMasterDataSession(surface);

	await requireAnyPermission(session, MASTER_DATA_WORKSPACE_READ_PERMISSIONS);
	const [
		canReadParties,
		canReadItems,
		canReadWarehouses,
		canReadPaymentTerms,
		canReadTaxRegistrations,
		canReadChangeRequests,
		canSearch,
		canCreateParties,
		canManagePartyRoles,
		canManageVariantDefiningAttributes,
		canManageTemplateOptions,
		canManageVariantAttributes,
		canSubmitChangeRequests,
		canApproveChangeRequests,
		canApplyPartyActivation,
		canMergeParties,
		canManagePaymentTerms,
		canManageTaxRegistrations,
		canManageTemplates,
		canManageItemGroups,
		canCreateItems,
		canActivateItems,
		canSuspendItems,
		canArchiveItems,
		canManageWarehouses,
		canImportValidate,
		canImportApply,
	] = await Promise.all([
		sessionHasPermission(session, "master_data.party_read"),
		sessionHasPermission(session, "master_data.item_read"),
		sessionHasPermission(session, "master_data.warehouse_read"),
		sessionHasPermission(session, "master_data.payment_term_read"),
		sessionHasPermission(session, "master_data.tax_registration_read"),
		sessionHasPermission(session, "master_data.change_request_read"),
		sessionHasPermission(session, "master_data.search_read"),
		sessionHasPermission(session, "master_data.party_create"),
		sessionHasPermission(session, "master_data.party_role_manage"),
		sessionHasPermission(
			session,
			"master_data.item_variant_defining_attribute_manage",
		),
		sessionHasPermission(session, "master_data.item_template_option_manage"),
		sessionHasPermission(session, "master_data.item_variant_attribute_manage"),
		sessionHasPermission(session, "master_data.change_request_submit"),
		sessionHasPermission(session, "master_data.change_request_approve"),
		sessionHasPermission(session, "master_data.party_activate"),
		sessionHasPermission(session, "master_data.party_merge"),
		sessionHasPermission(session, "master_data.payment_term_manage"),
		sessionHasPermission(session, "master_data.tax_registration_manage"),
		sessionHasPermission(session, "master_data.template_manage"),
		sessionHasPermission(session, "master_data.item_extension_manage"),
		sessionHasPermission(session, "master_data.item_create"),
		sessionHasPermission(session, "master_data.item_activate"),
		sessionHasPermission(session, "master_data.item_suspend"),
		sessionHasPermission(session, "master_data.item_archive"),
		sessionHasPermission(session, "master_data.warehouse_manage"),
		sessionHasPermission(session, "master_data.import_validate"),
		sessionHasPermission(session, "master_data.import_apply"),
	]);
	const canManageItemLifecycle =
		canActivateItems || canSuspendItems || canArchiveItems;
	const masterDataAuth = { authorization: createMasterDataAuthorizationPort() };
	const listActor = {
		organizationId: session.orgId,
		actorUserId: session.userId,
	};

	const [
		partiesResult,
		itemsResult,
		groupsResult,
		warehousesResult,
		paymentTermsResult,
		taxRegistrationsResult,
		changeRequestsResult,
		templatesResult,
	] = await Promise.all([
		loadWhenAllowed(canReadParties, () =>
			listParties({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadItems, () =>
			listItems({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadItems, () =>
			listItemGroups({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadWarehouses, () =>
			listWarehouses({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadPaymentTerms, () =>
			listPaymentTerms({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadTaxRegistrations, () =>
			listTaxRegistrations({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadChangeRequests, () =>
			listChangeRequests({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
		loadWhenAllowed(canReadItems, () =>
			listItemTemplates({ ...listActor, pageSize: 50 }, masterDataAuth),
		),
	]);

	const parties = partiesResult?.ok ? partiesResult.data : [];
	const items = itemsResult?.ok ? itemsResult.data : [];
	const itemGroups = groupsResult?.ok ? groupsResult.data : [];
	const warehouses = warehousesResult?.ok ? warehousesResult.data : [];
	const paymentTerms = paymentTermsResult?.ok ? paymentTermsResult.data : [];
	const taxRegistrations = taxRegistrationsResult?.ok
		? taxRegistrationsResult.data
		: [];
	const changeRequests = changeRequestsResult?.ok
		? changeRequestsResult.data
		: [];
	const templates = templatesResult?.ok ? templatesResult.data : [];
	const templatePanels = await Promise.all(
		templates.map(async (template) => {
			const [attrsResult, variantsResult] = await Promise.all([
				listItemTemplateAttributes(
					{
						...listActor,
						templateId: template.id,
					},
					masterDataAuth,
				),
				listItemVariantsByTemplate(
					{
						...listActor,
						templateId: template.id,
						pageSize: 50,
					},
					masterDataAuth,
				),
			]);
			const attributes = attrsResult.ok ? attrsResult.data : [];
			const variants = variantsResult.ok ? variantsResult.data : [];
			const withOptions = await Promise.all(
				attributes.map(async (attribute) => {
					if (
						attribute.dataType !== "single_option" &&
						attribute.dataType !== "multiple_option"
					) {
						return {
							...attribute,
							options: [] as Array<{ id: string; label: string }>,
						};
					}
					const optionsResult = await listItemTemplateAttributeOptions(
						{
							...listActor,
							attributeId: attribute.id,
						},
						masterDataAuth,
					);
					const options = optionsResult.ok
						? optionsResult.data.map((option) => ({
								id: option.id,
								label: `${option.code} · ${option.label}`,
							}))
						: [];
					return { ...attribute, options };
				}),
			);
			return { template, attributes: withOptions, variants };
		}),
	);
	const draftOptionAttributes = templatePanels.flatMap(
		({ template, attributes }) =>
			template.status === "draft"
				? attributes
						.filter(
							(attribute) =>
								attribute.dataType === "single_option" ||
								attribute.dataType === "multiple_option",
						)
						.map((attribute) => ({
							id: attribute.id,
							label: `${template.code} · ${attribute.code} · ${attribute.name}`,
						}))
				: [],
	);
	const variantRows = templatePanels.flatMap(({ template, variants }) =>
		variants.map((variant) => ({
			templateCode: template.code,
			variant,
		})),
	);
	const loadError = [
		partiesResult,
		itemsResult,
		groupsResult,
		warehousesResult,
		paymentTermsResult,
		taxRegistrationsResult,
		changeRequestsResult,
		templatesResult,
	].some((result) => result !== null && !result.ok);

	const partyOptions = parties.map((party) => ({
		id: party.id,
		label: `${party.code} · ${party.name}`,
		version: party.version,
		status: party.status,
	}));
	const mergePartyOptions = parties
		.filter((party) => party.mergedIntoId === null)
		.map((party) => ({
			id: party.id,
			label: `${party.code} · ${party.name} · v${party.version}`,
			version: party.version,
		}));
	const submittedRequests = changeRequests
		.filter((request) => request.status === "submitted")
		.map((request) => ({
			id: request.id,
			code: request.code,
			commandKind: request.commandKind,
			status: request.status,
			version: request.version,
			subjectEntityId: request.subjectEntityId,
			label: `${request.code} · ${request.commandKind} · v${request.version}`,
		}));
	const approvedActivateRequests = changeRequests
		.filter(
			(request) =>
				request.status === "approved" &&
				request.commandKind === "activate_party",
		)
		.map((request) => ({
			id: request.id,
			code: request.code,
			commandKind: request.commandKind,
			status: request.status,
			version: request.version,
			subjectEntityId: request.subjectEntityId,
			label: `${request.code} · activate · v${request.version}`,
		}));
	const approvedMergeRequests = changeRequests
		.filter(
			(request) =>
				request.status === "approved" &&
				request.commandKind === "merge_parties",
		)
		.map((request) => {
			const payload = request.payload as MergePartiesChangePayload;
			return {
				id: request.id,
				label: `${request.code} · merge · v${request.version}`,
				sourcePartyId: payload.sourcePartyId,
				targetPartyId: payload.targetPartyId,
			};
		});

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<header className="space-y-2">
				<p className="text-muted-foreground text-sm">
					{surface === "admin" ? "Org admin" : "Client workspace"}
				</p>
				<h1 className="font-semibold text-2xl tracking-tight">Master data</h1>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Organization parties, items, item templates/variants, warehouses, and
					payment terms. Writes go through `@afenda/master-data` only.
				</p>
			</header>

			{loadError ? (
				<Alert role="alert" variant="destructive">
					<AlertTitle>Catalog load incomplete</AlertTitle>
					<AlertDescription>
						One or more master-data lists failed. Retry or contact an admin.
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid gap-6 lg:grid-cols-2">
				{canSearch ? (
					<Card>
						<CardHeader>
							<CardTitle>Search</CardTitle>
							<CardDescription>
								Derived FTS index — never authorizes writes.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<MasterDataSearchPanel />
						</CardContent>
					</Card>
				) : null}
				<Card>
					<CardHeader>
						<CardTitle>Party import</CardTitle>
						<CardDescription>
							Validate dry-run, then apply with import_apply. Max 100 rows.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<MasterDataImportPanel
							canImportApply={canImportApply}
							canImportValidate={canImportValidate}
						/>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create party</CardTitle>
						<CardDescription>
							Draft party root. Add a commercial role before activation.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreatePartyForm
							canManage={canCreateParties}
							partyKinds={PARTY_KINDS}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Party roles</CardTitle>
						<CardDescription>
							Closed role catalog (customer, supplier, …).
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreatePartyRoleForm
							canManage={canManagePartyRoles}
							parties={partyOptions}
							roleCodes={PARTY_ROLE_CODES}
						/>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>MDG change requests</CardTitle>
					<CardDescription>
						Maker-checker for activate — submit, approve/reject, then apply.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChangeRequestPanel
						approvedActivateRequests={approvedActivateRequests}
						canApply={canApplyPartyActivation}
						canApprove={canApproveChangeRequests}
						canSubmit={canSubmitChangeRequests}
						parties={partyOptions}
						submittedRequests={submittedRequests}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Governed merge</CardTitle>
					<CardDescription>
						MDG-gated merge — submit a change request, then apply after
						approval. Preserves former codes; never auto-merges.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<MergePartiesForm
						approvedMergeRequests={approvedMergeRequests}
						canManage={canMergeParties}
						parties={mergePartyOptions}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Parties</CardTitle>
					<CardDescription>
						{parties.length} loaded (page size ≤ 50).
					</CardDescription>
				</CardHeader>
				<CardContent>
					{parties.length === 0 ? (
						<p className="text-muted-foreground text-sm">No parties yet.</p>
					) : (
						<ul className="divide-y divide-border">
							{parties.map((party) => (
								<li
									className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
									key={party.id}
								>
									<span>
										<Code>{party.code}</Code> {party.name}
									</span>
									<span className="text-muted-foreground">
										{party.partyKind} · {party.status} · v{party.version}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create payment term</CardTitle>
						<CardDescription>
							Org commercial default (net days). Referenced later by
							transactional modules — not SO/PO lines here.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreatePaymentTermForm canManage={canManagePaymentTerms} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Payment terms</CardTitle>
						<CardDescription>
							{paymentTerms.length} loaded (page size ≤ 50).
						</CardDescription>
					</CardHeader>
					<CardContent>
						{paymentTerms.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No payment terms yet.
							</p>
						) : (
							<ul className="divide-y divide-border">
								{paymentTerms.map((term) => (
									<li
										className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
										key={term.id}
									>
										<span>
											<Code>{term.code}</Code> {term.name}
										</span>
										<span className="text-muted-foreground">
											net {term.netDays}d · {term.status} · v{term.version}
										</span>
									</li>
								))}
							</ul>
						)}
						<div className="mt-6 border-border border-t pt-4">
							<p className="mb-3 font-medium text-sm">Lifecycle</p>
							<PaymentTermLifecycleForm
								canManage={canManagePaymentTerms}
								terms={paymentTerms}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create tax registration</CardTitle>
						<CardDescription>
							Party-linked tax identity (jurisdiction + type + number). No rate
							or returns engines here.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateTaxRegistrationForm
							canManage={canManageTaxRegistrations}
							countryCodes={TAX_JURISDICTION_COUNTRY_CODES}
							parties={partyOptions.map((party) => ({
								id: party.id,
								label: party.label,
							}))}
							registrationTypes={TAX_REGISTRATION_TYPES}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Tax registrations</CardTitle>
						<CardDescription>
							{taxRegistrations.length} loaded (page size ≤ 50).
						</CardDescription>
					</CardHeader>
					<CardContent>
						{taxRegistrations.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No tax registrations yet.
							</p>
						) : (
							<ul className="divide-y divide-border">
								{taxRegistrations.map((row) => (
									<li
										className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
										key={row.id}
									>
										<span>
											<Code>{row.taxType}</Code> {row.maskedRegistrationNumber}
										</span>
										<span className="text-muted-foreground">
											{row.status} · v{row.version}
										</span>
									</li>
								))}
							</ul>
						)}
						<div className="mt-6 border-border border-t pt-4">
							<p className="mb-3 font-medium text-sm">Lifecycle</p>
							<TaxRegistrationLifecycleForm
								canManage={canManageTaxRegistrations}
								registrations={taxRegistrations}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create item template</CardTitle>
						<CardDescription>
							Defines allowed attributes. Concrete sellable variants are
							separate `md_item` rows — never a JSON bag.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<CreateItemTemplateForm canManage={canManageTemplates} />
						<AddItemTemplateAttributeForm
							canManage={canManageVariantDefiningAttributes}
							dataTypes={ITEM_TEMPLATE_ATTRIBUTE_FORM_DATA_TYPES}
							draftTemplates={templates
								.filter((template) => template.status === "draft")
								.map((template) => ({
									id: template.id,
									label: `${template.code} · ${template.name}`,
								}))}
						/>
						<AddItemTemplateAttributeOptionForm
							canManage={canManageTemplateOptions}
							draftOptionAttributes={draftOptionAttributes}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Item templates</CardTitle>
						<CardDescription>
							{templates.length} loaded. Activate when attributes (and options)
							are ready.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{templates.length === 0 ? (
							<p className="text-muted-foreground text-sm">No templates yet.</p>
						) : (
							<ul className="divide-y divide-border">
								{templatePanels.map(({ template, attributes }) => (
									<li className="space-y-2 py-3 text-sm" key={template.id}>
										<div className="flex flex-wrap items-baseline justify-between gap-2">
											<span>
												<Code>{template.code}</Code> {template.name}
											</span>
											<span className="text-muted-foreground">
												{template.status} · v{template.version} ·{" "}
												{attributes.length} attrs
											</span>
										</div>
										{attributes.length > 0 ? (
											<ul className="space-y-1 text-muted-foreground">
												{attributes.map((attribute) => (
													<li key={attribute.id}>
														<Code>{attribute.code}</Code> {attribute.name} (
														{attribute.dataType}
														{attribute.dataType === "single_option" ||
														attribute.dataType === "multiple_option"
															? ` · ${attribute.options.length} options`
															: ""}
														)
													</li>
												))}
											</ul>
										) : null}
										{canManageTemplates && template.status === "draft" ? (
											<form action={activateItemTemplateFormAction}>
												<input name="id" type="hidden" value={template.id} />
												<input
													name="expectedVersion"
													type="hidden"
													value={template.version}
												/>
												<Button size="sm" type="submit" variant="outline">
													Activate template
												</Button>
											</form>
										) : null}
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create item variant</CardTitle>
						<CardDescription>
							Own item id + code under an active template. Attribute
							combinations are unique while live; retired variants stay
							resolvable by id.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateItemVariantForm
							baseUomId={EA_UOM_ID}
							canManage={canManageVariantAttributes}
							itemGroups={itemGroups.map((group) => ({
								id: group.id,
								label: `${group.code} · ${group.name}`,
							}))}
							itemTypes={ITEM_TYPES}
							templates={templatePanels
								.filter(({ template }) => template.status === "active")
								.map(({ template, attributes }) => ({
									id: template.id,
									label: `${template.code} · ${template.name}`,
									attributes: attributes.map((attribute) => ({
										id: attribute.id,
										code: attribute.code,
										name: attribute.name,
										dataType: attribute.dataType,
										options: attribute.options,
									})),
								}))}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Item variants</CardTitle>
						<CardDescription>
							{variantRows.length} loaded across templates (by item identity).
						</CardDescription>
					</CardHeader>
					<CardContent>
						{variantRows.length === 0 ? (
							<p className="text-muted-foreground text-sm">No variants yet.</p>
						) : (
							<ul className="divide-y divide-border">
								{variantRows.map(({ templateCode, variant }) => (
									<li
										className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
										key={variant.id}
									>
										<span>
											<Code>{variant.item.code}</Code> {variant.item.name}
										</span>
										<span className="text-muted-foreground">
											{templateCode} · {variant.item.status}
											{variant.retiredAt === null
												? ""
												: " · membership retired"}
										</span>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create item group</CardTitle>
						<CardDescription>
							Draft group for catalog hierarchy. Activate before attaching items
							that require an active group.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateItemGroupForm canManage={canManageItemGroups} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Item groups</CardTitle>
						<CardDescription>
							{itemGroups.length} loaded (page size ≤ 50).
						</CardDescription>
					</CardHeader>
					<CardContent>
						{itemGroups.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No item groups yet.
							</p>
						) : (
							<ul className="divide-y divide-border">
								{itemGroups.map((group) => (
									<li
										className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
										key={group.id}
									>
										<span>
											<Code>{group.code}</Code> {group.name}
										</span>
										<span className="text-muted-foreground">
											{group.status} · v{group.version}
										</span>
									</li>
								))}
							</ul>
						)}
						<div className="mt-6 border-border border-t pt-4">
							<p className="mb-3 font-medium text-sm">Lifecycle</p>
							<MasterRootLifecycleForm
								canManage={canManageItemGroups}
								entity="itemGroup"
								options={itemGroups.map((group) => ({
									id: group.id,
									label: `${group.code} · ${group.name}`,
									version: group.version,
									status: group.status,
								}))}
								title="Item group"
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create item</CardTitle>
						<CardDescription>
							Draft catalog item (non-variant). Variants use Create item variant
							under an active template.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateItemForm
							baseUomId={EA_UOM_ID}
							canManage={canCreateItems}
							itemGroups={itemGroups.map((group) => ({
								id: group.id,
								label: `${group.code} · ${group.name}`,
							}))}
							itemTypes={ITEM_TYPES}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Items</CardTitle>
						<CardDescription>
							{items.length} loaded (page size ≤ 50).
						</CardDescription>
					</CardHeader>
					<CardContent>
						{items.length === 0 ? (
							<p className="text-muted-foreground text-sm">No items yet.</p>
						) : (
							<ul className="divide-y divide-border">
								{items.map((item) => (
									<li
										className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
										key={item.id}
									>
										<span>
											<Code>{item.code}</Code> {item.name}
										</span>
										<span className="text-muted-foreground">
											{item.itemType} · {item.status} · v{item.version}
										</span>
									</li>
								))}
							</ul>
						)}
						<div className="mt-6 border-border border-t pt-4">
							<p className="mb-3 font-medium text-sm">Lifecycle</p>
							<MasterRootLifecycleForm
								canManage={canManageItemLifecycle}
								entity="item"
								options={items.map((item) => ({
									id: item.id,
									label: `${item.code} · ${item.name}`,
									version: item.version,
									status: item.status,
								}))}
								title="Item"
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Create warehouse</CardTitle>
						<CardDescription>
							Draft stock location. Inventory modules reference active
							warehouses only.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateWarehouseForm
							canManage={canManageWarehouses}
							locationTypes={WAREHOUSE_LOCATION_TYPES}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Warehouses</CardTitle>
						<CardDescription>
							{warehouses.length} loaded (page size ≤ 50).
						</CardDescription>
					</CardHeader>
					<CardContent>
						{warehouses.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No warehouses yet.
							</p>
						) : (
							<ul className="divide-y divide-border">
								{warehouses.map((warehouse) => (
									<li
										className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
										key={warehouse.id}
									>
										<span>
											<Code>{warehouse.code}</Code> {warehouse.name}
										</span>
										<span className="text-muted-foreground">
											{warehouse.locationType} · {warehouse.status} · v
											{warehouse.version}
										</span>
									</li>
								))}
							</ul>
						)}
						<div className="mt-6 border-border border-t pt-4">
							<p className="mb-3 font-medium text-sm">Lifecycle</p>
							<MasterRootLifecycleForm
								canManage={canManageWarehouses}
								entity="warehouse"
								options={warehouses.map((warehouse) => ({
									id: warehouse.id,
									label: `${warehouse.code} · ${warehouse.name}`,
									version: warehouse.version,
									status: warehouse.status,
								}))}
								title="Warehouse"
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
