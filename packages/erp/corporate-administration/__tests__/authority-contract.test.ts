// biome-ignore-all lint/suspicious/useAwait: Contract fixtures implement asynchronous authority ports.
import { randomUUID } from "node:crypto";
import {
	type AuthorityReferencePort,
	amendAuthorityMandate,
	type CorporateAdministrationCommandOptions,
	type CorporateAdministrationQueryOptions,
	correlationIdSchema,
	getAuthorityMandate,
	grantAuthorityMandate,
	idempotencyKeySchema,
	type LegalCompany,
	legalCompanySchema,
	listAuthorityMandatesAsOf,
	type OfficerAppointmentReferencePort,
	officerAppointmentIdSchema,
	organizationIdSchema,
	type PartyReferencePort,
	revokeAuthorityMandate,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createMemoryCorporateAdministrationAuthorityStore,
	createMemoryCorporateAdministrationObservabilityPort,
} from "@afenda/corporate-administration/testing";
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

const organizationId = organizationIdSchema.parse("org-authority-contract");
const actorUserId = userIdSchema.parse("user-authority-contract");
const legalCompanyId = "018f4ace-5986-73a2-9c4d-611111111111";
const activeAppointmentId = officerAppointmentIdSchema.parse(
	"018f4ace-5986-73a2-9c4d-622222222222",
);
const endedAppointmentId = officerAppointmentIdSchema.parse(
	"018f4ace-5986-73a2-9c4d-633333333333",
);

function commandOptions(): CorporateAdministrationCommandOptions {
	return {
		organizationId,
		actorUserId,
		correlationId: correlationIdSchema.parse(`corr-${randomUUID()}`),
		idempotencyKey: idempotencyKeySchema.parse(`idem-${randomUUID()}`),
		authorization: {
			can: async () => true,
		},
	};
}

function queryOptions(): CorporateAdministrationQueryOptions {
	return {
		organizationId,
		actorUserId,
		correlationId: correlationIdSchema.parse(`corr-${randomUUID()}`),
		authorization: {
			can: async () => true,
		},
	};
}

function company(version = 1): LegalCompany {
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

function activePartyPort(): PartyReferencePort {
	return {
		getOrganizationParty: async (input) =>
			errorResult.ok({
				partyId: input.partyId,
				kind: "person",
				active: true,
			}),
	};
}

function officerAppointmentPort(): OfficerAppointmentReferencePort {
	return {
		getOfficerAppointmentReference: async (input) => {
			if (input.officerAppointmentId === activeAppointmentId) {
				return errorResult.ok({ id: activeAppointmentId, status: "active" });
			}
			if (input.officerAppointmentId === endedAppointmentId) {
				return errorResult.ok({ id: endedAppointmentId, status: "ended" });
			}
			return errorResult.ok(null);
		},
	};
}

function activeReferencePort(): AuthorityReferencePort {
	return {
		validateSourceDocument: async (input) =>
			errorResult.ok({
				sourceDocumentId: input.sourceDocumentId,
				active: true,
			}),
	};
}

function commandDependencies(
	authorityStore = createMemoryCorporateAdministrationAuthorityStore(),
) {
	return {
		authorityStore,
		companyStore: {
			getLegalCompany: async () => errorResult.ok(company()),
			lockLegalCompany: async () => errorResult.ok(company()),
		},
		officerAppointments: officerAppointmentPort(),
		referenceData: activeReferencePort(),
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
			observability: createMemoryCorporateAdministrationObservabilityPort(),
		},
	};
}

function queryDependencies(
	authorityStore: ReturnType<
		typeof createMemoryCorporateAdministrationAuthorityStore
	>,
) {
	return {
		authorityStore,
		runtime: {
			observability: createMemoryCorporateAdministrationObservabilityPort(),
		},
	};
}

