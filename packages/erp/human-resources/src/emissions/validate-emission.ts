import { HumanResourcesEventSchemas } from "@afenda/events";

import { HUMAN_RESOURCES_COMMAND_IDS } from "../module-ids";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "./registry";

export type HumanResourcesEmissionRegistryIssue = {
	commandId?: string;
	eventType?: string;
	code:
		| "missing_command"
		| "unknown_command"
		| "missing_event"
		| "unknown_event"
		| "audit_only_with_event"
		| "domain_event_without_event"
		| "missing_correlation"
		| "missing_audit"
		| "domain_mismatch";
	message: string;
};

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

		if (!definition) continue;

		if (!definition.auditRequired) {
			issues.push({
				commandId,
				code: "missing_audit",
				message: `${commandId} must require audit.`,
			});
		}

		if (!definition.correlationRequired) {
			issues.push({
				commandId,
				code: "missing_correlation",
				message: `${commandId} must require correlation.`,
			});
		}

		if (
			definition.emissionMode === "domain_event" &&
			definition.eventTypes.length === 0
		) {
			issues.push({
				commandId,
				code: "domain_event_without_event",
				message: `${commandId} requires an event type.`,
			});
		}

		if (
			definition.emissionMode === "audit_only" &&
			definition.eventTypes.length > 0
		) {
			issues.push({
				commandId,
				code: "audit_only_with_event",
				message: `${commandId} is audit-only but declares event types.`,
			});
		}

		for (const eventType of definition.eventTypes) {
			if (!HumanResourcesEventSchemas[eventType]) {
				issues.push({
					commandId,
					eventType,
					code: "unknown_event",
					message: `${eventType} is not registered in @afenda/events.`,
				});
			}
		}
	}

	return issues;
}
