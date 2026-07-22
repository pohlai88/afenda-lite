import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import {
	HUMAN_RESOURCES_ERROR_CODE_LIST,
	HUMAN_RESOURCES_ERROR_CODES,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import { parseHumanResourcesInput } from "../src/parse-input";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import {
	createEmployeeInputSchema,
	getEmployeeByIdInputSchema,
} from "../src/schemas";
import { assertExpectedVersion } from "../src/shared/concurrency";
import {
	isCreateIdempotencyUniqueViolation,
	isEmployeeNumberUniqueViolation,
	isPostgresUniqueViolation,
	mapEmployeeNumberDuplicate,
	mapPersistenceFailure,
} from "../src/shared/persistence-errors";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const SRC_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);

describe("@afenda/human-resources kernel", () => {
	it("maps parse failures to invalid_input with fieldErrors", () => {
		const parsed = parseHumanResourcesInput(
			createEmployeeInputSchema,
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-1",
				idempotencyKey: "idem-1",
				employeeNumber: "",
				legalName: "Name",
			},
			"Invalid employee create input",
		);
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) {
			expect(parsed.code).toBe("VALIDATION_ERROR");
			expect(humanResourcesCodeFromResult(parsed)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
			const details = parsed.details;
			expect(
				typeof details === "object" &&
					details !== null &&
					"fieldErrors" in details &&
					typeof details.fieldErrors === "object" &&
					details.fieldErrors !== null &&
					"employeeNumber" in details.fieldErrors,
			).toBe(true);
		}
	});

	it("rejects unknown keys via .strict() schemas", () => {
		const parsed = parseHumanResourcesInput(
			createEmployeeInputSchema,
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-1",
				idempotencyKey: "idem-1",
				employeeNumber: "E-1",
				legalName: "Name",
				extra: "nope",
			},
			"Invalid employee create input",
		);
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) {
			expect(humanResourcesCodeFromResult(parsed)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}
	});

	it("rejects nested tenant-context injection attempts", () => {
		const parsed = parseHumanResourcesInput(
			getEmployeeByIdInputSchema,
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-1",
				employeeId: "10000000-0000-4000-8000-000000000001",
				nested: {
					organizationId: "org-evil",
					actorUserId: "attacker",
					correlationId: "evil",
				},
			},
			"Invalid employee get input",
		);
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) {
			expect(humanResourcesCodeFromResult(parsed)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}
	});

	it("applies stamp-last tenant context over client organizationId", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		const clientPayload = {
			organizationId: "org-client-spoof",
			actorUserId: "client-user",
			correlationId: "client-corr",
			idempotencyKey: "idem-stamp",
			employeeNumber: "E-STAMP",
			legalName: "Stamped",
		};
		const commandInput = {
			...clientPayload,
			organizationId: "org-session",
			actorUserId: "session-user",
			correlationId: "session-corr",
		};
		const created = await createEmployee(commandInput, {
			store,
			ports,
			authorization,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.organizationId).toBe("org-session");
		expect(created.data.createdBy).toBe("session-user");
	});

	it("maps stale expectedVersion to stale_version", () => {
		const result = assertExpectedVersion(2, 1);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
		expect(assertExpectedVersion(3, 3).ok).toBe(true);
	});

	it("normalizes drizzle unique violations without leaking SQL", () => {
		const numberConflict = {
			code: "23505",
			message:
				'duplicate key value violates unique constraint "hr_employee_org_normalized_number_uidx"',
		};
		expect(isPostgresUniqueViolation(numberConflict)).toBe(true);
		expect(isEmployeeNumberUniqueViolation(numberConflict)).toBe(true);
		expect(isCreateIdempotencyUniqueViolation(numberConflict)).toBe(false);

		const mapped = mapEmployeeNumberDuplicate();
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.code).toBe("CONFLICT");
			expect(humanResourcesCodeFromResult(mapped)).toBe(
				HUMAN_RESOURCES_ERROR_DUPLICATE,
			);
			expect(mapped.message).not.toMatch(/hr_employee|uidx|SELECT|INSERT/i);
		}

		const idempotencyConflict = {
			code: "23505",
			message:
				'duplicate key value violates unique constraint "hr_employee_org_create_idempotency_uidx"',
		};
		expect(isCreateIdempotencyUniqueViolation(idempotencyConflict)).toBe(true);

		const unknown = mapPersistenceFailure(
			new Error("relation hr_employee does not exist"),
			"Failed to create employee",
		);
		expect(unknown.ok).toBe(false);
		if (!unknown.ok) {
			expect(unknown.code).toBe("INTERNAL_ERROR");
			expect(humanResourcesCodeFromResult(unknown)).toBe(
				HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
			);
			expect(unknown.message).toBe("Failed to create employee");
			expect(unknown.message).not.toMatch(/relation|does not exist/i);
		}
	});

	it("exports the mission error-code catalog", () => {
		expect(HUMAN_RESOURCES_ERROR_CODE_LIST).toEqual([
			HUMAN_RESOURCES_ERROR_CODES.INVALID_INPUT,
			HUMAN_RESOURCES_ERROR_CODES.UNAUTHORIZED,
			HUMAN_RESOURCES_ERROR_CODES.FORBIDDEN,
			HUMAN_RESOURCES_ERROR_CODES.NOT_FOUND,
			HUMAN_RESOURCES_ERROR_CODES.CONFLICT,
			HUMAN_RESOURCES_ERROR_CODES.DUPLICATE,
			HUMAN_RESOURCES_ERROR_CODES.INVALID_STATE_TRANSITION,
			HUMAN_RESOURCES_ERROR_CODES.STALE_VERSION,
			HUMAN_RESOURCES_ERROR_CODES.CROSS_ORGANIZATION_REFERENCE,
			HUMAN_RESOURCES_ERROR_CODES.DEPENDENCY_UNAVAILABLE,
			HUMAN_RESOURCES_ERROR_CODES.PERSISTENCE_FAILURE,
		]);
	});

	it("keeps the root barrel free of persistence internals", () => {
		const barrel = readFileSync(path.join(SRC_ROOT, "index.ts"), "utf8");
		expect(barrel).toMatch(/import "server-only"/);
		expect(barrel).not.toMatch(/from ["']\.\/drizzle-store["']/);
		expect(barrel).not.toMatch(/from ["']\.\/memory-store["']/);
		expect(barrel).not.toMatch(/from ["']\.\/production-ports["']/);
		expect(barrel).not.toMatch(/from ["']\.\/resolve-store["']/);
		expect(barrel).not.toMatch(/@afenda\/db/);
		expect(barrel).not.toMatch(/next\//);
		expect(barrel).not.toMatch(/\bNextRequest\b|\bNextResponse\b/);
	});
});
