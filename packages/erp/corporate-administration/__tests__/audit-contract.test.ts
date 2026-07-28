import {
	type CorporateAdministrationAuditFactInput,
	corporateAdministrationAuditFactInputSchema,
	corporateAdministrationModuleManifest,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationAuditFactPort } from "@afenda/corporate-administration/adapters/drizzle";
import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";

describe("Corporate Administration audit fact contract", () => {
	it("records generic safe facts without CA-owned audit tables or snapshots", async () => {
		const onRecord = vi.fn();
		const audit = createMemoryCorporateAdministrationAuditFactPort({
			onRecord,
		});
		const fact = {
			organizationId: "org_1",
			actorUserId: "user_1",
			correlationId: "corr_1",
			causationId: "cause_1",
			operationType: "CREATE",
			targetType: "ca_mutation_receipt",
			targetId: "receipt_1",
			occurredAt: "2026-07-26T10:00:00.000Z",
			outcome: "SUCCESS",
			safeMetadata: {
				source: "ca-0.4",
				retry: false,
			},
		} satisfies CorporateAdministrationAuditFactInput;

		await expect(audit.record(fact)).resolves.toEqual({
			ok: true,
			data: { id: "audit_1" },
		});

		expect(onRecord).toHaveBeenCalledWith(fact);
		expect(
			corporateAdministrationModuleManifest.persistence.mutationTables,
		).not.toContain("ca_audit_fact");
		expect(corporateAdministrationModuleManifest.events.emits).toEqual([
			"corporate_administration.legal_company.draft_registered.v1",
			"corporate_administration.legal_company.profile_updated.v1",
			"corporate_administration.legal_company.jurisdiction_profile_set.v1",
			"corporate_administration.legal_company.name_added.v1",
			"corporate_administration.legal_company.name_superseded.v1",
			"corporate_administration.legal_company.legal_form_changed.v1",
			"corporate_administration.legal_company.identifier_registered.v1",
			"corporate_administration.legal_company.financial_year_set.v1",
			"corporate_administration.legal_company.activity_registered.v1",
			"corporate_administration.legal_company.activated.v1",
			"corporate_administration.legal_company.suspended.v1",
			"corporate_administration.legal_company.struck_off_marked.v1",
			"corporate_administration.legal_company.liquidation_entered.v1",
			"corporate_administration.legal_company.dissolved.v1",
			"corporate_administration.legal_company.restored.v1",
			"corporate_administration.legal_company.archived.v1",
			"corporate_administration.legal_establishment.registered.v1",
			"corporate_administration.legal_establishment.updated.v1",
			"corporate_administration.legal_establishment.status_changed.v1",
			"corporate_administration.registered_address.set.v1",
			"corporate_administration.premise.registered.v1",
			"corporate_administration.premise.ended.v1",
		]);
	});

	it("rejects snapshots, payloads, secrets, and unbounded metadata", () => {
		const base = {
			organizationId: "org_1",
			actorUserId: "user_1",
			correlationId: "corr_1",
			operationType: "CREATE",
			targetType: "ca_mutation_receipt",
			targetId: "receipt_1",
			occurredAt: "2026-07-26T10:00:00.000Z",
			outcome: "SUCCESS",
		} as const;

		for (const safeMetadata of [
			{ payload: "raw" },
			{ before: "snapshot" },
			{ access_token: "secret" },
			{ bank_account_number: "123" },
			Object.fromEntries(
				Array.from({ length: 21 }, (_, index) => [`field_${index}`, index]),
			),
		]) {
			expect(
				corporateAdministrationAuditFactInputSchema.safeParse({
					...base,
					safeMetadata,
				}).success,
			).toBe(false);
		}
	});

	it("does not expose shared audit adapter failure details", async () => {
		const audit = createDrizzleCorporateAdministrationAuditFactPort({
			createAuditId: () => "audit_1",
			store: {
				write: async () =>
					fail("INTERNAL_ERROR", "raw database failure", {
						query: "insert into platform_audit_log",
					}),
			},
		});

		const result = await audit.record({
			organizationId: "org_1",
			actorUserId: "user_1",
			correlationId: "corr_1",
			operationType: "CREATE",
			targetType: "ca_mutation_receipt",
			targetId: "receipt_1",
			occurredAt: "2026-07-26T10:00:00.000Z",
			outcome: "FAILURE",
		});

		expect(result).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(JSON.stringify(result)).not.toContain("insert into");
		expect(JSON.stringify(result)).not.toContain("raw database failure");
	});

	it("does not let safe metadata overwrite authoritative audit facts", async () => {
		const write = vi.fn(async () => ok({ id: "audit_1" }));
		const audit = createDrizzleCorporateAdministrationAuditFactPort({
			createAuditId: () => "audit_1",
			store: { write },
		});

		await expect(
			audit.record({
				organizationId: "org_1",
				actorUserId: "user_1",
				correlationId: "corr_1",
				causationId: "cause_1",
				operationType: "UPDATE",
				targetType: "ca_mutation_receipt",
				targetId: "receipt_1",
				occurredAt: "2026-07-26T10:00:00.000Z",
				outcome: "SUCCESS",
				safeMetadata: {
					outcome: "forged",
					source: "ca-0.4",
				},
			}),
		).resolves.toEqual(ok({ id: "audit_1" }));

		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: {
					outcome: "SUCCESS",
					source: "ca-0.4",
					causation_id: "cause_1",
				},
			}),
		);
	});

	it("uses the active CA transaction context for audit persistence", async () => {
		const write = vi.fn(async () => ok({ id: "audit_immediate" }));
		const statements: unknown[] = [];
		const audit = createDrizzleCorporateAdministrationAuditFactPort({
			createAuditId: () => "audit_tx_1",
			store: { write },
		});

		const result = await audit.record(
			{
				organizationId: "org_1",
				actorUserId: "user_1",
				correlationId: "corr_1",
				operationType: "CREATE",
				targetType: "ca_legal_company",
				targetId: "company_1",
				occurredAt: "2026-07-26T10:00:00.000Z",
				outcome: "SUCCESS",
			},
			{
				transaction: {
					enqueue: (statement) => statements.push(statement),
					statementCount: statements.length,
				},
			},
		);

		expect(result).toEqual(ok({ id: "audit_tx_1" }));
		expect(write).not.toHaveBeenCalled();
		expect(statements).toHaveLength(1);
	});
});
