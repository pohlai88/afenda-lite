import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createEmployee } from "../src/features/workforce-records/employment/employee";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/kernel/authorization/permissions";
import { assertExpectedVersion } from "../src/kernel/execution/concurrency";
import {
	HUMAN_RESOURCES_ERROR_CODE_LIST,
	HUMAN_RESOURCES_ERROR_CODES,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/kernel/execution/error-codes";
import {
	isCreateIdempotencyUniqueViolation,
	isEmployeeNumberUniqueViolation,
	isPostgresUniqueConstraint,
	isPostgresUniqueViolation,
	mapEmployeeNumberDuplicate,
	mapPersistenceFailure,
	postgresErrorMessage,
} from "../src/kernel/execution/persistence-errors";
import {
	createEmployeeInputSchema,
	getEmployeeByIdInputSchema,
} from "../src/kernel/validation/index";
import { parseHumanResourcesInput } from "../src/kernel/validation/parse-input";
import { createMemoryHumanResourcesStore } from "../src/testing/index";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import {
	humanResourcesCodeFromResult,
	humanResourcesContextFromResult,
} from "./helpers/result-details";

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
			const details = humanResourcesContextFromResult(parsed);
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
			constraint: "hr_employee_org_normalized_number_uidx",
		};
		expect(isPostgresUniqueViolation(numberConflict)).toBe(true);
		expect(isEmployeeNumberUniqueViolation(numberConflict)).toBe(true);
		expect(
			isPostgresUniqueConstraint(
				numberConflict,
				/hr_employee_org_normalized_number_uidx/i,
			),
		).toBe(true);
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
			constraint_name: "hr_employee_org_create_idempotency_uidx",
		};
		expect(isCreateIdempotencyUniqueViolation(idempotencyConflict)).toBe(true);
		expect(
			isCreateIdempotencyUniqueViolation({
				code: "23505",
				message:
					'duplicate key value violates unique constraint "hr_employee_org_create_idempotency_uidx"',
			}),
		).toBe(false);

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
			expect(unknown.message).toBe("An unexpected error occurred");
			expect(unknown.message).not.toMatch(/relation|does not exist/i);
		}

		const hostile = Object.defineProperties(
			{},
			{
				code: {
					get() {
						throw new Error("unsafe code getter");
					},
				},
				message: {
					get() {
						throw new Error("unsafe message getter");
					},
				},
			},
		);
		expect(() => isPostgresUniqueViolation(hostile)).not.toThrow();
		expect(() =>
			mapPersistenceFailure(hostile, "Failed to create employee"),
		).not.toThrow();
		expect(postgresErrorMessage(hostile)).toBe("");
		expect(
			isPostgresUniqueConstraint(
				{
					cause: {
						code: "23505",
						constraint: "hr_attendance_event_org_source_ref_uidx",
					},
				},
				/hr_attendance_event_org_source_ref_uidx/i,
			),
		).toBe(true);
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
			HUMAN_RESOURCES_ERROR_CODES.PERSON_NOT_FOUND,
			HUMAN_RESOURCES_ERROR_CODES.WORKER_NOT_FOUND,
			HUMAN_RESOURCES_ERROR_CODES.EMPLOYMENT_NOT_FOUND,
			HUMAN_RESOURCES_ERROR_CODES.ASSIGNMENT_NOT_FOUND,
			HUMAN_RESOURCES_ERROR_CODES.DIRECTORY_REFERENCE_NOT_FOUND,
			HUMAN_RESOURCES_ERROR_CODES.DIRECTORY_REFERENCE_INACTIVE,
			HUMAN_RESOURCES_ERROR_CODES.EFFECTIVE_DATE_CONFLICT,
			HUMAN_RESOURCES_ERROR_CODES.EFFECTIVE_RANGE_OVERLAP,
			HUMAN_RESOURCES_ERROR_CODES.MULTIPLE_PRIMARY_ASSIGNMENTS,
			HUMAN_RESOURCES_ERROR_CODES.NO_DETERMINISTIC_ASSIGNMENT,
			HUMAN_RESOURCES_ERROR_CODES.ASSIGNMENT_OUTSIDE_EMPLOYMENT_RANGE,
			HUMAN_RESOURCES_ERROR_CODES.REPORTING_SELF_REFERENCE,
			HUMAN_RESOURCES_ERROR_CODES.REPORTING_CYCLE,
			HUMAN_RESOURCES_ERROR_CODES.MANAGER_ASSIGNMENT_NOT_EFFECTIVE,
			HUMAN_RESOURCES_ERROR_CODES.REHIRE_REQUIRES_ENDED_EMPLOYMENT,
			HUMAN_RESOURCES_ERROR_CODES.INCOMPATIBLE_WORKER_TYPE,
			HUMAN_RESOURCES_ERROR_CODES.SENSITIVE_FIELD_ACCESS_DENIED,
			HUMAN_RESOURCES_ERROR_CODES.AUTHORIZATION_DENIED,
			HUMAN_RESOURCES_ERROR_CODES.CONCURRENCY_CONFLICT,
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
