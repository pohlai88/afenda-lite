import {
	getLegalCompany,
	getLegalCompanyTimeline,
	listLegalCompanies,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
	supersedeCompanyJurisdictionProfile,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	caQueryOptions,
	caSupersedeInput,
	createMemoryCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";

describe("Corporate Administration legal-company tenant isolation", () => {
	it("does not read legal companies across organizations", async () => {
		const dependencies = createMemoryCompanyDependencies();
		const ownerOrg = uniqueCaOrganizationId("owner");
		const otherOrg = uniqueCaOrganizationId("other");
		const registered = await registerLegalCompanyDraft(
			caDraftInput(),
			caCommandOptions({ organizationId: ownerOrg }),
			dependencies,
		);
		expectOk(registered);

		const crossTenant = await getLegalCompany(
			{ legalCompanyId: registered.data.legalCompanyId },
			caQueryOptions({ organizationId: otherOrg }),
			dependencies,
		);

		expect(crossTenant).toMatchObject({ ok: true, data: null });
	});

	it("does not supersede a profile through another organization's scope", async () => {
		const dependencies = createMemoryCompanyDependencies();
		const ownerOrg = uniqueCaOrganizationId("owner-profile");
		const otherOrg = uniqueCaOrganizationId("other-profile");
		const registered = await registerLegalCompanyDraft(
			caDraftInput(),
			caCommandOptions({ organizationId: ownerOrg }),
			dependencies,
		);
		expectOk(registered);
		const profile = await setCompanyJurisdictionProfile(
			caJurisdictionProfileInput({
				legalCompanyId: registered.data.legalCompanyId,
				expectedCompanyVersion: registered.data.version,
			}),
			caCommandOptions({ organizationId: ownerOrg }),
			dependencies,
		);
		expectOk(profile);

		const crossTenant = await supersedeCompanyJurisdictionProfile(
			caSupersedeInput({
				legalCompanyId: registered.data.legalCompanyId,
				jurisdictionProfileId: profile.data.jurisdictionProfileId,
				expectedProfileVersion: profile.data.version,
			}),
			caCommandOptions({ organizationId: otherOrg }),
			dependencies,
		);

		expect(crossTenant).toMatchObject({ ok: false, code: "NOT_FOUND" });
	});

	it("lists only the requesting organization's companies", async () => {
		const dependencies = createMemoryCompanyDependencies();
		const ownerOrg = uniqueCaOrganizationId("list-owner");
		const otherOrg = uniqueCaOrganizationId("list-other");
		await registerLegalCompanyDraft(
			caDraftInput({ companyCode: "af-owner" }),
			caCommandOptions({ organizationId: ownerOrg }),
			dependencies,
		);
		await registerLegalCompanyDraft(
			caDraftInput({ companyCode: "af-other" }),
			caCommandOptions({ organizationId: otherOrg }),
			dependencies,
		);

		const list = await listLegalCompanies(
			undefined,
			caQueryOptions({ organizationId: ownerOrg }),
			dependencies,
		);

		expectOk(list);
		expect(list.data.items).toHaveLength(1);
		expect(list.data.items[0]?.organizationId).toBe(ownerOrg);
	});

	it("does not leak another tenant's profile through the timeline", async () => {
		const dependencies = createMemoryCompanyDependencies();
		const ownerOrg = uniqueCaOrganizationId("timeline-owner");
		const otherOrg = uniqueCaOrganizationId("timeline-other");
		const registered = await registerLegalCompanyDraft(
			caDraftInput(),
			caCommandOptions({ organizationId: ownerOrg }),
			dependencies,
		);
		expectOk(registered);
		const profile = await setCompanyJurisdictionProfile(
			caJurisdictionProfileInput({
				legalCompanyId: registered.data.legalCompanyId,
				expectedCompanyVersion: registered.data.version,
			}),
			caCommandOptions({ organizationId: ownerOrg }),
			dependencies,
		);
		expectOk(profile);

		const timeline = await getLegalCompanyTimeline(
			{ legalCompanyId: registered.data.legalCompanyId },
			caQueryOptions({ organizationId: otherOrg }),
			dependencies,
		);

		expectOk(timeline);
		expect(timeline.data).toEqual([]);
	});
});
