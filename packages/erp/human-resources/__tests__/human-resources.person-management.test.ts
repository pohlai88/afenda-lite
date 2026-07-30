import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { collectHumanResourcesSubjectData } from "../src/privacy/subject-data-collector";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createPerson } from "../src/workforce-foundation/person";
import {
	addPersonContact,
	addPersonIdentifier,
	detectPersonDuplicates,
	listPersonContacts,
	listPersonIdentifiers,
	retirePersonContact,
	setPersonPrivacyClassification,
	updatePersonPreferredName,
} from "../src/workforce-foundation/person-management";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createStoreBackedIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { definePersonManagementParity } from "./helpers/person-management-parity";

const ORG = "org-person-management";
const ORG_B = "org-person-management-b";
const ACTOR = "user-person-management";

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	const identityResolver = createStoreBackedIdentityResolver(store);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
		identityResolver,
	});
}

describe("@afenda/human-resources person management (memory)", () => {
	it("updates preferred name and privacy classification", async () => {
		const ready = harness();
		const created = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-person-create",
				idempotencyKey: "idem-person-create",
				legalName: "Ada Lovelace",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const preferred = await updatePersonPreferredName(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-preferred",
				personId: created.data.id,
				preferredName: "Ada",
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(preferred.ok).toBe(true);
		if (!preferred.ok) {
			return;
		}
		expect(preferred.data.preferredName).toBe("Ada");

		const classified = await setPersonPrivacyClassification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-privacy",
				personId: preferred.data.id,
				privacyClassification: "medical_and_leave",
				expectedVersion: preferred.data.version,
			},
			ready,
		);
		expect(classified.ok).toBe(true);
		if (classified.ok) {
			expect(classified.data.privacyClassification).toBe("medical_and_leave");
		}
	});

	it("manages person contacts with primary uniqueness", async () => {
		const ready = harness();
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-person-contact",
				idempotencyKey: "idem-person-contact",
				legalName: "Contact Subject",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const email = await addPersonContact(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-contact-add",
				idempotencyKey: "idem-contact-add",
				personId: person.data.id,
				contactType: "email",
				valueText: "Ada@Example.com",
				isPrimary: true,
			},
			ready,
		);
		expect(email.ok).toBe(true);
		if (!email.ok) {
			return;
		}

		const listed = await listPersonContacts(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-contact-list",
				personId: person.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.normalizedValue).toBe("ada@example.com");
		}

		const retired = await retirePersonContact(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-contact-retire",
				personId: person.data.id,
				contactId: email.data.id,
				expectedVersion: email.data.version,
			},
			ready,
		);
		expect(retired.ok).toBe(true);
		if (retired.ok) {
			expect(retired.data.status).toBe("retired");
		}
	});

	it("adds and lists person identifiers", async () => {
		const ready = harness();
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-person-identifier",
				idempotencyKey: "idem-person-identifier",
				legalName: "Identifier Subject",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const identifier = await addPersonIdentifier(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-identifier-add",
				idempotencyKey: "idem-identifier-add",
				personId: person.data.id,
				identifierType: "national_id",
				identifierValue: "123456789012",
				effectiveFrom: "2026-01-01",
			},
			ready,
		);
		expect(identifier.ok).toBe(true);
		if (!identifier.ok) {
			return;
		}
		expect(identifier.data.identifierLast4).toBe("9012");

		const listed = await listPersonIdentifiers(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-identifier-list",
				personId: person.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
		}
	});

	it("detects duplicates by legal name and email within org only", async () => {
		const ready = harness();
		const first = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-dup-a",
				idempotencyKey: "idem-dup-a",
				legalName: "Duplicate Name",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const second = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-dup-b",
				idempotencyKey: "idem-dup-b",
				legalName: "Duplicate Name",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}

		await addPersonContact(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-dup-email",
				idempotencyKey: "idem-dup-email",
				personId: first.data.id,
				contactType: "email",
				valueText: "dup@example.com",
				isPrimary: true,
			},
			ready,
		);

		await createPerson(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-dup-other-org",
				idempotencyKey: "idem-dup-other-org",
				legalName: "Duplicate Name",
			},
			ready,
		);

		const matches = await detectPersonDuplicates(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-dup-detect",
				personId: second.data.id,
			},
			ready,
		);
		expect(matches.ok).toBe(true);
		if (!matches.ok) {
			return;
		}

		const other = matches.data.find(
			(candidate) => candidate.personId === first.data.id,
		);
		expect(other).toBeDefined();
		expect(other?.matchReasons).toContain("legal_name");
		expect(
			matches.data.every((candidate) => candidate.personId !== second.data.id),
		).toBe(true);
		expect(
			matches.data.every((candidate) =>
				candidate.matchReasons.includes("email")
					? candidate.personId === first.data.id
					: true,
			),
		).toBe(true);
	});

	it("includes person records in subject export when worker linkage exists", async () => {
		const ready = harness();
		const { createEmployee } = await import("../src/core/employee");
		const { createWorker } = await import("../src/workforce-foundation/worker");
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-export-person",
				idempotencyKey: "idem-export-person",
				legalName: "Export Subject",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-export-employee",
				idempotencyKey: "idem-export-employee",
				employeeNumber: "EMP-PERSON-EXPORT",
				legalName: "Export Subject",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			return;
		}

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-export-worker",
				idempotencyKey: "idem-export-worker",
				personId: person.data.id,
				workerType: "employee",
				employeeId: employee.data.id,
				effectiveFrom: "2026-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}

		await updatePersonPreferredName(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-export-preferred",
				personId: person.data.id,
				preferredName: "Export Preferred",
				expectedVersion: person.data.version,
			},
			ready,
		);

		const collected = await collectHumanResourcesSubjectData({
			organizationId: ORG,
			subjectEmployeeId: employee.data.id,
			correlationId: "corr-export-collect",
			store: ready.store,
		});
		expect(collected.ok).toBe(true);
		if (!collected.ok) {
			return;
		}

		expect(collected.data.subject.personId).toBe(person.data.id);
		expect(collected.data.subject.personId).not.toBe(employee.data.id);
		expect(
			collected.data.records.some(
				(record) => record.entityType === "hr_person",
			),
		).toBe(true);
		expect(
			collected.data.records.some(
				(record) => record.entityType === "hr_person_identity_version",
			),
		).toBe(true);
	});
});

describe("@afenda/human-resources person management parity (memory)", () => {
	definePersonManagementParity("memory");
});
