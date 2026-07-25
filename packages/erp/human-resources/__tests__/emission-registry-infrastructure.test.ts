import { HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { composeHumanResourcesEmissionRegistry } from "../src/emissions/compose-registry";
import { HUMAN_RESOURCES_CORE_ORGANIZATION_EMISSIONS } from "../src/emissions/domains/core-organization";
import { HUMAN_RESOURCES_COMPLIANCE_EMISSIONS } from "../src/emissions/domains/compliance";
import { HUMAN_RESOURCES_EMPLOYEE_RELATIONS_EMISSIONS } from "../src/emissions/domains/employee-relations";
import { HUMAN_RESOURCES_LEAVE_EMISSIONS } from "../src/emissions/domains/leave";
import { HUMAN_RESOURCES_LIFECYCLE_EMISSIONS } from "../src/emissions/domains/lifecycle";
import { HUMAN_RESOURCES_RECRUITMENT_EMISSIONS } from "../src/emissions/domains/recruitment";
import { HUMAN_RESOURCES_TALENT_EMISSIONS } from "../src/emissions/domains/talent";
import { HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS } from "../src/emissions/domains/workforce-foundation";
import { HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS } from "../src/emissions/domains/workforce-planning";
import { HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS } from "../src/emissions/legacy-classifications";
import { toLegacyMutationEmissionEntry } from "../src/emissions/legacy-compat";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { getRegistryDomainEventType } from "../src/emissions/resolve-emission";
import { planLeaveMutationOutboxEventType } from "../src/emissions/sql-side-effects";
import { validateHumanResourcesMutationEmissionRegistry } from "../src/emissions/validate-emission";
import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
	HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS,
	HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS,
	HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS,
} from "../src/module-ids";
import {
	getMutationEmissionEntry,
	HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
} from "../src/mutation-emission-registry";
import { buildMutationMeta } from "../src/shared/mutation-meta";
import mutationInventoryFixture from "./fixtures/mutation-inventory.json";

describe("emission registry infrastructure", () => {
	it("validates classified registry entries without structural issues", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		const classifiedIds = new Set(
			Object.keys(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD),
		);
		const structuralIssues = issues.filter(
			(issue) =>
				issue.code !== "missing_command" &&
				(issue.commandId === undefined || classifiedIds.has(issue.commandId)),
		);
		expect(structuralIssues).toEqual([]);
	});

	it("preserves 228 / 63 / 18 / 5 / 23 / 27 / 14 / 15 / 19 / 31 / 13 classification counts", () => {
		expect(
			Object.keys(HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS),
		).toHaveLength(63);
		expect(Object.keys(HUMAN_RESOURCES_LEAVE_EMISSIONS)).toHaveLength(18);
		expect(Object.keys(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS)).toHaveLength(
			5,
		);
		expect(Object.keys(HUMAN_RESOURCES_CORE_ORGANIZATION_EMISSIONS)).toHaveLength(
			23,
		);
		expect(Object.keys(HUMAN_RESOURCES_RECRUITMENT_EMISSIONS)).toHaveLength(27);
		expect(Object.keys(HUMAN_RESOURCES_LIFECYCLE_EMISSIONS)).toHaveLength(14);
		expect(Object.keys(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_EMISSIONS)).toHaveLength(
			15,
		);
		expect(Object.keys(HUMAN_RESOURCES_COMPLIANCE_EMISSIONS)).toHaveLength(19);
		expect(Object.keys(HUMAN_RESOURCES_TALENT_EMISSIONS)).toHaveLength(31);
		expect(Object.keys(HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS)).toHaveLength(
			13,
		);
		expect(
			Object.keys(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD),
		).toHaveLength(228);
	});

	it("keeps leave commands out of legacy classifications", () => {
		for (const commandId of HUMAN_RESOURCES_LEAVE_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS[
					commandId as keyof typeof HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps workforce-foundation commands out of legacy classifications", () => {
		for (const commandId of HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS[
					commandId as keyof typeof HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps core-organization commands out of legacy classifications", () => {
		for (const commandId of HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS[
					commandId as keyof typeof HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps recruitment commands out of legacy classifications", () => {
		for (const commandId of HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS[
					commandId as keyof typeof HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps lifecycle commands out of legacy classifications", () => {
		for (const commandId of HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS[
					commandId as keyof typeof HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS
				],
			).toBeUndefined();
		}
	});

	it("throws when duplicate command ids overlap during compose", () => {
		expect(() =>
			composeHumanResourcesEmissionRegistry(
				HUMAN_RESOURCES_LEAVE_EMISSIONS,
				HUMAN_RESOURCES_LEAVE_EMISSIONS,
			),
		).toThrow(/Duplicate HR emission classification/);
	});

	it("derives legacy array parity with the canonical record", () => {
		const fromRecord = Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)
			.map(toLegacyMutationEmissionEntry)
			.map((entry) => `${entry.command}:${entry.emission}`)
			.sort();
		const fromArray = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map(
			(entry) => `${entry.command}:${entry.emission}`,
		).sort();
		expect(fromArray).toEqual(fromRecord);
	});

	it("getMutationEmissionEntry resolves classified commands", () => {
		for (const commandId of Object.keys(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			expect(getMutationEmissionEntry(commandId)).toBeDefined();
		}
	});

	it("matches committed mutation inventory fixture", () => {
		expect(mutationInventoryFixture.totalCommandIds).toBe(
			HUMAN_RESOURCES_COMMAND_IDS.length,
		);
		expect(mutationInventoryFixture.classifiedMutationIds).toBe(228);
		expect(mutationInventoryFixture.unclassifiedMutationIds).toBe(62);
		expect(mutationInventoryFixture.unclassified).toHaveLength(62);
	});

	it("resolves domain event types from the registry", () => {
		expect(
			getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			),
		).toBe(HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT);
	});

	it("plans carry-forward adjust outbox event from registry authority", () => {
		const meta = buildMutationMeta({
			correlationId: "corr-carry-plan",
			operationId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			idempotencyKey: "idem-carry-plan",
		});
		const planned = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			meta,
			organizationId: "org-carry",
			actorUserId: "user-carry",
			aggregateId: "ent-new",
			audit: {
				entity: "hr_leave_adjustment",
				entityId: "adj-carry",
				action: "CREATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			),
			eventEntityId: "ent-new",
			eventEntityType: "hr_leave_entitlement",
		});
		expect(planned).toBe(HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT);
	});
});
