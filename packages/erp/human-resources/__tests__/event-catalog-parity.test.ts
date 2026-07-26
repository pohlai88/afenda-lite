import {
	HANDOFF_PAYROLL_CONTRACT_VERSION,
	HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
	HumanResourcesEventSchemas,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import {
	CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES,
	type ClassifiedHumanResourcesDomainEventType,
	getEventCatalogEntry,
	HUMAN_RESOURCES_EVENT_CATALOG,
	listDomainEventTypesFromRegistry,
	validateHumanResourcesEventCatalog,
} from "../src/event-catalog";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } from "../src/mutation-emission-registry";

const goldenPayload = {
	organizationId: "org-1",
	entityType: "hr_employee",
	entityId: "00000000-0000-4000-8000-000000000001",
	actorId: "user-1",
	correlationId: "corr-trace-1",
	operation: "human-resources.employee.create",
	idempotencyKey: "idem-event-catalog",
};

function validCatalogPayload(eventType: HumanResourcesEventType) {
	if (eventType === HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT) {
		return {
			contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
			organizationId: "org-1",
			employeeId: "emp-1",
			employmentId: "employment-1",
			assignment: {
				assignmentId: "assignment-1",
				positionId: "position-1",
				departmentId: "dept-1",
				locationKey: null,
				legalEntityKey: "le-1",
			},
			effectiveDate: "2025-01-01",
			currencyCode: "USD",
			baseAmount: "85000.00",
			decimalScale: 2,
			roundingMode: "half_even" as const,
			payFrequency: "monthly" as const,
			components: [
				{
					code: "base",
					kind: "base" as const,
					amount: "85000.00",
					currencyCode: "USD",
					decimalScale: 2,
					sourceType: "hr_employee_compensation",
					sourceId: "comp-1",
					sourceVersion: 1,
				},
			],
			leaveFacts: [],
			timeFacts: null,
			overtimeFacts: [],
			sourceVersion: { compensationVersion: 1 },
			approvalEvidence: {
				approvedAt: "2025-01-02T10:00:00.000Z",
				approvedBy: "actor-1",
				correlationId: "corr-trace-1",
			},
		};
	}

	const entry = getEventCatalogEntry(eventType);
	const probationBase = {
		...goldenPayload,
		employmentId: "employment-1",
	};
	const candidatePayloads = [
		goldenPayload,
		{
			...goldenPayload,
			effectiveOn: "2026-01-15",
		},
		{
			...goldenPayload,
			confirmedOn: "2026-01-15",
			evidenceNote: "Probation review passed.",
		},
		{
			...probationBase,
			newEndsOn: "2026-06-30",
			reason: "Extended probation period.",
		},
		{
			...probationBase,
			outcome: "passed" as const,
			outcomeRecordedOn: "2026-01-15",
			reason: "Probation review passed.",
		},
		{
			...probationBase,
			probationReviewId: "probation-review-1",
			reviewedOn: "2026-01-15",
			reason: "Assessment recorded.",
		},
	];

	for (const payload of candidatePayloads) {
		if (entry.schema.safeParse(payload).success) {
			return payload;
		}
	}

	return goldenPayload;
}

describe("human-resources event catalog parity", () => {
	it("catalog covers every classified registry domain_event type", () => {
		const registryTypes = listDomainEventTypesFromRegistry(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
		);
		expect(CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES).toEqual(
			registryTypes,
		);
		expect(Object.keys(HUMAN_RESOURCES_EVENT_CATALOG).sort()).toEqual([
			...registryTypes,
		]);
		expect(CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES).toHaveLength(
			registryTypes.length,
		);
	});

	it("gives every HR event an owner and consumer disposition", () => {
		for (const entry of Object.values(HUMAN_RESOURCES_EVENT_CATALOG)) {
			expect(entry.ownerPackage).toBe("@afenda/human-resources");
			expect(entry.projection).toBeDefined();
			if (entry.projection.mode !== "documented_no_consumer") {
				expect(entry.consumers.length).toBeGreaterThan(0);
			}
		}
	});

	it("validates catalog registry compliance without issues", () => {
		expect(validateHumanResourcesEventCatalog()).toEqual([]);
	});

	it("every catalog entry has schema, owner, version, and projection disposition", () => {
		for (const eventType of CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES) {
			const entry = getEventCatalogEntry(eventType);
			expect(entry.eventType).toBe(eventType);
			expect(entry.version).toBeGreaterThan(0);
			expect(entry.ownerPackage).toBe("@afenda/human-resources");
			expect(entry.consumers).toEqual([]);
			expect(entry.projection.mode).toBe("documented_no_consumer");
			if (entry.projection.mode === "documented_no_consumer") {
				expect(entry.projection.reason.trim().length).toBeGreaterThan(0);
			}
			expect(HumanResourcesEventSchemas[eventType]).toBe(entry.schema);
		}
	});

	it("every catalog schema requires organizationId and correlationId", () => {
		for (const eventType of CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES) {
			const entry = getEventCatalogEntry(eventType);
			const validPayload = validCatalogPayload(eventType);

			const missingOrg = entry.schema.safeParse({
				...validPayload,
				organizationId: "",
			});
			expect(missingOrg.success).toBe(false);

			if (eventType === HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT) {
				const valid = entry.schema.safeParse(validPayload);
				expect(valid.success, JSON.stringify(valid)).toBe(true);
				const missingApprovalCorrelation = entry.schema.safeParse({
					...validPayload,
					approvalEvidence: {
						...validPayload.approvalEvidence,
						correlationId: "",
					},
				});
				expect(missingApprovalCorrelation.success).toBe(false);
				continue;
			}

			const missingCorrelation = entry.schema.safeParse({
				...validPayload,
				correlationId: "",
			});
			expect(missingCorrelation.success).toBe(false);

			const valid = entry.schema.safeParse(validPayload);
			expect(valid.success, eventType).toBe(true);
		}
	});

	it("every catalog key is in manifest emits and HumanResourcesEventSchemas", () => {
		const emitSet = new Set(humanResourcesModuleManifest.events.emits);
		for (const eventType of CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES) {
			expect(emitSet.has(eventType)).toBe(true);
			expect(HumanResourcesEventSchemas[eventType]).toBeDefined();
		}
	});

	it("has no orphan catalog keys outside manifest emits", () => {
		const emitSet = new Set(humanResourcesModuleManifest.events.emits);
		for (const eventType of Object.keys(
			HUMAN_RESOURCES_EVENT_CATALOG,
		) as ClassifiedHumanResourcesDomainEventType[]) {
			expect(emitSet.has(eventType)).toBe(true);
		}
	});
});
