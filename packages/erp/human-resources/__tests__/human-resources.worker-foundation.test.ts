import { describe, expect, expectTypeOf, it } from "vitest";

import {
	type HumanResourcesPersonId,
	type HumanResourcesWorkerId,
	humanResourcesPersonIdSchema,
	humanResourcesWorkerIdSchema,
} from "../src/brands";
import {
	changeWorkerStatusInputSchema,
	changeWorkerTypeInputSchema,
	createPersonInputSchema,
	createWorkerInputSchema,
	workerStatusSchema,
	workerTypeSchema,
} from "../src/schemas/workforce-foundation";
import {
	NON_EMPLOYEE_WORKER_TYPES,
	WORKER_STATUSES,
	WORKER_TYPES,
} from "../src/workforce-foundation/classification";
import type { Person, Worker } from "../src/workforce-foundation/types";

const PERSON_ID = "10000000-0000-4000-8000-000000000001";
const WORKER_ID = "20000000-0000-4000-8000-000000000001";
const EMPLOYEE_ID = "30000000-0000-4000-8000-000000000001";

const mutationContext = {
	organizationId: "org-worker-foundation",
	actorUserId: "user-worker-foundation",
	correlationId: "corr-worker-foundation",
};

const createWorkerBase = {
	...mutationContext,
	idempotencyKey: "idem-worker-foundation",
	personId: PERSON_ID,
	effectiveFrom: "2026-01-01",
};

describe("@afenda/human-resources worker foundation contracts", () => {
	it("keeps person and worker IDs nominally distinct", () => {
		expect(humanResourcesPersonIdSchema.safeParse(PERSON_ID).success).toBe(
			true,
		);
		expect(humanResourcesWorkerIdSchema.safeParse(WORKER_ID).success).toBe(
			true,
		);

		expectTypeOf<HumanResourcesPersonId>().not.toEqualTypeOf<HumanResourcesWorkerId>();
		expectTypeOf<Person["id"]>().not.toEqualTypeOf<Worker["id"]>();
	});

	it.each(WORKER_TYPES)("parses the %s worker type", (workerType) => {
		expect(workerTypeSchema.safeParse(workerType).success).toBe(true);
	});

	it.each(
		NON_EMPLOYEE_WORKER_TYPES,
	)("rejects a non-null employeeId for %s workers", (workerType) => {
		const parsed = createWorkerInputSchema.safeParse({
			...createWorkerBase,
			workerType,
			employeeId: EMPLOYEE_ID,
		});

		expect(parsed.success).toBe(false);
	});

	it("permits employee workers with a validated employeeId or null", () => {
		const linked = createWorkerInputSchema.safeParse({
			...createWorkerBase,
			workerType: "employee",
			employeeId: EMPLOYEE_ID,
		});
		const unlinked = createWorkerInputSchema.safeParse({
			...createWorkerBase,
			workerType: "employee",
			employeeId: null,
		});

		expect(linked.success).toBe(true);
		expect(unlinked.success).toBe(true);
	});

	it.each(WORKER_STATUSES)("parses the %s worker status", (status) => {
		expect(workerStatusSchema.safeParse(status).success).toBe(true);
		expect(
			changeWorkerStatusInputSchema.safeParse({
				...mutationContext,
				workerId: WORKER_ID,
				status,
				effectiveOn: "2026-01-01",
				expectedVersion: 1,
			}).success,
		).toBe(true);
	});

	it("accepts an inclusive equal end date and rejects end-before-start", () => {
		const equalBoundary = createWorkerInputSchema.safeParse({
			...createWorkerBase,
			workerType: "employee",
			employeeId: null,
			effectiveTo: "2026-01-01",
		});
		const reversedBoundary = createWorkerInputSchema.safeParse({
			...createWorkerBase,
			workerType: "employee",
			employeeId: null,
			effectiveTo: "2025-12-31",
		});

		expect(equalBoundary.success).toBe(true);
		expect(reversedBoundary.success).toBe(false);
	});

	it("rejects unknown fields in worker-foundation schemas", () => {
		const person = createPersonInputSchema.safeParse({
			...mutationContext,
			idempotencyKey: "idem-person",
			legalName: "Ada Worker",
			unexpected: true,
		});
		const worker = createWorkerInputSchema.safeParse({
			...createWorkerBase,
			workerType: "employee",
			employeeId: null,
			unexpected: true,
		});

		expect(person.success).toBe(false);
		expect(worker.success).toBe(false);
	});

	it("discriminates employee and non-employee worker-type changes", () => {
		const employee = changeWorkerTypeInputSchema.safeParse({
			...mutationContext,
			workerId: WORKER_ID,
			expectedVersion: 1,
			effectiveOn: "2026-01-01",
			workerType: "employee",
			employeeId: EMPLOYEE_ID,
		});
		const contractor = changeWorkerTypeInputSchema.safeParse({
			...mutationContext,
			workerId: WORKER_ID,
			expectedVersion: 1,
			effectiveOn: "2026-01-01",
			workerType: "contractor",
			employeeId: null,
		});
		const incompatibleContractor = changeWorkerTypeInputSchema.safeParse({
			...mutationContext,
			workerId: WORKER_ID,
			expectedVersion: 1,
			effectiveOn: "2026-01-01",
			workerType: "contractor",
			employeeId: EMPLOYEE_ID,
		});

		expect(employee.success).toBe(true);
		expect(contractor.success).toBe(true);
		expect(incompatibleContractor.success).toBe(false);
	});

	it("rejects invalid person, worker, and employee UUIDs", () => {
		expect(humanResourcesPersonIdSchema.safeParse("person-1").success).toBe(
			false,
		);
		expect(humanResourcesWorkerIdSchema.safeParse("worker-1").success).toBe(
			false,
		);
		expect(
			createWorkerInputSchema.safeParse({
				...createWorkerBase,
				personId: "person-1",
				workerType: "employee",
				employeeId: "employee-1",
			}).success,
		).toBe(false);
	});
});
