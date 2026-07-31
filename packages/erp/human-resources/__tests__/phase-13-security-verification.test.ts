import { errorResult } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";
import {
	createHumanResourcesAuditIntegritySeal,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	type HumanResourcesBulkExportDefinition,
	type HumanResourcesBulkExportPorts,
	type HumanResourcesBulkExportRequest,
	runHumanResourcesBulkExport,
	verifyHumanResourcesAuditIntegrity,
} from "../src";
import { createCompensationGrade } from "../src/compensation-benefits/compensation-grade";
import { createVaultDocumentReferenceAdapter } from "../src/compliance/vault-document-reference-adapter";
import { runSequential } from "../src/shared/run-sequential";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const request: HumanResourcesBulkExportRequest = {
	organizationId: "org-security-a",
	actorUserId: "actor-security",
	correlationId: "corr-security",
	requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	exportType: "employee",
	requestedFields: ["employeeNumber"],
};

const definition: HumanResourcesBulkExportDefinition = {
	exportType: "employee",
	requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	allowedFields: ["employeeNumber"],
	maximumRows: 10,
};

function exportPorts(allowed = true): HumanResourcesBulkExportPorts {
	return {
		authorize: vi.fn(async () => allowed),
		recordPrivacyEvidence: vi.fn(async () =>
			errorResult.ok({ evidenceId: "evidence-security" }),
		),
	};
}

describe("Phase 13.3 HR security verification", () => {
	it("blocks cross-tenant export rows before evidence or disclosure", async () => {
		const ports = exportPorts();
		const result = await runHumanResourcesBulkExport(
			request,
			definition,
			{
				list: vi.fn(async () =>
					errorResult.ok([
						{
							organizationId: "org-security-b",
							recordId: "employee-foreign",
							effectiveFrom: null,
							effectiveTo: null,
							occurredOn: "2026-07-28",
							fields: { employeeNumber: "FOREIGN-001" },
						},
					]),
				),
			},
			ports,
		);

		expect(result).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(JSON.stringify(result)).not.toContain("FOREIGN-001");
		expect(ports.recordPrivacyEvidence).not.toHaveBeenCalled();
	});

	it("rejects sensitive-field probing before reading the export source", async () => {
		const source = { list: vi.fn(async () => errorResult.ok([])) };
		const result = await runHumanResourcesBulkExport(
			{ ...request, requestedFields: ["taxIdentifier-secret-probe"] },
			definition,
			source,
			exportPorts(),
		);

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(source.list).not.toHaveBeenCalled();
		expect(JSON.stringify(result)).not.toContain("taxIdentifier-secret-probe");
	});

	it("prevents privilege escalation by binding permission to the export definition", async () => {
		const ports = exportPorts(true);
		const source = { list: vi.fn(async () => errorResult.ok([])) };
		const result = await runHumanResourcesBulkExport(
			{
				...request,
				requiredPermission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			},
			definition,
			source,
			ports,
		);

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(ports.authorize).not.toHaveBeenCalled();
		expect(source.list).not.toHaveBeenCalled();
	});

	it("fails bulk export closed when authorization is denied", async () => {
		const ports = exportPorts(false);
		const source = { list: vi.fn(async () => errorResult.ok([])) };
		const result = await runHumanResourcesBulkExport(
			request,
			definition,
			source,
			ports,
		);

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(source.list).not.toHaveBeenCalled();
		expect(ports.recordPrivacyEvidence).not.toHaveBeenCalled();
	});

	it("rejects encoded separators at the document-reference boundary", async () => {
		const adapter = createVaultDocumentReferenceAdapter();
		await runSequential(
			[
				"vault://organizations/org-security-a/passport/folder%2Fdoc-1",
				"vault://organizations/org-security-a%2Fadmin/passport/doc-1",
				"vault://organizations/org-security-a/passport/doc%5C1",
			],
			async (reference) => {
				const result = await adapter.validateReference({
					organizationId: "org-security-a",
					reference,
				});
				expect(result.ok, reference).toBe(false);
			},
		);
	});

	it("rolls back a mutation when append-only audit recording fails", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts({ auditFailAfter: 0 });
		const result = await createCompensationGrade(
			{
				organizationId: "org-security-a",
				actorUserId: "comp-admin",
				correlationId: "corr-audit-failure",
				code: "SEC-13",
				name: "Security Grade",
			},
			{
				store,
				ports,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				]),
			},
		);

		expect(result).toEqual(errorResult.fail("INTERNAL_ERROR"));
		const persisted = await store.listCompensationGrades({
			organizationId: "org-security-a",
			page: 1,
			pageSize: 20,
		});
		expect(persisted).toMatchObject({
			ok: true,
			data: { totalCount: 0, grades: [] },
		});
		expect(ports.audit.calls).toHaveLength(1);
		expect(ports.outbox.calls).toHaveLength(0);
	});

	it("detects audit mutation, deletion, reordering, and tenant substitution", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
		]);
		await runSequential(
			[
				["SEC-13-A", "Security Grade A"],
				["SEC-13-B", "Security Grade B"],
			] as const,
			async ([code, name]) => {
				const created = await createCompensationGrade(
					{
						organizationId: "org-security-a",
						actorUserId: "comp-admin",
						correlationId: `corr-audit-integrity-${code}`,
						code,
						name,
					},
					{ store, ports, authorization },
				);
				expect(created.ok).toBe(true);
			},
		);

		const records = ports.audit.calls.map((fact, entryIndex) => ({
			auditId: `audit-security-${entryIndex + 1}`,
			fact,
		}));
		const [first, second] = records;
		if (first === undefined || second === undefined) {
			throw new Error("Expected two captured audit facts");
		}
		const seal = createHumanResourcesAuditIntegritySeal({
			organizationId: "org-security-a",
			records,
		});

		expect(verifyHumanResourcesAuditIntegrity({ records, seal })).toEqual({
			valid: true,
			verifiedEntryCount: 2,
			rootDigest: seal.rootDigest,
		});

		const mutatedRecords = [
			{
				...first,
				fact: {
					...first.fact,
					newValue: {
						...first.fact.newValue,
						name: "Tampered Security Grade",
					},
				},
			},
			second,
		];
		expect(
			verifyHumanResourcesAuditIntegrity({ records: mutatedRecords, seal }),
		).toEqual({
			valid: false,
			reason: "entry_digest_mismatch",
			entryIndex: 0,
		});
		expect(
			verifyHumanResourcesAuditIntegrity({ records: [first], seal }),
		).toEqual({
			valid: false,
			reason: "entry_count_mismatch",
			entryIndex: null,
		});
		expect(
			verifyHumanResourcesAuditIntegrity({
				records: [second, first],
				seal,
			}),
		).toEqual({
			valid: false,
			reason: "audit_id_mismatch",
			entryIndex: 0,
		});
		expect(
			verifyHumanResourcesAuditIntegrity({
				records: [
					first,
					{
						...second,
						fact: {
							...second.fact,
							organizationId: "org-security-b",
						},
					},
				],
				seal,
			}),
		).toEqual({
			valid: false,
			reason: "organization_mismatch",
			entryIndex: 1,
		});
	});
});
