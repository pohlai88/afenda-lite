import type { HumanResourcesAuthorizationPort } from "./authorization";
import { createProductionCurrencyLookup } from "./currency-lookup";
import { createDefaultDocumentReferencePort } from "./document-reference";
import type {
	CurrencyLookupPort,
	DocumentReferencePort,
	MutationPorts,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveHumanResourcesStore } from "./resolve-store";
import type { HumanResourcesStore } from "./store";
import {
	createMemoryWorkCalendar,
	type WorkCalendarPort,
} from "./work-calendar";

export type HumanResourcesCommandOptions = {
	store?: HumanResourcesStore;
	ports?: MutationPorts;
	currency?: CurrencyLookupPort;
	documentReference?: DocumentReferencePort;
	workCalendar?: WorkCalendarPort;
	authorization?: HumanResourcesAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveCurrencyLookup(
	currency?: CurrencyLookupPort,
): CurrencyLookupPort {
	return currency ?? createProductionCurrencyLookup();
}

export function resolveStore(store?: HumanResourcesStore): HumanResourcesStore {
	return resolveHumanResourcesStore(store);
}

export function resolveWorkCalendar(
	workCalendar?: WorkCalendarPort,
): WorkCalendarPort {
	return workCalendar ?? createMemoryWorkCalendar();
}

export function resolveDocumentReferencePort(
	documentReference?: DocumentReferencePort,
): DocumentReferencePort {
	return documentReference ?? createDefaultDocumentReferencePort();
}

export function resolveCommandDeps(
	options: HumanResourcesCommandOptions = {},
): {
	store: HumanResourcesStore;
	ports: MutationPorts;
	currency: CurrencyLookupPort;
	documentReference: DocumentReferencePort;
	workCalendar: WorkCalendarPort;
	authorization: HumanResourcesAuthorizationPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		currency: resolveCurrencyLookup(options.currency),
		documentReference: resolveDocumentReferencePort(options.documentReference),
		workCalendar: resolveWorkCalendar(options.workCalendar),
		authorization: options.authorization,
	};
}
