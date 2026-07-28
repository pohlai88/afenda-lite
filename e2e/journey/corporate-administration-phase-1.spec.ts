import { randomUUID } from "node:crypto";
import type { Locator, Page } from "@playwright/test";

import { loginAsClient } from "@/testing/e2e/flows";
import { createNeonSql, type NeonSql } from "@/testing/e2e/neon-sql";
import { expect, test } from "@/testing/e2e/playwright-base";

type MasterDataSeed = Readonly<{
	partyId: string;
	partyAddressId: string;
}>;

type LegalCompanyProof = Readonly<{
	id: string;
	state: string;
	version: number;
	activeStatusCount: number;
}>;

test.describe("Corporate Administration Phase 1 production journey @journey", () => {
	test.setTimeout(180_000);

	test("builds and activates a complete Phase 1 legal company through authenticated Neon-backed UI", async ({
		browser,
		page,
		workerTenant,
	}) => {
		test.skip(
			!workerTenant,
			"E2E_FACTORY_PASSWORD + DATABASE_URL required for CA Phase 1 journey",
		);
		if (!workerTenant) return;

		const runKey = `ca-p1-${workerTenant.runId}`;
		const companyCode = `CA-P1-${workerTenant.runId}`.slice(0, 64);
		const displayName = `CA Phase 1 ${workerTenant.runId}`;
		const registeredName = `${displayName} Sdn Bhd`;
		const sql = await createNeonSql(requireDatabaseUrl());
		await seedClientCaAccess(sql, {
			organizationId: workerTenant.orgA.id,
			userId: workerTenant.client.userId,
			actorUserId: workerTenant.operator.userId,
		});
		await seedForeignClientMembership(sql, {
			organizationId: workerTenant.orgB.id,
			userId: workerTenant.invitee.userId,
			actorUserId: workerTenant.foreignOwner.userId,
		});
		const masterData = await seedMasterDataPrerequisites(sql, {
			organizationId: workerTenant.orgA.id,
			actorUserId: workerTenant.client.userId,
			runKey,
		});

		try {
			await loginAsClient(page, workerTenant.client);
			await page.goto("/client/corporate-administration");

			await expect(
				page.getByRole("heading", { name: "Corporate Administration" }),
			).toBeVisible();
			await registerDraftCompany({
				page,
				companyCode,
				displayName,
				homeJurisdiction: "MY",
				partyId: masterData.partyId,
			});
			await setJurisdictionProfile(page, 1);
			await addCompanyName({ page, registeredName, runKey });
			await setLegalForm({ page, runKey });
			await registerIdentifier({ page, runKey });
			await setFinancialYear({ page, runKey });
			await registerActivity({ page, runKey });
			await setRegisteredOffice({ page, runKey });

			await expect(page.getByText("Activation ready")).toBeVisible();
			const activateForm = formWithSubmit(page, "Activate");
			await activateForm
				.getByLabel("Source document")
				.fill(`${runKey}-browser-activation`);
			await activateForm.getByRole("button", { name: "Activate" }).click();
			await expect(page.getByText(/Active · v\d+/)).toBeVisible();
			await page.reload();
			await expect(page.getByText(/Active · v\d+/)).toBeVisible();
			await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();

			const proof = await readLegalCompanyProof(sql, {
				organizationId: workerTenant.orgA.id,
				companyCode,
			});
			expect(proof.state).toBe("active");
			expect(proof.activeStatusCount).toBe(1);

			const foreignContext = await browser.newContext();
			const foreignPage = await foreignContext.newPage();
			try {
				await loginAsClient(foreignPage, workerTenant.invitee);
				await foreignPage.goto("/client/corporate-administration");
				await expect(
					foreignPage.getByRole("heading", {
						name: "Corporate Administration",
					}),
				).toBeVisible();
				await expect(foreignPage.getByText(displayName)).toHaveCount(0);
			} finally {
				await foreignContext.close();
			}
		} finally {
			await cleanupCorporateAdministrationJourney(sql, {
				organizationId: workerTenant.orgA.id,
				partyId: masterData.partyId,
				partyAddressId: masterData.partyAddressId,
			});
		}
	});
});

