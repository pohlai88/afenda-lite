import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";
import {
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	type HumanResourcesBulkExportPorts,
	type HumanResourcesBulkExportRequest,
	type HumanResourcesBulkExportSource,
	runHumanResourcesBulkExport,
} from "../src";

const request: HumanResourcesBulkExportRequest = {
	organizationId: "org-1",
	actorUserId: "actor-1",
	correlationId: "corr-1",
	requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	exportType: "employee",
	requestedFields: ["employeeNumber", "legalName"],
	dateFrom: "2026-01-01",
	dateTo: "2026-12-31",
	effectiveOn: "2026-07-28",
};

const definition = {
	exportType: "employee",
	requiredPermission: HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	allowedFields: ["employeeNumber", "legalName"],
	maximumRows: 100,
} as const;

function source(organizationId = "org-1"): HumanResourcesBulkExportSource {
	return {
		list: vi.fn(async () =>
			ok([
				{
					organizationId,
					recordId: "employee-1",
					effectiveFrom: "2026-01-01",
					effectiveTo: null,
					occurredOn: "2026-07-01",
					fields: {
						employeeNumber: "E-001",
						legalName: "Ada Lovelace",
						taxIdentifier: "must-not-leak",
					},
				},
			]),
		),
	};
}

function ports(allowed = true): HumanResourcesBulkExportPorts {
	return {
		authorize: vi.fn(async () => allowed),
		recordPrivacyEvidence: vi.fn(async () => ok({ evidenceId: "evidence-1" })),
	};
}

describe("Human Resources bulk export", () => {
	it("authorizes, tenant-binds, projects allowlisted fields and records privacy evidence", async () => {
		const exportPorts = ports();
		const result = await runHumanResourcesBulkExport(
			request,
			definition,
			source(),
			exportPorts,
		);

		expect(result).toEqual(
			ok({
				organizationId: "org-1",
				exportType: "employee",
				fields: ["employeeNumber", "legalName"],
				rows: [
					{
						recordId: "employee-1",
						fields: {
							employeeNumber: "E-001",
							legalName: "Ada Lovelace",
						},
					},
				],
				privacyEvidenceId: "evidence-1",
			}),
		);
		expect(exportPorts.recordPrivacyEvidence).toHaveBeenCalledOnce();
	});

	it("fails before reading when authorization is denied", async () => {
		const exportSource = source();
		const result = await runHumanResourcesBulkExport(
			request,
			definition,
			exportSource,
			ports(false),
		);

		expect(result.ok).toBe(false);
		expect(exportSource.list).not.toHaveBeenCalled();
	});

	it("rejects unauthorized fields and cross-tenant source rows", async () => {
		const unauthorized = await runHumanResourcesBulkExport(
			{ ...request, requestedFields: ["taxIdentifier"] },
			definition,
			source(),
			ports(),
		);
		const crossTenant = await runHumanResourcesBulkExport(
			request,
			definition,
			source("org-other"),
			ports(),
		);

		expect(unauthorized.ok).toBe(false);
		expect(crossTenant.ok).toBe(false);
	});

	it("does not release rows when privacy evidence cannot be recorded", async () => {
		const exportPorts = ports();
		exportPorts.recordPrivacyEvidence = vi.fn(async () =>
			fail("INTERNAL_ERROR", "audit unavailable"),
		);
		const result = await runHumanResourcesBulkExport(
			request,
			definition,
			source(),
			exportPorts,
		);

		expect(result).toEqual(fail("INTERNAL_ERROR", "audit unavailable"));
	});
});
