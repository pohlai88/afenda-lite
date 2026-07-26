import { describe, expect, it, vi } from "vitest";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../src/authorization";
import {
	CORPORATE_ADMINISTRATION_ERROR_CODES,
	CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON,
	corporateAdministrationErrorDetails,
} from "../src/error-codes";
import {
	corporateAdministrationEventTypeSchema,
	createCorporateAdministrationEventType,
} from "../src/event-types";
import { organizationIdSchema, userIdSchema } from "../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
} from "../src/module-ids";
import { CORPORATE_ADMINISTRATION_PERMISSION_CODES } from "../src/permissions";

const EXPECTED_PERMISSIONS = [
	"corporate_administration.access",
	"corporate_administration.company.read",
	"corporate_administration.company.manage",
	"corporate_administration.company.activate",
	"corporate_administration.company.dissolve",
	"corporate_administration.establishment.manage",
	"corporate_administration.governance.read",
	"corporate_administration.governance.manage",
	"corporate_administration.officer.manage",
	"corporate_administration.meeting.manage",
	"corporate_administration.resolution.manage",
	"corporate_administration.authority.read",
	"corporate_administration.authority.manage",
	"corporate_administration.authority.publish",
	"corporate_administration.seal.manage",
	"corporate_administration.capital.read",
	"corporate_administration.capital.configure",
	"corporate_administration.capital.post",
	"corporate_administration.capital.reverse",
	"corporate_administration.ownership.read",
	"corporate_administration.ownership.manage",
	"corporate_administration.ubo.read",
	"corporate_administration.ubo.manage",
	"corporate_administration.ubo.attest",
	"corporate_administration.distribution.declare",
	"corporate_administration.assets.read",
	"corporate_administration.assets.manage",
	"corporate_administration.licence.manage",
	"corporate_administration.charge.manage",
	"corporate_administration.banking.read",
	"corporate_administration.banking.manage",
	"corporate_administration.bank_mandate.manage",
	"corporate_administration.group.read",
	"corporate_administration.group.manage",
	"corporate_administration.related_party.manage",
	"corporate_administration.agreement.manage",
	"corporate_administration.corporate_action.manage",
	"corporate_administration.corporate_action.approve_effect",
	"corporate_administration.document.read",
	"corporate_administration.document.manage",
	"corporate_administration.register.certify",
	"corporate_administration.compliance_rule.manage",
	"corporate_administration.filing.read",
	"corporate_administration.filing.manage",
	"corporate_administration.filing.waive",
	"corporate_administration.import.prepare",
	"corporate_administration.import.approve",
	"corporate_administration.import.apply",
	"corporate_administration.export",
	"corporate_administration.reconcile",
	"corporate_administration.sensitive_export",
	"corporate_administration.module_admin",
] as const;

const EXPECTED_ERROR_CODES = [
	"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
	"CORPORATE_ADMINISTRATION_NOT_FOUND",
	"CORPORATE_ADMINISTRATION_FORBIDDEN",
	"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
	"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
	"CORPORATE_ADMINISTRATION_CONFLICT",
	"CORPORATE_ADMINISTRATION_STALE_VERSION",
	"CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
	"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
	"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
	"CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID",
	"CORPORATE_ADMINISTRATION_LEDGER_UNBALANCED",
	"CORPORATE_ADMINISTRATION_INSUFFICIENT_HOLDING",
	"CORPORATE_ADMINISTRATION_GRAPH_CYCLE",
	"CORPORATE_ADMINISTRATION_APPROVAL_REQUIRED",
	"CORPORATE_ADMINISTRATION_APPROVAL_INVALID",
	"CORPORATE_ADMINISTRATION_SEGREGATION_OF_DUTIES",
	"CORPORATE_ADMINISTRATION_SENSITIVE_DATA_REJECTED",
	"CORPORATE_ADMINISTRATION_RULE_PACK_INVALID",
	"CORPORATE_ADMINISTRATION_RECONCILIATION_FAILED",
	"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
] as const;

