import { describe, expect, it } from "vitest";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import {
	createPerson,
	getPersonById,
} from "../src/workforce-foundation/person";
import {
	createWorker,
	getWorkerById,
} from "../src/workforce-foundation/worker";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createStoreBackedIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-workforce-foundation-cmd";
const ACTOR = "user-workforce-foundation-cmd";

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

describe("@afenda/human-resources workforce foundation commands (memory)", () => {
	it("creates a person and reads it back", async () => {
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
		if (!created.ok) return;

		const loaded = await getPersonById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-person-get",
				personId: created.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (loaded.ok) {
			expect(loaded.data?.legalName).toBe("Ada Lovelace");
		}
	});

	it("creates a contractor worker linked to a person", async () => {
		const ready = harness();
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-person-for-worker",
				idempotencyKey: "idem-person-for-worker",
				legalName: "Contractor Person",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) return;

		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-worker-create",
				idempotencyKey: "idem-worker-create",
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2026-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) return;

		const loaded = await getWorkerById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-worker-get",
				workerId: worker.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (loaded.ok) {
			expect(loaded.data?.personId).toBe(person.data.id);
			expect(loaded.data?.workerType).toBe("contractor");
		}
	});
});
