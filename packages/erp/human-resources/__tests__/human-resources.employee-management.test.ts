import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { HumanResourcesEmployeeId } from "../src/brands";
import type { HumanResourcesCommandOptions } from "../src/command-options";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED } from "../src/error-codes";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_PERSON_READ,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { getEmployeeProfile } from "../src/workforce-foundation/employee-management";
import { createPerson } from "../src/workforce-foundation/person";
import {
	addPersonContact,
	addPersonIdentifier,
} from "../src/workforce-foundation/person-management";
import { createWorker } from "../src/workforce-foundation/worker";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-employee-management-a";
const ORG_B = "org-employee-management-b";
const ACTOR = "user-employee-management";
const AS_OF = "2026-07-01";

function adminHarness(): HumanResourcesCommandOptions {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
	});
}

function requireHarnessDeps(admin: HumanResourcesCommandOptions) {
	const { store, ports } = admin;
	if (!store || !ports) {
		throw new Error("Expected harness store and ports");
	}
	return { store, ports };
}

function readHarness(
	permissions: readonly (
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ
		| typeof HUMAN_RESOURCES_PERMISSION_PERSON_READ
		| typeof HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ
	)[],
	store: ReturnType<typeof createMemoryHumanResourcesStore>,
	ports: ReturnType<typeof createMemoryMutationPorts>,
) {
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
	});
}

async function seedEmployeeWithPerson(input: {
	ready: HumanResourcesCommandOptions;
	organizationId: string;
	employeeNumber: string;
	legalName: string;
}) {
	const person = await createPerson(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			legalName: input.legalName,
		},
		input.ready,
	);
	expect(person.ok).toBe(true);
	if (!person.ok) {
		throw new Error("person create failed");
	}

	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			employeeNumber: input.employeeNumber,
			legalName: input.legalName,
		},
		input.ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) {
		throw new Error("employee create failed");
	}

	const worker = await createWorker(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			personId: person.data.id,
			workerType: "employee",
			employeeId: employee.data.id,
			effectiveFrom: "2026-01-01",
		},
		input.ready,
	);
	expect(worker.ok).toBe(true);
	if (!worker.ok) {
		throw new Error("worker create failed");
	}

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			employeeId: employee.data.id,
			startsOn: "2026-01-01",
		},
		input.ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) {
		throw new Error("employment create failed");
	}

	await addPersonContact(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			personId: person.data.id,
			contactType: "phone",
			valueText: "+1-555-0100",
			isPrimary: true,
		},
		input.ready,
	);
	await addPersonContact(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			personId: person.data.id,
			contactType: "postal_address",
			valueText: "123 Example Street",
			isPrimary: true,
		},
		input.ready,
	);
	await addPersonIdentifier(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			personId: person.data.id,
			identifierType: "ssn",
			identifierValue: "123-45-6789",
			documentRef: `vault://organizations/${ORG_A}/identity_document/ssn-1?version=1`,
			effectiveFrom: "2026-01-01",
		},
		input.ready,
	);

	return { person, employee, worker, employment };
}

