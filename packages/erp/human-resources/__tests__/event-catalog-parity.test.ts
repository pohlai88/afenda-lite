import {
	HumanResourcesEventSchemas,
	type HumanResourcesEventType,
} from "@afenda/events";
import { describe, expect, it } from "vitest";
import {
	CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES,
	type ClassifiedHumanResourcesDomainEventType,
	getEventCatalogEntry,
	HUMAN_RESOURCES_EVENT_CATALOG,
	listDomainEventTypesFromLegacyRegistryView,
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
};

function validCatalogPayload(eventType: HumanResourcesEventType) {
	const withEffectiveOn = {
		...goldenPayload,
		effectiveOn: "2026-01-15",
	};
	const schema = HumanResourcesEventSchemas[eventType];
	if (schema.safeParse(withEffectiveOn).success) {
		return withEffectiveOn;
	}
	return goldenPayload;
}

describe("human-resources event catalog parity", () => {
	it("catalog covers every classified registry domain_event type", () => {
		const registryTypes = listDomainEventTypesFromLegacyRegistryView(
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

			const missingCorrelation = entry.schema.safeParse({
				...validPayload,
				correlationId: "",
			});
			expect(missingCorrelation.success).toBe(false);

			const valid = entry.schema.safeParse(validPayload);
			expect(valid.success).toBe(true);
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