async function seedClientCaAccess(
	sql: NeonSql,
	input: { organizationId: string; userId: string; actorUserId: string },
): Promise<void> {
	const roles = (await sql`
		SELECT id
		FROM platform_role
		WHERE template_key = 'org_admin'
			AND is_system_template = true
			AND organization_id IS NULL
		LIMIT 1
	`) as Array<{ id: string }>;
	const roleId = roles[0]?.id;
	if (!roleId) {
		throw new Error("Expected system org_admin platform role to exist.");
	}
	await sql`
		INSERT INTO platform_role_assignment (
			user_id, organization_id, role_id, scope_type, scope_id,
			active, granted_by, created_at, updated_at
		)
		VALUES (
			${input.userId}, ${input.organizationId}, ${roleId}::uuid,
			'organization', ${input.organizationId}, true,
			${input.actorUserId}, NOW(), NOW()
		)
		ON CONFLICT DO NOTHING
	`;
}

async function seedForeignClientMembership(
	sql: NeonSql,
	input: { organizationId: string; userId: string; actorUserId: string },
): Promise<void> {
	await sql`
		INSERT INTO neon_auth.member (
			"organizationId", "userId", role, "createdAt"
		)
		VALUES (
			${input.organizationId}::uuid, ${input.userId}::uuid, 'member', NOW()
		)
		ON CONFLICT DO NOTHING
	`;
	await seedClientCaAccess(sql, input);
}

async function registerDraftCompany(input: {
	page: Parameters<typeof formWithSubmit>[0];
	companyCode: string;
	displayName: string;
	homeJurisdiction: string;
	partyId: string;
}): Promise<void> {
	const form = formWithSubmit(input.page, "Register draft");
	await form.getByLabel("Company code").fill(input.companyCode);
	await form.getByLabel("Display name").fill(input.displayName);
	await form
		.getByLabel("Active organization party")
		.selectOption(input.partyId);
	await form.getByLabel("Home jurisdiction").fill(input.homeJurisdiction);
	await form.getByRole("button", { name: "Register draft" }).click();
	await expect(input.page.getByText("Draft registered.")).toBeVisible();
	await input.page.reload();
	await expect(
		input.page
			.getByRole("cell", { name: new RegExp(input.displayName) })
			.first(),
	).toBeVisible();
}

async function setJurisdictionProfile(
	page: Parameters<typeof formWithSubmit>[0],
	expectedCompanyVersion: number,
): Promise<void> {
	const form = formWithSubmit(page, "Set profile");
	await form.getByLabel("Legal company draft").selectOption({ index: 1 });
	await form
		.getByLabel("Expected company version")
		.fill(String(expectedCompanyVersion));
	await form.getByLabel("Jurisdiction").fill("MY");
	await form.getByLabel("Entity type").selectOption("private_limited_company");
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form.getByRole("button", { name: "Set profile" }).click();
	await expect(page.getByText("Jurisdiction profile recorded.")).toBeVisible();
	await page.reload();
	await expect(
		page.getByText("MY · private_limited_company", { exact: true }).first(),
	).toBeVisible();
}

async function addCompanyName(input: {
	page: Parameters<typeof formWithSubmit>[0];
	registeredName: string;
	runKey: string;
}): Promise<void> {
	const form = input.page.locator('form[aria-label="Add company name"]');
	await form.getByLabel("Language").fill("en");
	await form.getByLabel("Display name").fill(input.registeredName);
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form.getByLabel("Source document").fill(`${input.runKey}-name`);
	await form.getByRole("button", { name: "Add name" }).click();
	await expect(input.page.getByText("Company name added.")).toBeVisible();
	await input.page.reload();
	await expect(input.page.getByText(input.registeredName)).toBeVisible();
}

async function setLegalForm(input: {
	page: Parameters<typeof formWithSubmit>[0];
	runKey: string;
}): Promise<void> {
	const form = input.page.locator('form[aria-label="Set company legal form"]');
	await form.getByLabel("Jurisdiction").fill("MY");
	await form.getByLabel("Entity type").fill("private_limited_company");
	await form.getByLabel("Legal form").fill("private_limited_company");
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form.getByLabel("Source document").fill(`${input.runKey}-legal-form`);
	await form.getByRole("button", { name: "Set legal form" }).click();
	await expect(input.page.getByText("Legal form changed.")).toBeVisible();
	await input.page.reload();
	await expect(
		input.page.getByRole("cell", {
			name: "private_limited_company",
			exact: true,
		}),
	).toBeVisible();
}