describe("@afenda/human-resources employee management", () => {
	it("surfaces normalized employee number and employment-derived status on profile", async () => {
		const admin = adminHarness();
		const { employee, employment } = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "e-100",
			legalName: "Profile Subject",
		});
		const { store, ports } = requireHarnessDeps(admin);
		const ready = readHarness(
			[
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				HUMAN_RESOURCES_PERMISSION_PERSON_READ,
				HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
			],
			store,
			ports,
		);

		const profile = await getEmployeeProfile(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				employeeId: employee.data.id,
				asOf: AS_OF,
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		expect(profile.data.employeeNumber).toBe("e-100");
		expect(profile.data.employmentStatus).toBe(employment.data.status);
		expect(profile.data.organizationEntry).toMatchObject({
			enteredOn: "2026-01-01",
			employmentId: employment.data.id,
		});
	});

	it("allows self-service read with self-tier fields and redacts sensitive identifiers", async () => {
		const admin = adminHarness();
		const { employee } = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-SELF",
			legalName: "Self Subject",
		});
		const { store, ports } = requireHarnessDeps(admin);
		const ready = readHarness(
			[HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ],
			store,
			ports,
		);

		const profile = await getEmployeeProfile(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				actorEmployeeId: employee.data.id,
				employeeId: employee.data.id,
				asOf: AS_OF,
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		expect(profile.data.personalPhoneNumber).toBe("+1-555-0100");
		expect(profile.data.homeAddress).toBe("123 Example Street");
		expect(profile.data.identifierLast4).toBeNull();
		expect(
			profile.data.identifiers?.every((row) => row.identifierLast4 === ""),
		).toBe(true);
	});

	it("allows manager read for direct reports with public-tier fields only", async () => {
		const admin = adminHarness();
		const manager = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-MGR",
			legalName: "Manager Example",
		});
		const report = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-RPT",
			legalName: "Report Example",
		});
		const { store, ports } = requireHarnessDeps(admin);
		const ready = readHarness(
			[HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ],
			store,
			ports,
		);

		const line = await assignPrimaryReportingLine(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				employeeId: report.employee.data.id,
				managerEmployeeId: manager.employee.data.id,
				startsOn: "2026-01-01",
			},
			admin,
		);
		expect(line.ok).toBe(true);

		const profile = await getEmployeeProfile(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				actorEmployeeId: manager.employee.data.id,
				employeeId: report.employee.data.id,
				asOf: AS_OF,
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		expect(profile.data.legalName).toBe("Report Example");
		expect(profile.data.personalPhoneNumber).toBeNull();
		expect(profile.data.homeAddress).toBeNull();
		expect(profile.data.contacts).toBeNull();
		expect(profile.data.identifierLast4).toBeNull();
	});

	it("allows HR person read with sensitive identifier fields", async () => {
		const admin = adminHarness();
		const { employee } = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-HR",
			legalName: "HR Subject",
		});
		const { store, ports } = requireHarnessDeps(admin);
		const ready = readHarness(
			[
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				HUMAN_RESOURCES_PERMISSION_PERSON_READ,
				HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
			],
			store,
			ports,
		);

		const profile = await getEmployeeProfile(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				employeeId: employee.data.id,
				asOf: AS_OF,
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) return;

		expect(profile.data.personalPhoneNumber).toBe("+1-555-0100");
		expect(profile.data.identifierLast4).not.toBeNull();
		expect(profile.data.documentRef).toBe(
			`vault://organizations/${ORG_A}/identity_document/ssn-1?version=1`,
		);
	});

	it("denies out-of-scope manager access", async () => {
		const admin = adminHarness();
		const manager = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-MGR2",
			legalName: "Other Manager",
		});
		const unrelated = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-UNRELATED",
			legalName: "Unrelated Employee",
		});
		const { store, ports } = requireHarnessDeps(admin);
		const ready = readHarness(
			[HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ],
			store,
			ports,
		);

		const denied = await getEmployeeProfile(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				actorEmployeeId: manager.employee.data.id,
				employeeId: unrelated.employee.data.id,
				asOf: AS_OF,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
			);
		}
	});

	it("fails closed on cross-organization profile reads", async () => {
		const admin = adminHarness();
		const { employee } = await seedEmployeeWithPerson({
			ready: admin,
			organizationId: ORG_A,
			employeeNumber: "E-XORG",
			legalName: "Cross Org",
		});
		const { store, ports } = requireHarnessDeps(admin);
		const ready = readHarness(
			[
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				HUMAN_RESOURCES_PERMISSION_PERSON_READ,
			],
			store,
			ports,
		);

		const crossOrg = await getEmployeeProfile(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				employeeId: employee.data.id as HumanResourcesEmployeeId,
				asOf: AS_OF,
			},
			ready,
		);
		expect(crossOrg.ok).toBe(false);
		if (!crossOrg.ok) {
			expect([
				"human_resources.not_found",
				"human_resources.authorization_denied",
			]).toContain(humanResourcesCodeFromResult(crossOrg));
		}
	});
});
