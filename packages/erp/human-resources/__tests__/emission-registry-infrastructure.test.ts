import { HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { composeHumanResourcesEmissionRegistry } from "../src/kernel/emissions/compose-registry";
import { HUMAN_RESOURCES_COMPENSATION_EMISSIONS } from "../src/kernel/emissions/domains/compensation";
import { HUMAN_RESOURCES_COMPLIANCE_EMISSIONS } from "../src/kernel/emissions/domains/compliance";
import { HUMAN_RESOURCES_EMPLOYEE_RELATIONS_EMISSIONS } from "../src/kernel/emissions/domains/employee-relations";
import { HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_EMISSIONS } from "../src/kernel/emissions/domains/employment-lifecycle";
import { HUMAN_RESOURCES_EMPLOYMENT_WORKFLOW_EMISSIONS } from "../src/kernel/emissions/domains/employment-workflow";
import { HUMAN_RESOURCES_HIRE_ORCHESTRATION_EMISSIONS } from "../src/kernel/emissions/domains/hire-orchestration";
import { HUMAN_RESOURCES_LEARNING_EMISSIONS } from "../src/kernel/emissions/domains/learning";
import { HUMAN_RESOURCES_LEAVE_EMISSIONS } from "../src/kernel/emissions/domains/leave";
import { HUMAN_RESOURCES_ORGANIZATION_EMISSIONS } from "../src/kernel/emissions/domains/organization";
import { HUMAN_RESOURCES_PERFORMANCE_EMISSIONS } from "../src/kernel/emissions/domains/performance";
import { HUMAN_RESOURCES_PRIVACY_EMISSIONS } from "../src/kernel/emissions/domains/privacy";
import { HUMAN_RESOURCES_RECRUITMENT_EMISSIONS } from "../src/kernel/emissions/domains/recruitment";
import { HUMAN_RESOURCES_TALENT_EMISSIONS } from "../src/kernel/emissions/domains/talent";
import { HUMAN_RESOURCES_TIME_EMISSIONS } from "../src/kernel/emissions/domains/time";
import { HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS } from "../src/kernel/emissions/domains/workforce-foundation";
import { HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS } from "../src/kernel/emissions/domains/workforce-planning";
import {
	getMutationEmissionEntry,
	HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY,
} from "../src/kernel/emissions/mutation-emission-registry";
import { buildMutationMeta } from "../src/kernel/emissions/mutation-meta";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import { getRegistryDomainEventType } from "../src/kernel/emissions/resolve-emission";
import { planLeaveMutationOutboxEventType } from "../src/kernel/emissions/sql-side-effects";
import { validateHumanResourcesMutationEmissionRegistry } from "../src/kernel/emissions/validate-emission";
import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS,
	HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
	HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
	HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS,
} from "../src/kernel/operations/module-ids";
import mutationInventoryFixture from "./fixtures/mutation-inventory.json";

describe("emission registry infrastructure", () => {
	it("validates the full registry without structural issues", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(issues).toEqual([]);
	});

	it("validates domain_event types have event catalog entries", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		const catalogIssues = issues.filter(
			(issue) => issue.code === "missing_catalog_entry",
		);
		expect(catalogIssues).toEqual([]);
	});

	it("preserves canonical per-domain classification counts", () => {
		expect(Object.keys(HUMAN_RESOURCES_TIME_EMISSIONS)).toHaveLength(64);
		expect(Object.keys(HUMAN_RESOURCES_LEAVE_EMISSIONS)).toHaveLength(18);
		expect(
			Object.keys(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS),
		).toHaveLength(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS.length);
		expect(Object.keys(HUMAN_RESOURCES_ORGANIZATION_EMISSIONS)).toHaveLength(
			HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS.length,
		);
		expect([
			...Object.keys(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_EMISSIONS),
			...Object.keys(HUMAN_RESOURCES_EMPLOYMENT_WORKFLOW_EMISSIONS),
		]).toHaveLength(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS.length);
		expect(Object.keys(HUMAN_RESOURCES_RECRUITMENT_EMISSIONS)).toHaveLength(32);
		expect(
			Object.keys(HUMAN_RESOURCES_HIRE_ORCHESTRATION_EMISSIONS),
		).toHaveLength(1);
		expect(
			Object.keys(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_EMISSIONS),
		).toHaveLength(15);
		expect(Object.keys(HUMAN_RESOURCES_COMPLIANCE_EMISSIONS)).toHaveLength(19);
		expect(Object.keys(HUMAN_RESOURCES_TALENT_EMISSIONS)).toHaveLength(34);
		expect(
			Object.keys(HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS),
		).toHaveLength(13);
		expect(Object.keys(HUMAN_RESOURCES_COMPENSATION_EMISSIONS)).toHaveLength(
			36,
		);
		expect(Object.keys(HUMAN_RESOURCES_PERFORMANCE_EMISSIONS)).toHaveLength(39);
		expect(Object.keys(HUMAN_RESOURCES_LEARNING_EMISSIONS)).toHaveLength(18);
		expect(Object.keys(HUMAN_RESOURCES_PRIVACY_EMISSIONS)).toHaveLength(3);
		expect(
			Object.keys(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD),
		).toHaveLength(360);
	});

	it("keeps leave commands out of Time classifications", () => {
		for (const commandId of HUMAN_RESOURCES_LEAVE_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_TIME_EMISSIONS[
					commandId as keyof typeof HUMAN_RESOURCES_TIME_EMISSIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps workforce-foundation commands out of Time classifications", () => {
		for (const commandId of HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_TIME_EMISSIONS[
					commandId as keyof typeof HUMAN_RESOURCES_TIME_EMISSIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps organization commands out of Time classifications", () => {
		for (const commandId of HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_TIME_EMISSIONS[
					commandId as keyof typeof HUMAN_RESOURCES_TIME_EMISSIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps employment-lifecycle commands out of Time classifications", () => {
		for (const commandId of HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_TIME_EMISSIONS[
					commandId as keyof typeof HUMAN_RESOURCES_TIME_EMISSIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps recruitment commands out of Time classifications", () => {
		for (const commandId of HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_TIME_EMISSIONS[
					commandId as keyof typeof HUMAN_RESOURCES_TIME_EMISSIONS
				],
			).toBeUndefined();
		}
	});

	it("keeps Slice 3.6 classified commands out of Time classifications", () => {
		const slice36CommandIds = [
			...HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
			...HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
			...HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
			...Object.keys(HUMAN_RESOURCES_PRIVACY_EMISSIONS),
		];
		for (const commandId of slice36CommandIds) {
			expect(
				HUMAN_RESOURCES_TIME_EMISSIONS[
					commandId as keyof typeof HUMAN_RESOURCES_TIME_EMISSIONS
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

	it("derives stable array parity with the canonical record", () => {
		const fromRecord = Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)
			.map((entry) => `${entry.commandId}:${entry.emissionMode}`)
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
		expect(mutationInventoryFixture.classifiedMutationIds).toBe(360);
		expect(mutationInventoryFixture.unclassifiedMutationIds).toBe(0);
		expect(mutationInventoryFixture.unclassified).toEqual([]);
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