async function registerIdentifier(input: {
	page: Parameters<typeof formWithSubmit>[0];
	runKey: string;
}): Promise<void> {
	const form = input.page.locator(
		'form[aria-label="Register company identifier"]',
	);
	await form.getByLabel("Identifier type").selectOption("company_registration");
	await form.getByLabel("Jurisdiction").fill("MY");
	await form.getByLabel("Issuing authority").fill("SSM");
	await form.getByLabel("Identifier value").fill(`2026-${input.runKey}`);
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form.getByLabel("Source document").fill(`${input.runKey}-identifier`);
	await form.getByRole("button", { name: "Register identifier" }).click();
	await expect(input.page.getByText("Identifier registered.")).toBeVisible();
	await input.page.reload();
	await expect(input.page.getByText(`2026-${input.runKey}`)).toBeVisible();
}

async function setFinancialYear(input: {
	page: Parameters<typeof formWithSubmit>[0];
	runKey: string;
}): Promise<void> {
	const form = input.page.locator(
		'form[aria-label="Set company financial year"]',
	);
	await form.getByLabel("Start month").fill("7");
	await form.getByLabel("Start day").fill("1");
	await form.getByLabel("Reporting currency").fill("MYR");
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form
		.getByLabel("Source document")
		.fill(`${input.runKey}-financial-year`);
	await form.getByRole("button", { name: "Set financial year" }).click();
	await expect(input.page.getByText("Financial year recorded.")).toBeVisible();
	await input.page.reload();
	await expect(input.page.getByText("MYR")).toBeVisible();
}

async function registerActivity(input: {
	page: Parameters<typeof formWithSubmit>[0];
	runKey: string;
}): Promise<void> {
	const form = input.page.locator(
		'form[aria-label="Register company activity"]',
	);
	await form.getByLabel("Activity type").selectOption("regulated");
	await form.getByLabel("Activity code").fill("software_services");
	await form.getByLabel("Description").fill("Regulated software services");
	await form.getByLabel("Jurisdiction").fill("MY");
	await form.getByLabel("Regulator").fill("mcmc");
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form.getByLabel("Source document").fill(`${input.runKey}-activity`);
	await form.getByRole("button", { name: "Register activity" }).click();
	await expect(input.page.getByText("Activity registered.")).toBeVisible();
	await input.page.reload();
	await expect(input.page.getByText("software_services")).toBeVisible();
}

async function setRegisteredOffice(input: {
	page: Parameters<typeof formWithSubmit>[0];
	runKey: string;
}): Promise<void> {
	const form = formWithSubmit(input.page, "Set address");
	await form.getByLabel("Address type").selectOption("registered_office");
	await form.getByLabel("Establishment scope (optional)").selectOption("");
	await form.getByLabel("Master Data address").selectOption({ index: 1 });
	await form.getByLabel("Effective from").fill("2026-01-01");
	await form
		.locator('input[name="sourceDocumentId"]')
		.fill(`${input.runKey}-registered-office`);
	await form.getByRole("button", { name: "Set address" }).click();
	await expect(
		input.page.getByText("Statutory address recorded."),
	).toBeVisible();
	await input.page.reload();
	await expect(
		input.page.getByRole("cell", { name: "Registered office", exact: true }),
	).toBeVisible();
}

function formWithSubmit(page: Page, name: string): Locator {
	return page
		.locator("form")
		.filter({ has: page.getByRole("button", { name }) })
		.first();
}

