import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { payrollModuleManifest } from "../src/composition/module.manifest";
import {
	requirePayrollCommandPermission,
	requirePayrollQueryPermission,
} from "../src/kernel/execution/authorization";
import { PAYROLL_PERMISSION_CODES } from "../src/kernel/execution/permissions";
import {
	PAYROLL_COMMAND_AUTHORIZATION,
	PAYROLL_COMMAND_IDS,
	PAYROLL_OPERATION_DEFINITIONS,
	PAYROLL_QUERY_AUTHORIZATION,
	PAYROLL_QUERY_IDS,
} from "../src/kernel/operations/registry";

const definitions = Object.values(PAYROLL_OPERATION_DEFINITIONS);

function source(relativePath: string): string {
	return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function typescriptSources(directory: string): readonly string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return typescriptSources(entryPath);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
	});
}

describe("Payroll operation registry", () => {
	it("is the unique owner of operation identity and authorization", () => {
		const permissionCodes = new Set<string>(PAYROLL_PERMISSION_CODES);
		const operationIds = definitions.map(({ id }) => id);

		const featureOwners = new Set([
			"payroll-setup",
			"employee-assignments",
			"workforce-ingress",
			"variable-inputs",
			"payroll-runs",
			"payslips",
			"privacy",
			"payroll-jobs",
			"reconciliation",
			"retro-pay",
			"final-settlement",
			"statutory-filings",
			"settlement-ingress",
		]);
		expect(definitions).toHaveLength(76);
		expect(new Set(operationIds).size).toBe(operationIds.length);
		for (const definition of definitions) {
			expect(featureOwners).toContain(definition.owner);
			expect(permissionCodes).toContain(definition.permission);
		}
	});

	it("preserves the accepted operation identity and authorization contract", () => {
		const serializedContract = JSON.stringify(
			definitions.map(({ id, kind, permission }) => ({ id, kind, permission })),
		);
		expect(createHash("sha256").update(serializedContract).digest("hex")).toBe(
			// Reviewed 2026-08-05: C3 lockPeriodInputs command.
			"24da3bfdd15f78f4dda903303c3a21a2b4aa3606ab57cb074743c0591a2c68ca",
		);
	});

	it("derives exhaustive command, query, and manifest projections", () => {
		expect(PAYROLL_COMMAND_IDS).toHaveLength(53);
		expect(PAYROLL_QUERY_IDS).toHaveLength(23);
		expect(Object.keys(PAYROLL_COMMAND_AUTHORIZATION)).toEqual(
			PAYROLL_COMMAND_IDS,
		);
		expect(Object.keys(PAYROLL_QUERY_AUTHORIZATION)).toEqual(PAYROLL_QUERY_IDS);
		expect(payrollModuleManifest.owns.commands).toEqual(PAYROLL_COMMAND_IDS);
		expect(payrollModuleManifest.owns.queries).toEqual(PAYROLL_QUERY_IDS);
		expect(payrollModuleManifest.authorization.commands).toEqual(
			PAYROLL_COMMAND_AUTHORIZATION,
		);
		expect(payrollModuleManifest.authorization.queries).toEqual(
			PAYROLL_QUERY_AUTHORIZATION,
		);
	});

	it("keeps derived projections from becoming parallel semantic sources", () => {
		expect(source("../src/kernel/operations/module-ids.ts")).not.toMatch(
			/["']payroll\.[a-z0-9.-]+["']/,
		);
		const manifest = source("../src/composition/module.manifest.ts");
		expect(manifest).toContain("PAYROLL_COMMAND_AUTHORIZATION");
		expect(manifest).toContain("PAYROLL_QUERY_AUTHORIZATION");
		expect(manifest).not.toMatch(/\[PAYROLL_(?:COMMAND|QUERY)_/);
	});

	it("forbids raw operation IDs outside their canonical owner", () => {
		const allowedSources = new Set(["kernel/execution/permissions.ts"]);
		const featureRegistryPattern =
			/^features\/[a-z-]+\/operation-registry\.ts$/;
		const sourceRoot = path.resolve(import.meta.dirname, "../src");
		for (const filePath of typescriptSources(sourceRoot)) {
			const relativePath = path
				.relative(sourceRoot, filePath)
				.replaceAll("\\", "/");
			if (
				allowedSources.has(relativePath) ||
				featureRegistryPattern.test(relativePath)
			) {
				continue;
			}
			const content = readFileSync(filePath, "utf8");
			for (const operationId of [
				...PAYROLL_COMMAND_IDS,
				...PAYROLL_QUERY_IDS,
			]) {
				expect(content, filePath).not.toContain(`"${operationId}"`);
				expect(content, filePath).not.toContain(`'${operationId}'`);
			}
		}
	});

	it("forwards every canonical permission with unchanged tenant context", async () => {
		const organizationId = "organization-synthetic";
		const actorUserId = "actor-synthetic";
		await Promise.all(
			PAYROLL_COMMAND_IDS.map(async (command) => {
				const seen: unknown[] = [];
				const result = await requirePayrollCommandPermission(
					{
						can(input) {
							seen.push(input);
							return Promise.resolve(true);
						},
					},
					{ organizationId, actorUserId, command },
				);
				expect(result.ok).toBe(true);
				expect(seen).toEqual([
					{
						organizationId,
						actorUserId,
						permission: PAYROLL_COMMAND_AUTHORIZATION[command],
					},
				]);
			}),
		);

		await Promise.all(
			PAYROLL_QUERY_IDS.map(async (query) => {
				const seen: unknown[] = [];
				const result = await requirePayrollQueryPermission(
					{
						can(input) {
							seen.push(input);
							return Promise.resolve(true);
						},
					},
					{ organizationId, actorUserId, query },
				);
				expect(result.ok).toBe(true);
				expect(seen).toEqual([
					{
						organizationId,
						actorUserId,
						permission: PAYROLL_QUERY_AUTHORIZATION[query],
					},
				]);
			}),
		);
	});

	it("fails closed and freezes every runtime projection", async () => {
		const command = PAYROLL_OPERATION_DEFINITIONS.createCalendar.id;
		const unauthorized = await requirePayrollCommandPermission(undefined, {
			organizationId: "organization-synthetic",
			actorUserId: "actor-synthetic",
			command,
		});
		expect(unauthorized).toMatchObject({ ok: false, code: "UNAUTHORIZED" });

		const forbidden = await requirePayrollCommandPermission(
			{ can: () => Promise.resolve(false) },
			{
				organizationId: "organization-synthetic",
				actorUserId: "actor-synthetic",
				command,
			},
		);
		expect(forbidden).toMatchObject({ ok: false, code: "FORBIDDEN" });

		expect(Object.isFrozen(PAYROLL_OPERATION_DEFINITIONS)).toBe(true);
		for (const definition of definitions) {
			expect(Object.isFrozen(definition)).toBe(true);
		}
		expect(Object.isFrozen(PAYROLL_COMMAND_IDS)).toBe(true);
		expect(Object.isFrozen(PAYROLL_QUERY_IDS)).toBe(true);
		expect(Object.isFrozen(PAYROLL_COMMAND_AUTHORIZATION)).toBe(true);
		expect(Object.isFrozen(PAYROLL_QUERY_AUTHORIZATION)).toBe(true);
	});
});
