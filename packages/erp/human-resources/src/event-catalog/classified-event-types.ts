import type { HumanResourcesEventType } from "@afenda/events";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../emissions/registry";
import type { HumanResourcesDomain } from "../emissions/types";

const HUMAN_RESOURCES_EVENT_VERSION_SUFFIX = /\.v(\d+)$/;

interface RegistryDomainEventScan {
	readonly domainByEventType: ReadonlyMap<
		HumanResourcesEventType,
		HumanResourcesDomain
	>;
	readonly types: readonly HumanResourcesEventType[];
}

function scanRegistryDomainEvents(): RegistryDomainEventScan {
	const types = new Set<HumanResourcesEventType>();
	const domainByEventType = new Map<
		HumanResourcesEventType,
		HumanResourcesDomain
	>();

	for (const definition of Object.values(
		HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
	)) {
		if (definition?.emissionMode !== "domain_event") {
			continue;
		}
		for (const eventType of definition.eventTypes) {
			types.add(eventType);
			if (!domainByEventType.has(eventType)) {
				domainByEventType.set(eventType, definition.domain);
			}
		}
	}

	return {
		types: Object.freeze([...types].sort()),
		domainByEventType,
	};
}

const registryDomainEventScan = scanRegistryDomainEvents();

export const CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES =
	registryDomainEventScan.types;

export type ClassifiedHumanResourcesDomainEventType =
	(typeof CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES)[number];

export function buildEventTypeDomainMap(): ReadonlyMap<
	HumanResourcesEventType,
	HumanResourcesDomain
> {
	return registryDomainEventScan.domainByEventType;
}

export function listDomainEventTypesFromRegistry(
	input: {
		readonly emission: "audit_only" | "domain_event";
		readonly eventTypes?: readonly HumanResourcesEventType[];
	}[],
): readonly HumanResourcesEventType[] {
	const types = new Set<HumanResourcesEventType>();
	for (const entry of input) {
		if (entry.emission !== "domain_event") {
			continue;
		}
		for (const eventType of entry.eventTypes ?? []) {
			types.add(eventType);
		}
	}
	return Object.freeze([...types].sort());
}

export function parseHumanResourcesEventVersion(eventType: string): number {
	const match = HUMAN_RESOURCES_EVENT_VERSION_SUFFIX.exec(eventType);
	if (!match) {
		throw new Error(
			`Human Resources event type "${eventType}" has no .vN version suffix.`,
		);
	}
	const version = Number.parseInt(match[1] ?? "", 10);
	if (!Number.isInteger(version) || version <= 0) {
		throw new Error(
			`Human Resources event type "${eventType}" has invalid version suffix.`,
		);
	}
	return version;
}
