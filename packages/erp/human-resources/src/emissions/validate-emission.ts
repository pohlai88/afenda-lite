import { HumanResourcesEventSchemas } from "@afenda/events/schemas";

import { tryGetEventCatalogEntry } from "../event-catalog/get-event-catalog-entry";
import { HUMAN_RESOURCES_COMMAND_IDS } from "../module-ids";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./registry";
import type { HumanResourcesMutationEmissionDefinition } from "./types";

export interface HumanResourcesEmissionRegistryIssue {
	code:
		| "missing_command"
		| "unknown_command"
		| "missing_event"
		| "unknown_event"
		| "audit_only_with_event"
		| "domain_event_without_event"
		| "missing_correlation"
		| "missing_audit"
		| "domain_mismatch"
		| "missing_catalog_entry";
	commandId?: string;
	eventType?: string;
	message: string;
}

function validateEmissionFlags(input: {
	commandId: string;
	definition: HumanResourcesMutationEmissionDefinition;
	issues: HumanResourcesEmissionRegistryIssue[];
}): void {
	if (!input.definition.auditRequired) {
		input.issues.push({
			commandId: input.commandId,
			code: "missing_audit",
			message: `${input.commandId} must require audit.`,
		});
	}
	if (!input.definition.correlationRequired) {
		input.issues.push({
			commandId: input.commandId,
			code: "missing_correlation",
			message: `${input.commandId} must require correlation.`,
		});
	}
	if (
		input.definition.emissionMode === "domain_event" &&
		input.definition.eventTypes.length === 0
	) {
		input.issues.push({
			commandId: input.commandId,
			code: "domain_event_without_event",
			message: `${input.commandId} requires an event type.`,
		});
	}
	if (
		input.definition.emissionMode === "audit_only" &&
		input.definition.eventTypes.length > 0
	) {
		input.issues.push({
			commandId: input.commandId,
			code: "audit_only_with_event",
			message: `${input.commandId} is audit-only but declares event types.`,
		});
	}
}

function validateEmissionEventTypes(input: {
	commandId: string;
	definition: HumanResourcesMutationEmissionDefinition;
	issues: HumanResourcesEmissionRegistryIssue[];
}): void {
	for (const eventType of input.definition.eventTypes) {
		if (!HumanResourcesEventSchemas[eventType]) {
			input.issues.push({
				commandId: input.commandId,
				eventType,
				code: "unknown_event",
				message: `${eventType} is not registered in @afenda/events.`,
			});
		}
		if (
			input.definition.emissionMode === "domain_event" &&
			!tryGetEventCatalogEntry(eventType)
		) {
			input.issues.push({
				commandId: input.commandId,
				eventType,
				code: "missing_catalog_entry",
				message: `${eventType} is classified as domain_event but missing from HUMAN_RESOURCES_EVENT_CATALOG.`,
			});
		}
	}
}

export function validateHumanResourcesMutationEmissionRegistry(): HumanResourcesEmissionRegistryIssue[] {
	const issues: HumanResourcesEmissionRegistryIssue[] = [];
	const registered = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD;
	const commandIdSet = new Set<string>(HUMAN_RESOURCES_COMMAND_IDS);

	for (const commandId of HUMAN_RESOURCES_COMMAND_IDS) {
		if (!registered[commandId]) {
			issues.push({
				commandId,
				code: "missing_command",
				message: `No emission classification for ${commandId}.`,
			});
		}
	}

	for (const [rawCommandId, definition] of Object.entries(registered)) {
		const commandId = rawCommandId;
		if (!commandIdSet.has(commandId)) {
			issues.push({
				commandId,
				code: "unknown_command",
				message: `Unknown command in emission registry: ${commandId}.`,
			});
			continue;
		}

		if (!definition) {
			continue;
		}

		validateEmissionFlags({ commandId, definition, issues });
		validateEmissionEventTypes({ commandId, definition, issues });
	}

	return issues;
}
