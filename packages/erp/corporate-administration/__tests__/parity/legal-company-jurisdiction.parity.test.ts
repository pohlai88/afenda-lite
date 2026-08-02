// biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared parity assertions are invoked only from test cases.
import {
	findCompanyJurisdictionProfileAsOf,
	getLegalCompany,
	getLegalCompanyTimeline,
	listLegalCompanies,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	caQueryOptions,
	createDrizzleCompanyDependencies,
	createMemoryCompanyDependencies,
	expectOk,
	profileIdentity,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import { cleanupCorporateAdministrationInfrastructureTestData } from "../helpers/neon-cleanup";
import { RUN_CORPORATE_ADMINISTRATION_NEON_PARITY } from "../helpers/neon-parity";

async function runJurisdictionScenario(input: {
	organizationId: string;
	dependencies: ReturnType<
		| typeof createMemoryCompanyDependencies
		| typeof createDrizzleCompanyDependencies
	>;
}) {
	const commandOptions = caCommandOptions({
		organizationId: input.organizationId,
	});
	const queryOptions = caQueryOptions({ organizationId: input.organizationId });
	const registered = await registerLegalCompanyDraft(
		caDraftInput({ companyCode: "af-my" }),
		commandOptions,
		input.dependencies,
	);
	expectOk(registered);

	const set = await setCompanyJurisdictionProfile(
		caJurisdictionProfileInput({
			legalCompanyId: registered.data.legalCompanyId,
			expectedCompanyVersion: registered.data.version,
			from: "2026-01-01",
			to: null,
			recordedAt: "2026-07-26T10:00:00.000Z",
		}),
		caCommandOptions({ organizationId: input.organizationId }),
		input.dependencies,
	);
	expectOk(set);

	const reloaded = await getLegalCompany(
		{ legalCompanyId: registered.data.legalCompanyId },
		queryOptions,
		input.dependencies,
	);
	expectOk(reloaded);
	expect(reloaded.data?.currentJurisdictionProfile).toMatchObject(
		profileIdentity(set.data),
	);

	const list = await listLegalCompanies(
		undefined,
		queryOptions,
		input.dependencies,
	);
	expectOk(list);
	expect(list.data.items).toHaveLength(1);

	const asOf = await findCompanyJurisdictionProfileAsOf(
		{
			legalCompanyId: registered.data.legalCompanyId,
			asOf: "2026-06-01",
			knownAt: "2026-07-26T10:00:00.000Z",
		},
		queryOptions,
		input.dependencies,
	);
	expectOk(asOf);
	expect(asOf.data).toMatchObject(profileIdentity(set.data));

	const timelineFirst = await getLegalCompanyTimeline(
		{ legalCompanyId: registered.data.legalCompanyId, pageSize: 1 },
		queryOptions,
		input.dependencies,
	);
	expectOk(timelineFirst);
	expect(timelineFirst.data.nextCursor).not.toBeNull();
	if (timelineFirst.data.nextCursor === null) {
		throw new Error("Legal-company timeline parity expected a second page.");
	}
	const timelineSecond = await getLegalCompanyTimeline(
		{
			legalCompanyId: registered.data.legalCompanyId,
			pageSize: 1,
			cursor: timelineFirst.data.nextCursor,
		},
		queryOptions,
		input.dependencies,
	);
	expectOk(timelineSecond);
	expect(
		[timelineFirst, timelineSecond]
			.flatMap((result) => result.data.items)
			.map((entry) => entry.kind),
	).toEqual(["profile", "jurisdiction_profile"]);
	expect(timelineSecond.data.nextCursor).toBeNull();
}

describe("Corporate Administration legal-company jurisdiction parity", () => {
	it("runs the CA-1.1 scenario against the memory store", async () => {
		await runJurisdictionScenario({
			organizationId: uniqueCaOrganizationId("memory-parity"),
			dependencies: createMemoryCompanyDependencies(),
		});
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		"Drizzle store",
		() => {
			it("runs the same CA-1.1 scenario against Neon", async () => {
				const organizationId = uniqueCaOrganizationId("drizzle-parity");
				try {
					await runJurisdictionScenario({
						organizationId,
						dependencies: createDrizzleCompanyDependencies(),
					});
				} finally {
					await cleanupCorporateAdministrationInfrastructureTestData(
						organizationId,
					);
				}
			}, 30_000);
		},
	);
});