function grantInput(input?: {
	effectiveFrom?: string;
	protectedAuthority?: boolean;
	holderPartyId?: string | null;
	holderOfficerAppointmentId?: string | null;
}) {
	return {
		legalCompanyId,
		mandateType: "signing_authority" as const,
		holderPartyId:
			input?.holderPartyId === undefined
				? "party-holder-1"
				: input.holderPartyId,
		holderOfficerAppointmentId: input?.holderOfficerAppointmentId ?? null,
		grantedByType: "board_resolution" as const,
		grantingResolutionId: null,
		scopeDescription: "Sign supplier contracts",
		monetaryLimitAmount: "100000",
		monetaryLimitCurrencyCode: "MYR",
		jurisdictionCode: "MY",
		protectedAuthority: input?.protectedAuthority ?? false,
		effectiveFrom: input?.effectiveFrom ?? "2026-01-01",
		sourceDocumentId: "doc-mandate-1",
		expectedCompanyVersion: 1,
	};
}

describe("CA-FR-006 authority mandate contracts", () => {
	it("grants an ordinary mandate through the durable command path", async () => {
		const dependencies = commandDependencies();
		const result = await grantAuthorityMandate(
			grantInput(),
			commandOptions(),
			dependencies,
		);
		expect(
			result.ok
				? {
						status: result.data.status,
						mandateType: result.data.mandateType,
						holderPartyId: result.data.holderPartyId,
						monetaryLimitAmount: result.data.monetaryLimitAmount,
						monetaryLimitCurrencyCode: result.data.monetaryLimitCurrencyCode,
						protectedAuthority: result.data.protectedAuthority,
						version: result.data.version,
					}
				: result,
		).toEqual({
			status: "active",
			mandateType: "signing_authority",
			holderPartyId: "party-holder-1",
			monetaryLimitAmount: "100000",
			monetaryLimitCurrencyCode: "MYR",
			protectedAuthority: false,
			version: 1,
		});
	});

	it("fails closed on protected mandates without an approval verifier", async () => {
		const dependencies = commandDependencies();
		const result = await grantAuthorityMandate(
			grantInput({ protectedAuthority: true }),
			commandOptions(),
			dependencies,
		);
		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
	});

	it("rejects mandates without exactly one holder reference", async () => {
		const dependencies = commandDependencies();
		const both = await grantAuthorityMandate(
			grantInput({
				holderPartyId: "party-holder-1",
				holderOfficerAppointmentId: activeAppointmentId,
			}),
			commandOptions(),
			dependencies,
		);
		const neither = await grantAuthorityMandate(
			grantInput({ holderPartyId: null, holderOfficerAppointmentId: null }),
			commandOptions(),
			dependencies,
		);
		expect(both.ok ? "unexpected-success" : both.code).toBe("VALIDATION_ERROR");
		expect(neither.ok ? "unexpected-success" : neither.code).toBe(
			"VALIDATION_ERROR",
		);
	});

	it("requires an active officer appointment holder reference", async () => {
		const dependencies = commandDependencies();
		const ended = await grantAuthorityMandate(
			grantInput({
				holderPartyId: null,
				holderOfficerAppointmentId: endedAppointmentId,
			}),
			commandOptions(),
			dependencies,
		);
		const active = await grantAuthorityMandate(
			grantInput({
				holderPartyId: null,
				holderOfficerAppointmentId: activeAppointmentId,
			}),
			commandOptions(),
			dependencies,
		);
		expect(ended.ok ? "unexpected-success" : ended.code).toBe("CONFLICT");
		expect(active.ok && active.data.holderOfficerAppointmentId).toBe(
			activeAppointmentId,
		);
	});

	it("rejects amendments with a stale expected version", async () => {
		const dependencies = commandDependencies();
		const granted = await grantAuthorityMandate(
			grantInput(),
			commandOptions(),
			dependencies,
		);
		expect(granted.ok).toBe(true);
		if (!granted.ok) {
			return;
		}
		const stale = await amendAuthorityMandate(
			{
				authorityMandateId: granted.data.id,
				scopeDescription: "Sign supplier and customer contracts",
				monetaryLimitAmount: "250000",
				monetaryLimitCurrencyCode: "MYR",
				jurisdictionCode: "MY",
				sourceDocumentId: "doc-mandate-2",
				expectedVersion: 2,
			},
			commandOptions(),
			dependencies,
		);
		expect(stale.ok ? "unexpected-success" : stale.code).toBe("CONFLICT");
		const amended = await amendAuthorityMandate(
			{
				authorityMandateId: granted.data.id,
				scopeDescription: "Sign supplier and customer contracts",
				monetaryLimitAmount: "250000",
				monetaryLimitCurrencyCode: "MYR",
				jurisdictionCode: "MY",
				sourceDocumentId: "doc-mandate-2",
				expectedVersion: 1,
			},
			commandOptions(),
			dependencies,
		);
		expect(
			amended.ok
				? {
						scopeDescription: amended.data.scopeDescription,
						monetaryLimitAmount: amended.data.monetaryLimitAmount,
						version: amended.data.version,
					}
				: amended,
		).toEqual({
			scopeDescription: "Sign supplier and customer contracts",
			monetaryLimitAmount: "250000",
			version: 2,
		});
	});

	it("revokes active mandates and excludes revoked and future mandates as of a date", async () => {
		const store = createMemoryCorporateAdministrationAuthorityStore();
		const dependencies = commandDependencies(store);
		const current = await grantAuthorityMandate(
			grantInput({ effectiveFrom: "2026-01-01" }),
			commandOptions(),
			dependencies,
		);
		const future = await grantAuthorityMandate(
			grantInput({ effectiveFrom: "2026-09-01" }),
			commandOptions(),
			dependencies,
		);
		const revocable = await grantAuthorityMandate(
			grantInput({ effectiveFrom: "2026-01-15" }),
			commandOptions(),
			dependencies,
		);
		expect(current.ok && future.ok && revocable.ok).toBe(true);
		if (!(current.ok && future.ok && revocable.ok)) {
			return;
		}
		const revoked = await revokeAuthorityMandate(
			{
				authorityMandateId: revocable.data.id,
				revokedOn: "2026-02-01",
				reason: "Mandate superseded by new board resolution",
				sourceDocumentId: "doc-revocation-1",
				expectedVersion: 1,
			},
			commandOptions(),
			dependencies,
		);
		expect(
			revoked.ok
				? {
						status: revoked.data.status,
						revocationReason: revoked.data.revocationReason,
						effectiveTo: revoked.data.effectiveTo,
						version: revoked.data.version,
					}
				: revoked,
		).toEqual({
			status: "revoked",
			revocationReason: "Mandate superseded by new board resolution",
			effectiveTo: "2026-02-01",
			version: 2,
		});
		const secondRevoke = await revokeAuthorityMandate(
			{
				authorityMandateId: revocable.data.id,
				revokedOn: "2026-02-02",
				reason: "Duplicate revocation",
				sourceDocumentId: "doc-revocation-2",
				expectedVersion: 2,
			},
			commandOptions(),
			dependencies,
		);
		expect(secondRevoke.ok ? "unexpected-success" : secondRevoke.code).toBe(
			"CONFLICT",
		);
		const page = await listAuthorityMandatesAsOf(
			{ legalCompanyId, asOf: "2026-06-01" },
			queryOptions(),
			queryDependencies(store),
		);
		expect(
			page.ok
				? {
						ids: page.data.items.map((item) => item.id),
						nextCursor: page.data.nextCursor,
					}
				: page,
		).toEqual({ ids: [current.data.id], nextCursor: null });
	});

	it("returns not-found for unknown mandate identifiers", async () => {
		const store = createMemoryCorporateAdministrationAuthorityStore();
		const missing = await getAuthorityMandate(
			{ authorityMandateId: "018f4ace-5986-73a2-9c4d-644444444444" },
			queryOptions(),
			queryDependencies(store),
		);
		expect(missing.ok ? "unexpected-success" : missing.code).toBe("NOT_FOUND");
	});
});
