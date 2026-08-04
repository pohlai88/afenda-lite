import {
	CORPORATE_ADMINISTRATION_EVENT_TYPES,
	type CorporateAdministrationAuditFactInput,
	corporateAdministrationAuditFactInputSchema,
	corporateAdministrationModuleManifest,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationAuditFactPort } from "@afenda/corporate-administration/adapters/drizzle";
import { errorResult } from "@afenda/errors";
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
		expect(corporateAdministrationModuleManifest.events.emits).toEqual(
			CORPORATE_ADMINISTRATION_EVENT_TYPES,
		);
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
				write: async () => errorResult.fail("INTERNAL_ERROR"),
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
		const write = vi.fn(async () => errorResult.ok({ id: "audit_1" }));
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
		).resolves.toEqual(errorResult.ok({ id: "audit_1" }));
		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: {
					source: "ca-0.4",
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: "corporate-administration",
					occurredAt: new Date("2026-07-26T10:00:00.000Z"),
					causationId: "cause_1",
					reasonCode: null,
				},
			}),
		);
	});
	it("uses the active CA transaction context for audit persistence", async () => {
		const auditId = "11111111-1111-4111-8111-111111111111";
		const write = vi.fn(async () => errorResult.ok({ id: "audit_immediate" }));
		const statements: unknown[] = [];
		const audit = createDrizzleCorporateAdministrationAuditFactPort({
			createAuditId: () => auditId,
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
		expect(result).toEqual(errorResult.ok({ id: auditId }));
		expect(write).not.toHaveBeenCalled();
		expect(statements).toHaveLength(1);
		const [enqueuedStatement] = statements;
		if (typeof enqueuedStatement !== "function") {
			throw new Error("expected an audit transaction statement");
		}
		const query = enqueuedStatement(
			(strings: TemplateStringsArray, ...values: unknown[]) => ({
				text: strings.join("?"),
				values,
			}),
		);
		expect(query).toMatchObject({
			text: expect.stringContaining("INSERT INTO platform_audit_log"),
			values: expect.arrayContaining([auditId]),
		});
		expect(query.values).toContain(
			JSON.stringify({
				_afenda_event_context: {
					version: 1,
					outcome: "SUCCEEDED",
					source: "corporate-administration",
					occurredAt: "2026-07-26T10:00:00.000Z",
					causationId: null,
					reasonCode: null,
				},
			}),
		);
		expect(query.text).not.toContain("created_at");
	});
});
