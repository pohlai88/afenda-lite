// biome-ignore-all lint/suspicious/useAwait: Contract fixtures implement asynchronous store ports.
import { randomUUID } from "node:crypto";
import {
	type CompanyJurisdictionProfile,
	type CompanyJurisdictionRulePort,
	type CompanyPartyReferencePort,
	type CorporateAdministrationCommandOptions,
	type CorporateAdministrationQueryOptions,
	correlationIdSchema,
	getLegalCompany,
	type InsertJurisdictionProfileStoreInput,
	idempotencyKeySchema,
	isFutureDatedProfile,
	isRetroactiveCorrection,
	isVisibleAtKnownTime,
	type LegalCompany,
	type LegalCompanyListPage,
	type LegalCompanyStore,
	legalCompanySchema,
	listLegalCompanies,
	matchesAsOf,
	organizationIdSchema,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
	supersedeCompanyJurisdictionProfile,
	type UpdateLegalCompanyProfileStoreInput,
	updateLegalCompanyProfile,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/testing";
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

const organizationId = organizationIdSchema.parse("org-company-contract");
const actorUserId = userIdSchema.parse("user-company-contract");
const correlationId = correlationIdSchema.parse("corr-company-contract");
const idempotencyKey = idempotencyKeySchema.parse("idem-company-contract");
const legalCompanyId = "018f4ace-5986-73a2-9c4d-111111111111";
const jurisdictionProfileId = "018f4ace-5986-73a2-9c4d-222222222222";
function commandOptions(): CorporateAdministrationCommandOptions {
	return {
		organizationId,
		actorUserId,
		correlationId,
		idempotencyKey,
		authorization: {
			can: async () => true,
		},
	};
}
function queryOptions(): CorporateAdministrationQueryOptions {
	return {
		organizationId,
		actorUserId,
		correlationId,
		authorization: {
			can: async () => true,
		},
	};
}
function deniedQueryOptions(): CorporateAdministrationQueryOptions {
	return {
		organizationId,
		actorUserId,
		correlationId,
		authorization: {
			can: async () => false,
		},
	};
}
function company(version = 3): LegalCompany {
	return legalCompanySchema.parse({
		organizationId,
		legalCompanyId,
		companyCode: "AF-MY",
		normalizedCompanyCode: "AF-MY",
		masterDataPartyId: "party-1",
		homeJurisdictionCountryCode: "MY",
		state: "draft",
		profile: {
			displayName: "Afenda Malaysia",
			registeredName: "Afenda Malaysia Sdn Bhd",
			shortName: "Afenda MY",
			sourceReference: "board-resolution-1",
		},
		currentJurisdictionProfile: null,
		createdByUserId: actorUserId,
		updatedByUserId: actorUserId,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-02T00:00:00.000Z",
		version,
	});
}
function profile(input?: {
	from?: string;
	to?: string | null;
	version?: number;
}): CompanyJurisdictionProfile {
	return {
		jurisdictionProfileId,
		organizationId,
		legalCompanyId: legalCompanySchema.parse({
			...company(),
			legalCompanyId,
		}).legalCompanyId,
		jurisdictionCountryCode: "MY",
		entityType: "private_limited_company",
		effectiveRange: {
			from: (input?.from ??
				"2026-01-01") as CompanyJurisdictionProfile["effectiveRange"]["from"],
			to: (input?.to ??
				null) as CompanyJurisdictionProfile["effectiveRange"]["to"],
		},
		recordedAt:
			"2026-01-01T00:00:00.000Z" as CompanyJurisdictionProfile["recordedAt"],
		recordedByUserId: actorUserId,
		sourceReference: "ssm-profile-1",
		supersededAt: null,
		supersededByProfileId: null,
		version: input?.version ?? 1,
	};
}
function activeRulePort(): CompanyJurisdictionRulePort {
	return {
		listEntityTypeRules: async () =>
			errorResult.ok([
				{
					jurisdictionCountryCode: "MY",
					entityTypes: ["draft_legal_company", "private_limited_company"],
					active: true,
				},
			]),
	};
}
function activePartyPort(): CompanyPartyReferencePort {
	return {
		getOrganizationParty: async () =>
			errorResult.ok({
				partyId: "party-1",
				kind: "organization",
				active: true,
			}),
	};
}
function durableCommandDependencies(store: LegalCompanyStore) {
	return {
		store,
		jurisdictionRules: activeRulePort(),
		partyReferences: activePartyPort(),
		createEventId: () => `event-${randomUUID()}`,
		runtime: {
			clock: createFixedCorporateAdministrationClock(
				"2026-01-03T00:00:00.000Z",
			),
			transaction: createInlineCorporateAdministrationTransactionPort(),
			idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
			audit: createMemoryCorporateAdministrationAuditFactPort(),
			outbox: createMemoryCorporateAdministrationOutboxPort(),
		},
	};
}
function createStore(input?: {
	currentCompany?: LegalCompany | null;
	existingProfiles?: readonly CompanyJurisdictionProfile[];
}): LegalCompanyStore & {
	lastSet?: InsertJurisdictionProfileStoreInput;
	lastUpdate?: UpdateLegalCompanyProfileStoreInput;
	lastListPageOrganizationId?: typeof organizationId;
} {
	const store = {
		getLegalCompany: async () =>
			errorResult.ok(input?.currentCompany ?? company()),
		listLegalCompanies: async (listInput) => {
			store.lastListPageOrganizationId = listInput.organizationId;
			return errorResult.ok({
				items: [],
				nextCursor: null,
			} satisfies LegalCompanyListPage);
		},
		registerLegalCompanyDraft: async () => errorResult.ok(company(1)),
		updateLegalCompanyProfile: async (updateInput) => {
			store.lastUpdate = updateInput;
			return errorResult.ok(company(updateInput.expectedVersion + 1));
		},
		insertJurisdictionProfile: async (setInput) => {
			store.lastSet = setInput;
			return errorResult.ok(profile());
		},
		supersedeJurisdictionProfile: async () =>
			errorResult.ok(profile({ version: 2 })),
		findJurisdictionProfileAsOf: async () => errorResult.ok(profile()),
		listJurisdictionProfiles: async () =>
			errorResult.ok(input?.existingProfiles ?? []),
		hasOverlappingJurisdictionProfile: async (overlapInput) =>
			errorResult.ok(
				(input?.existingProfiles ?? []).some(
					(existing) =>
						existing.jurisdictionProfileId !==
							overlapInput.ignoreJurisdictionProfileId &&
						existing.supersededAt === null,
				),
			),
		lockLegalCompany: async () =>
			errorResult.ok(input?.currentCompany ?? company()),
		getLegalCompanyTimeline: async () => errorResult.ok([]),
	} satisfies LegalCompanyStore & {
		lastSet?: InsertJurisdictionProfileStoreInput;
		lastUpdate?: UpdateLegalCompanyProfileStoreInput;
		lastListPageOrganizationId?: typeof organizationId;
	};
	return store;
}
describe("Corporate Administration company contracts", () => {
	it("registers a draft company with receipt, audit, and event in one command path", async () => {
		const store = createMemoryCorporateAdministrationLegalCompanyStore();
		const audits: unknown[] = [];
		const events: unknown[] = [];
		const result = await registerLegalCompanyDraft(
			{
				companyCode: "af-my",
				displayName: "Afenda Malaysia",
				masterDataPartyId: "party-1",
				homeJurisdictionCountryCode: "MY",
				sourceReference: "test-register-draft",
			},
			commandOptions(),
			{
				store,
				jurisdictionRules: activeRulePort(),
				partyReferences: activePartyPort(),
				createEventId: () => "event-register-draft",
				runtime: {
					clock: createFixedCorporateAdministrationClock(
						"2026-01-03T00:00:00.000Z",
					),
					transaction: createInlineCorporateAdministrationTransactionPort(),
					idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
					audit: createMemoryCorporateAdministrationAuditFactPort({
						onRecord: (fact) => audits.push(fact),
					}),
					outbox: createMemoryCorporateAdministrationOutboxPort({
						onAppend: (appended) => events.push(...appended),
					}),
				},
			},
		);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data).toMatchObject({
			organizationId,
			companyCode: "af-my",
			normalizedCompanyCode: "AF-MY",
			homeJurisdictionCountryCode: "MY",
			state: "draft",
			version: 1,
		});
		expect(audits).toHaveLength(1);
		expect(events).toHaveLength(1);
		expect(JSON.stringify(events[0])).not.toContain("registeredName");
		const duplicate = await registerLegalCompanyDraft(
			{
				companyCode: "AF-MY",
				displayName: "Afenda Malaysia Duplicate",
				masterDataPartyId: "party-1",
				homeJurisdictionCountryCode: "MY",
				sourceReference: "test-register-draft-duplicate",
			},
			{
				...commandOptions(),
				idempotencyKey: idempotencyKeySchema.parse("idem-company-contract-2"),
			},
			{
				store,
				jurisdictionRules: activeRulePort(),
				partyReferences: activePartyPort(),
				createEventId: () => "event-register-draft-duplicate",
				runtime: {
					clock: createFixedCorporateAdministrationClock(
						"2026-01-03T00:00:00.000Z",
					),
					transaction: createInlineCorporateAdministrationTransactionPort(),
					idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
					audit: createMemoryCorporateAdministrationAuditFactPort(),
					outbox: createMemoryCorporateAdministrationOutboxPort(),
				},
			},
		);
		expect(duplicate).toMatchObject({ ok: false, code: "CONFLICT" });
	});
	it("fails closed before package-level legal company reads", async () => {
		const store = createStore();
		const getResult = await getLegalCompany(
			{ legalCompanyId: company().legalCompanyId },
			deniedQueryOptions(),
			{ store },
		);
		const listResult = await listLegalCompanies(
			undefined,
			deniedQueryOptions(),
			{
				store,
			},
		);
		expect(getResult).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(listResult).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(store.lastListPageOrganizationId).toBeUndefined();
	});
	it("sets a jurisdiction profile through tenant-scoped store and rule ports", async () => {
		const store = createStore();
		const result = await setCompanyJurisdictionProfile(
			{
				legalCompanyId,
				jurisdictionCountryCode: "MY",
				entityType: "private_limited_company",
				effectiveRange: { from: "2026-01-01", to: null },
				recordedAt: "2026-01-03T00:00:00.000Z",
				sourceReference: "ssm-profile-2",
				expectedCompanyVersion: 3,
			},
			commandOptions(),
			durableCommandDependencies(store),
		);
		expect(result.ok).toBe(true);
		expect(store.lastSet).toMatchObject({
			organizationId,
			recordedByUserId: actorUserId,
			jurisdictionCountryCode: "MY",
			entityType: "private_limited_company",
		});
	});
	it("rejects stale legal company profile updates before mutation", async () => {
		const store = createStore({ currentCompany: company(4) });
		const result = await updateLegalCompanyProfile(
			{
				legalCompanyId,
				expectedVersion: 3,
				profile: {
					displayName: "Afenda Malaysia Updated",
					sourceReference: "board-resolution-2",
				},
			},
			commandOptions(),
			durableCommandDependencies(store),
		);
		expect(result).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
		expect(store.lastUpdate).toBeUndefined();
	});
	it("rejects overlapping jurisdiction profiles before persistence", async () => {
		const store = createStore({
			existingProfiles: [profile({ from: "2026-01-01", to: null })],
		});
		const result = await setCompanyJurisdictionProfile(
			{
				legalCompanyId,
				jurisdictionCountryCode: "MY",
				entityType: "private_limited_company",
				effectiveRange: { from: "2026-02-01", to: null },
				recordedAt: "2026-02-01T00:00:00.000Z",
				sourceReference: "ssm-profile-3",
				expectedCompanyVersion: 3,
			},
			commandOptions(),
			durableCommandDependencies(store),
		);
		expect(result).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
		expect(store.lastSet).toBeUndefined();
	});
	it("lists legal companies with tenant scope and default pagination", async () => {
		const store = createStore();
		const result = await listLegalCompanies(undefined, queryOptions(), {
			store,
		});
		expect(result.ok).toBe(true);
		expect(store.lastListPageOrganizationId).toBe(organizationId);
	});
	it("evaluates effective-time and recorded-time jurisdiction profile rules", () => {
		const current = profile({ from: "2026-01-01", to: "2026-12-31" });
		expect(
			isFutureDatedProfile({
				profile: current,
				today: "2025-12-31" as Parameters<
					typeof isFutureDatedProfile
				>[0]["today"],
			}),
		).toBe(true);
		expect(
			isRetroactiveCorrection({
				effectiveRange: current.effectiveRange,
				today: "2026-02-01" as Parameters<
					typeof isRetroactiveCorrection
				>[0]["today"],
			}),
		).toBe(true);
		expect(
			matchesAsOf({
				profile: current,
				asOf: "2026-06-30" as Parameters<typeof matchesAsOf>[0]["asOf"],
			}),
		).toBe(true);
		expect(
			isVisibleAtKnownTime({
				profile: current,
				knownAt: "2026-01-02T00:00:00.000Z" as Parameters<
					typeof isVisibleAtKnownTime
				>[0]["knownAt"],
			}),
		).toBe(true);
		expect(
			isVisibleAtKnownTime({
				profile: current,
				knownAt: "2025-12-31T00:00:00.000Z" as Parameters<
					typeof isVisibleAtKnownTime
				>[0]["knownAt"],
			}),
		).toBe(false);
	});
	it("supersedes jurisdiction profiles through the required store port names", async () => {
		const store = createStore({
			existingProfiles: [profile({ from: "2026-01-01", to: null })],
		});
		const result = await supersedeCompanyJurisdictionProfile(
			{
				legalCompanyId,
				jurisdictionProfileId,
				expectedProfileVersion: 1,
				replacement: {
					jurisdictionCountryCode: "MY",
					entityType: "private_limited_company",
					effectiveRange: { from: "2027-01-01", to: null },
					recordedAt: "2026-06-01T00:00:00.000Z",
					sourceReference: "ssm-profile-4",
				},
			},
			commandOptions(),
			durableCommandDependencies(store),
		);
		expect(result.ok).toBe(true);
	});
});
