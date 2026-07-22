import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { HARD_TENANT_ROOT_TABLE_NAMES } from "@afenda/db";
import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_ERROR_CODE_LIST,
	HUMAN_RESOURCES_ERROR_CODES,
} from "../src/error-codes";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	HUMAN_RESOURCES_QUERY_IDS,
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
} from "../src/module-ids";
import { HUMAN_RESOURCES_MUTATION_TABLES } from "../src/mutation-tables";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
} from "../src/permissions";

const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);

describe("humanResourcesModuleManifest", () => {
	it("declares scratch mutation tables and permissions", () => {
		expect(humanResourcesModuleManifest.lifecycle).toBe("scaffolded");
		expect(humanResourcesModuleManifest.persistence.mutationTables).toEqual([
			...HUMAN_RESOURCES_MUTATION_TABLES,
		]);
		expect(humanResourcesModuleManifest.permissions.codes).toEqual([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		expect(HUMAN_RESOURCES_PERMISSION_CODES).toContain(
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
		);
		expect(HUMAN_RESOURCES_PERMISSION_CODES).toContain(
			HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
		);
		expect(humanResourcesModuleManifest.events.emits).toHaveLength(45);
		expect(humanResourcesModuleManifest.owns.commands).toEqual([
			...HUMAN_RESOURCES_COMMAND_IDS,
		]);
		expect(humanResourcesModuleManifest.owns.queries).toEqual([
			...HUMAN_RESOURCES_QUERY_IDS,
		]);
	});

	it("keeps auth maps aligned with shipped command and query ids", () => {
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_UPDATE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_POSITION_CREATE
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE);
		expect(
			humanResourcesModuleManifest.authorization.commands[
				HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_EMPLOYEE_GET
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_POSITION_GET
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_POSITION_LIST
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ);
		expect(
			humanResourcesModuleManifest.authorization.queries[
				HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET
			],
		).toBe(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ);
	});

	it("keeps the kernel error catalog complete", () => {
		expect(HUMAN_RESOURCES_ERROR_CODE_LIST).toHaveLength(11);
		expect(HUMAN_RESOURCES_ERROR_CODES.INVALID_INPUT).toBe(
			"human_resources.invalid_input",
		);
		expect(HUMAN_RESOURCES_ERROR_CODES.STALE_VERSION).toBe(
			"human_resources.stale_version",
		);
		expect(HUMAN_RESOURCES_ERROR_CODES.DEPENDENCY_UNAVAILABLE).toBe(
			"human_resources.dependency_unavailable",
		);
	});

	it("does not depend on payroll package import", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@afenda/payroll"]).toBeUndefined();
	});

	it("registers every mutation table as a hard tenant root (HR1)", () => {
		expect(HUMAN_RESOURCES_MUTATION_TABLES).toHaveLength(81);
		const hrRoots = HARD_TENANT_ROOT_TABLE_NAMES.filter((name) =>
			name.startsWith("hr_"),
		);
		expect(hrRoots).toEqual([...HUMAN_RESOURCES_MUTATION_TABLES]);
	});
});