describe("Corporate Administration catalogs", () => {
	it("publishes exactly the 52 unique authority permissions", () => {
		expect(CORPORATE_ADMINISTRATION_PERMISSION_CODES).toEqual(
			EXPECTED_PERMISSIONS,
		);
		expect(CORPORATE_ADMINISTRATION_PERMISSION_CODES).toHaveLength(52);
		expect(new Set(CORPORATE_ADMINISTRATION_PERMISSION_CODES).size).toBe(52);
	});

	it("keeps the operation registry complete while CA-0.2 exposes no operations", () => {
		expect(CORPORATE_ADMINISTRATION_COMMAND_IDS).toEqual([]);
		expect(CORPORATE_ADMINISTRATION_QUERY_IDS).toEqual([]);
		expect(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS).toEqual({});
		expect(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS).toEqual({});
		expect(Object.keys(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS)).toEqual(
			CORPORATE_ADMINISTRATION_COMMAND_IDS,
		);
		expect(Object.keys(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS)).toEqual(
			CORPORATE_ADMINISTRATION_QUERY_IDS,
		);
	});

	it("publishes exactly 21 semantic reasons mapped to the closed Result vocabulary", () => {
		expect(CORPORATE_ADMINISTRATION_ERROR_CODES).toEqual(EXPECTED_ERROR_CODES);
		expect(new Set(CORPORATE_ADMINISTRATION_ERROR_CODES).size).toBe(21);
		expect(Object.keys(CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON)).toEqual(
			EXPECTED_ERROR_CODES,
		);
		expect(
			new Set(Object.values(CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON)),
		).toEqual(
			new Set([
				"VALIDATION_ERROR",
				"NOT_FOUND",
				"FORBIDDEN",
				"CONFLICT",
				"SERVICE_UNAVAILABLE",
			]),
		);
	});

	it("builds tenant-safe semantic details from allowlisted metadata", () => {
		expect(
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					entityType: "legal_company",
					expectedVersion: 4,
					actualVersion: 5,
					correlationId: "corr-1",
				},
			),
		).toEqual({
			reason: "CORPORATE_ADMINISTRATION_STALE_VERSION",
			entityType: "legal_company",
			expectedVersion: 4,
			actualVersion: 5,
			correlationId: "corr-1",
		});
		expect(() =>
			Reflect.apply(corporateAdministrationErrorDetails, undefined, [
				"CORPORATE_ADMINISTRATION_CONFLICT",
				{ sql: "select * from protected_identity" },
			]),
		).toThrow();
		expect(() =>
			corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
				entityType: "Error: stack trace",
			}),
		).toThrow();
	});

	it("fails closed when authorization is absent or denies the permission", async () => {
		const input = {
			organizationId: organizationIdSchema.parse("org-1"),
			actorUserId: userIdSchema.parse("user-1"),
			permission: "corporate_administration.company.read" as const,
		};

		await expect(
			requireCorporateAdministrationPermission(undefined, input),
		).resolves.toMatchObject({ ok: false, code: "FORBIDDEN" });
		const can = vi.fn().mockResolvedValue(false);
		await expect(
			requireCorporateAdministrationPermission({ can }, input),
		).resolves.toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(can).toHaveBeenCalledWith(input);
	});

	it("accepts only versioned Corporate Administration event identities", () => {
		expect(
			createCorporateAdministrationEventType({
				aggregate: "legal_company",
				action: "draft_registered",
				version: 1,
			}),
		).toBe("corporate_administration.legal_company.draft_registered.v1");
		expect(
			corporateAdministrationEventTypeSchema.safeParse(
				"corporate_administration.filing_submission.acknowledged.v12",
			).success,
		).toBe(true);

		for (const invalid of [
			"corporate-administration.legal_company.created.v1",
			"corporate_administration.LegalCompany.created.v1",
			"corporate_administration.legal_company.created.v0",
			"corporate_administration.legal_company.created.v01",
			"corporate_administration.legal_company.created",
			"corporate_administration.legal_company.create.v1",
		]) {
			expect(
				corporateAdministrationEventTypeSchema.safeParse(invalid).success,
			).toBe(false);
		}
		expect(() =>
			createCorporateAdministrationEventType({
				aggregate: "legal_company",
				action: "created",
				version: 0,
			}),
		).toThrow(RangeError);
	});
});