async function seedMasterDataPrerequisites(
	sql: NeonSql,
	input: {
		organizationId: string;
		actorUserId: string;
		runKey: string;
	},
): Promise<MasterDataSeed> {
	const countryId = randomUUID();
	const languageId = randomUUID();
	const currencyId = randomUUID();
	const partyId = randomUUID();
	const partyAddressId = randomUUID();

	await sql`
		INSERT INTO ref_country (id, code, alpha3, name, active, created_at, updated_at)
		VALUES (${countryId}::uuid, 'MY', 'MYS', 'Malaysia', true, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE SET active = true, updated_at = NOW()
	`;
	await sql`
		INSERT INTO ref_language (id, code, name, active, created_at, updated_at)
		VALUES (${languageId}::uuid, 'en', 'English', true, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE SET active = true, updated_at = NOW()
	`;
	await sql`
		INSERT INTO ref_currency (id, code, name, minor_units, active, created_at, updated_at)
		VALUES (${currencyId}::uuid, 'MYR', 'Malaysian Ringgit', 2, true, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE SET active = true, updated_at = NOW()
	`;
	await sql`
		INSERT INTO md_party (
			id, organization_id, code, normalized_code, name, party_kind, status,
			version, legal_name, registration_number, created_by, updated_by,
			activated_at, activated_by, created_at, updated_at
		)
		VALUES (
			${partyId}::uuid, ${input.organizationId}, ${input.runKey},
			${input.runKey.toLowerCase()}, ${`MD Party ${input.runKey}`},
			'organization', 'active', 1, ${`MD Party ${input.runKey}`},
			${`MD-${input.runKey}`}, ${input.actorUserId}, ${input.actorUserId},
			NOW(), ${input.actorUserId}, NOW(), NOW()
		)
	`;
	await sql`
		INSERT INTO md_party_address (
			id, organization_id, party_id, address_type, purpose, line1, city,
			administrative_area, postal_code, country_id, is_primary,
			validation_status, status, version, effective_from, created_by,
			updated_by, created_at, updated_at
		)
		SELECT
			${partyAddressId}::uuid, ${input.organizationId}, ${partyId}::uuid,
			'registered', 'registered', 'Level 12, Menara Afenda',
			'Kuala Lumpur', 'Wilayah Persekutuan', '50088', ref_country.id,
			true, 'validated', 'active', 1, '2026-01-01'::timestamptz,
			${input.actorUserId}, ${input.actorUserId}, NOW(), NOW()
		FROM ref_country
		WHERE ref_country.code = 'MY'
	`;

	return { partyId, partyAddressId };
}

async function readLegalCompanyProof(
	sql: NeonSql,
	input: { organizationId: string; companyCode: string },
): Promise<LegalCompanyProof> {
	const rows = (await sql`
		SELECT id, state, version
		FROM ca_legal_company
		WHERE organization_id = ${input.organizationId}
			AND company_code = ${input.companyCode}
		LIMIT 1
	`) as Array<{ id: string; state: string; version: number }>;
	const company = rows[0];
	if (!company) {
		throw new Error(`Expected legal company ${input.companyCode} to exist.`);
	}
	const statusRows = (await sql`
		SELECT COUNT(*)::int AS count
		FROM ca_company_status_history
		WHERE organization_id = ${input.organizationId}
			AND legal_company_id = ${company.id}::uuid
			AND status = 'active'
	`) as Array<{ count: number }>;
	return {
		id: company.id,
		state: company.state,
		version: company.version,
		activeStatusCount: statusRows[0]?.count ?? 0,
	};
}

async function cleanupCorporateAdministrationJourney(
	sql: NeonSql,
	input: {
		organizationId: string;
		partyId: string;
		partyAddressId: string;
	},
): Promise<void> {
	await sql`DELETE FROM platform_domain_event WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM platform_audit_log WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_premise WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_registered_address WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_establishment_status_history WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_legal_establishment WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_activity WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_financial_year WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_identifier WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_legal_form_history WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_name WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_status_history WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_company_jurisdiction_profile WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_legal_company WHERE organization_id = ${input.organizationId}`;
	await sql`DELETE FROM ca_mutation_receipt WHERE organization_id = ${input.organizationId}`;
	await sql`
		DELETE FROM md_party_address
		WHERE organization_id = ${input.organizationId}
			AND id = ${input.partyAddressId}::uuid
	`;
	await sql`
		DELETE FROM md_party
		WHERE organization_id = ${input.organizationId}
			AND id = ${input.partyId}::uuid
	`;
}

function requireDatabaseUrl(): string {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required for CA Phase 1 journey.");
	}
	return databaseUrl;
}
