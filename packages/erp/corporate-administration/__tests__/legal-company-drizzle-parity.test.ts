// biome-ignore-all lint/suspicious/useAwait: Parity probes implement asynchronous production ports.
import { randomUUID } from "node:crypto";

import {
	type CompanyJurisdictionRulePort,
	type CompanyPartyReferencePort,
	type CorporateAdministrationCommandOptions,
	correlationIdSchema,
	idempotencyKeySchema,
	organizationIdSchema,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationAuditFactPort,
	createDrizzleCorporateAdministrationIdempotencyPort,
	createDrizzleCorporateAdministrationLegalCompanyStore,
	createDrizzleCorporateAdministrationOutboxPort,
	createDrizzleCorporateAdministrationTransactionPort,
} from "@afenda/corporate-administration/adapters/drizzle";
import {
	and,
	caCompanyJurisdictionProfile,
	caLegalCompany,
	db,
	eq,
	platformAuditLog,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationOutboxEvents,
	createNeonCorporateAdministrationPendingEventAppender,
} from "./helpers/neon-cleanup";
import { RUN_CORPORATE_ADMINISTRATION_NEON_PARITY } from "./helpers/neon-parity";

function activeRulePort(): CompanyJurisdictionRulePort {
	return {
		listEntityTypeRules: async () =>
			ok([
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
			ok({
				partyId: "party-1",
				kind: "organization",
				active: true,
			}),
	};
}

function commandOptions(input: {
	organizationId: string;
	idempotencyKey: string;
	correlationId: string;
}): CorporateAdministrationCommandOptions {
	return {
		organizationId: organizationIdSchema.parse(input.organizationId),
		actorUserId: userIdSchema.parse("user-ca-legal-company-drizzle"),
		correlationId: correlationIdSchema.parse(input.correlationId),
		idempotencyKey: idempotencyKeySchema.parse(input.idempotencyKey),
		authorization: {
			can: async () => true,
		},
	};
}

function dependencies() {
	const auditStoreWrite = vi.fn(async () => {
		throw new Error("Transactional audit must not use immediate store.write");
	});
	return {
		store: createDrizzleCorporateAdministrationLegalCompanyStore({
			database: db,
			createLegalCompanyId: randomUUID,
		}),
		jurisdictionRules: activeRulePort(),
		partyReferences: activePartyPort(),
		runtime: {
			clock: createFixedCorporateAdministrationClock(
				"2026-07-26T10:00:00.000Z",
			),
			transaction: createDrizzleCorporateAdministrationTransactionPort({
				execute: (buildQueries) => runNeonHttpTransaction(buildQueries),
			}),
			idempotency: createDrizzleCorporateAdministrationIdempotencyPort({
				database: db,
				createReservationToken: randomUUID,
				now: () => new Date("2026-07-26T10:00:00.000Z"),
			}),
			audit: createDrizzleCorporateAdministrationAuditFactPort({
				store: { write: auditStoreWrite },
				createAuditId: randomUUID,
			}),
			outbox: createDrizzleCorporateAdministrationOutboxPort({
				appender: createNeonCorporateAdministrationPendingEventAppender(),
			}),
		},
		createEventId: randomUUID,
	};
}

async function countLegalCompanies(organizationId: string): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caLegalCompany)
		.where(eq(caLegalCompany.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

async function countLegalCompanyAudit(organizationId: string): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(platformAuditLog)
		.where(
			and(
				eq(platformAuditLog.organizationId, organizationId),
				eq(platformAuditLog.module, "corporate-administration"),
				eq(platformAuditLog.entity, "ca_legal_company"),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

async function countCorporateAdministrationAudit(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(platformAuditLog)
		.where(
			and(
				eq(platformAuditLog.organizationId, organizationId),
				eq(platformAuditLog.module, "corporate-administration"),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

async function countJurisdictionProfiles(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyJurisdictionProfile)
		.where(eq(caCompanyJurisdictionProfile.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	"Corporate Administration legal-company Drizzle parity (durable Neon)",
	() => {
		it("persists company, audit, and event for a draft registration", async () => {
			const organizationId = `org-ca-company-${randomUUID()}`;
			try {
				const result = await registerLegalCompanyDraft(
					{
						companyCode: "af-my",
						displayName: "Afenda Malaysia",
						masterDataPartyId: "party-1",
						homeJurisdictionCountryCode: "MY",
						sourceReference: "ca-0.4-drizzle-parity",
					},
					commandOptions({
						organizationId,
						idempotencyKey: `idem-${randomUUID()}`,
						correlationId: `corr-${randomUUID()}`,
					}),
					dependencies(),
				);

				expect(result).toMatchObject({ ok: true });
				await expect(countLegalCompanies(organizationId)).resolves.toBe(1);
				await expect(countLegalCompanyAudit(organizationId)).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("allows one concurrent duplicate draft registration and rolls back the losing audit and event", async () => {
			const organizationId = `org-ca-company-dupe-${randomUUID()}`;
			try {
				const [first, second] = await Promise.all([
					registerLegalCompanyDraft(
						{
							companyCode: "af-my",
							displayName: "Afenda Malaysia",
							masterDataPartyId: "party-1",
							homeJurisdictionCountryCode: "MY",
							sourceReference: "ca-0.4-concurrent-1",
						},
						commandOptions({
							organizationId,
							idempotencyKey: `idem-${randomUUID()}`,
							correlationId: `corr-${randomUUID()}`,
						}),
						dependencies(),
					),
					registerLegalCompanyDraft(
						{
							companyCode: "AF-MY",
							displayName: "Afenda Malaysia Duplicate",
							masterDataPartyId: "party-1",
							homeJurisdictionCountryCode: "MY",
							sourceReference: "ca-0.4-concurrent-2",
						},
						commandOptions({
							organizationId,
							idempotencyKey: `idem-${randomUUID()}`,
							correlationId: `corr-${randomUUID()}`,
						}),
						dependencies(),
					),
				]);

				const outcomes = [first, second];
				expect(outcomes.filter((result) => result.ok)).toHaveLength(1);
				expect(
					outcomes.filter((result) => !result.ok && result.code === "CONFLICT"),
				).toHaveLength(1);
				await expect(countLegalCompanies(organizationId)).resolves.toBe(1);
				await expect(countLegalCompanyAudit(organizationId)).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("rejects concurrent overlapping jurisdiction profiles atomically", async () => {
			const organizationId = `org-ca-jurisdiction-dupe-${randomUUID()}`;
			try {
				const registered = await registerLegalCompanyDraft(
					{
						companyCode: "af-my",
						displayName: "Afenda Malaysia",
						masterDataPartyId: "party-1",
						homeJurisdictionCountryCode: "MY",
						sourceReference: "ca-1.1-register-for-jurisdiction",
					},
					commandOptions({
						organizationId,
						idempotencyKey: `idem-${randomUUID()}`,
						correlationId: `corr-${randomUUID()}`,
					}),
					dependencies(),
				);
				expect(registered).toMatchObject({ ok: true });
				if (!registered.ok) {
					return;
				}

				const [first, second] = await Promise.all([
					setCompanyJurisdictionProfile(
						{
							legalCompanyId: registered.data.legalCompanyId,
							jurisdictionCountryCode: "MY",
							entityType: "private_limited_company",
							effectiveRange: { from: "2026-01-01", to: null },
							recordedAt: "2026-07-26T10:01:00.000Z",
							sourceReference: "ca-1.1-jurisdiction-1",
							expectedCompanyVersion: registered.data.version,
						},
						commandOptions({
							organizationId,
							idempotencyKey: `idem-${randomUUID()}`,
							correlationId: `corr-${randomUUID()}`,
						}),
						dependencies(),
					),
					setCompanyJurisdictionProfile(
						{
							legalCompanyId: registered.data.legalCompanyId,
							jurisdictionCountryCode: "MY",
							entityType: "private_limited_company",
							effectiveRange: { from: "2026-06-01", to: null },
							recordedAt: "2026-07-26T10:01:00.000Z",
							sourceReference: "ca-1.1-jurisdiction-2",
							expectedCompanyVersion: registered.data.version,
						},
						commandOptions({
							organizationId,
							idempotencyKey: `idem-${randomUUID()}`,
							correlationId: `corr-${randomUUID()}`,
						}),
						dependencies(),
					),
				]);

				const outcomes = [first, second];
				expect(outcomes.filter((result) => result.ok)).toHaveLength(1);
				expect(
					outcomes.filter((result) => !result.ok && result.code === "CONFLICT"),
				).toHaveLength(1);
				await expect(countLegalCompanies(organizationId)).resolves.toBe(1);
				await expect(countJurisdictionProfiles(organizationId)).resolves.toBe(
					1,
				);
				await expect(
					countCorporateAdministrationAudit(organizationId),
				).resolves.toBe(2);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(2);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});
	},
);
