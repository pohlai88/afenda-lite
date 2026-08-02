import { companyOperationDefinitions } from "../company/operations";
import { establishmentOperationDefinitions } from "../establishments/operations";
import { CORPORATE_ADMINISTRATION_EVENT_TYPES } from "../event-types";
import { governanceOperationDefinitions } from "../governance/operations";
import { meetingOperationDefinitions } from "../meetings/operations";
import { officerOperationDefinitions } from "../officers/operations";
import {
	CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	type CorporateAdministrationPermission,
} from "../permissions";
import { resolutionOperationDefinitions } from "../resolutions/operations";
import type {
	CorporateAdministrationCommandDefinition,
	CorporateAdministrationOperationDefinition,
	CorporateAdministrationQueryDefinition,
} from "./types";

export const CORPORATE_ADMINISTRATION_OPERATION_REGISTRY = [
	...companyOperationDefinitions,
	...establishmentOperationDefinitions,
	...governanceOperationDefinitions,
	...officerOperationDefinitions,
	...meetingOperationDefinitions,
	...resolutionOperationDefinitions,
] as const satisfies readonly CorporateAdministrationOperationDefinition[];

export type CorporateAdministrationOperationId =
	(typeof CORPORATE_ADMINISTRATION_OPERATION_REGISTRY)[number]["id"];
export type CorporateAdministrationCommandId = Extract<
	(typeof CORPORATE_ADMINISTRATION_OPERATION_REGISTRY)[number],
	{ kind: "command" }
>["id"];
export type CorporateAdministrationQueryId = Extract<
	(typeof CORPORATE_ADMINISTRATION_OPERATION_REGISTRY)[number],
	{ kind: "query" }
>["id"];

function isCommand(
	definition: CorporateAdministrationOperationDefinition,
): definition is CorporateAdministrationCommandDefinition {
	return definition.kind === "command";
}

function isQuery(
	definition: CorporateAdministrationOperationDefinition,
): definition is CorporateAdministrationQueryDefinition {
	return definition.kind === "query";
}

const commandDefinitions =
	CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.filter(isCommand);
const queryDefinitions =
	CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.filter(isQuery);

export const CORPORATE_ADMINISTRATION_COMMAND_IDS = commandDefinitions.map(
	(definition) => definition.id,
) as readonly CorporateAdministrationCommandId[];

export const CORPORATE_ADMINISTRATION_QUERY_IDS = queryDefinitions.map(
	(definition) => definition.id,
) as readonly CorporateAdministrationQueryId[];

export const CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS = Object.freeze(
	Object.fromEntries(
		commandDefinitions.map((definition) => [
			definition.id,
			definition.permission,
		]),
	) as Record<
		CorporateAdministrationCommandId,
		CorporateAdministrationPermission
	>,
);

export const CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS = Object.freeze(
	Object.fromEntries(
		queryDefinitions.map((definition) => [
			definition.id,
			definition.permission,
		]),
	) as Record<
		CorporateAdministrationQueryId,
		CorporateAdministrationPermission
	>,
);

const definitionById = new Map<
	CorporateAdministrationOperationId,
	(typeof CORPORATE_ADMINISTRATION_OPERATION_REGISTRY)[number]
>(
	CORPORATE_ADMINISTRATION_OPERATION_REGISTRY.map((definition) => [
		definition.id,
		definition,
	]),
);

export function getCorporateAdministrationOperationDefinition<
	TId extends CorporateAdministrationOperationId,
>(
	id: TId,
): Extract<
	(typeof CORPORATE_ADMINISTRATION_OPERATION_REGISTRY)[number],
	{ id: TId }
> {
	const definition = definitionById.get(id);
	if (definition === undefined) {
		throw new RangeError(`Unknown Corporate Administration operation: ${id}`);
	}
	return definition as Extract<
		(typeof CORPORATE_ADMINISTRATION_OPERATION_REGISTRY)[number],
		{ id: TId }
	>;
}

function assertRegistryIntegrity(): void {
	const operationIds = new Set<string>();
	const commandIdentities = new Set<string>();
	const registeredPermissions = new Set<string>(
		CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	);
	const registeredEvents = new Set<string>(
		CORPORATE_ADMINISTRATION_EVENT_TYPES,
	);
	const referencedPermissions = new Set<string>();
	const referencedEvents = new Set<string>();

	for (const definition of CORPORATE_ADMINISTRATION_OPERATION_REGISTRY) {
		if (operationIds.has(definition.id)) {
			throw new TypeError(
				`Duplicate Corporate Administration operation: ${definition.id}`,
			);
		}
		operationIds.add(definition.id);
		assertRegisteredPermission(definition, registeredPermissions);
		referencedPermissions.add(definition.permission);

		if (definition.kind === "command") {
			collectCommandSemantics(
				definition,
				commandIdentities,
				registeredEvents,
				referencedEvents,
			);
		}
	}

	for (const permission of registeredPermissions) {
		if (!referencedPermissions.has(permission)) {
			throw new TypeError(
				`Corporate Administration permission has no operation: ${permission}`,
			);
		}
	}
	for (const eventType of registeredEvents) {
		if (!referencedEvents.has(eventType)) {
			throw new TypeError(
				`Corporate Administration event has no emitting operation: ${eventType}`,
			);
		}
	}
}

function assertRegisteredPermission(
	definition: CorporateAdministrationOperationDefinition,
	registeredPermissions: ReadonlySet<string>,
): void {
	if (!registeredPermissions.has(definition.permission)) {
		throw new TypeError(
			`Corporate Administration operation ${definition.id} references an unregistered permission`,
		);
	}
}

function collectCommandSemantics(
	definition: CorporateAdministrationCommandDefinition,
	commandIdentities: Set<string>,
	registeredEvents: ReadonlySet<string>,
	referencedEvents: Set<string>,
): void {
	if (commandIdentities.has(definition.commandIdentity)) {
		throw new TypeError(
			`Duplicate Corporate Administration command identity: ${definition.commandIdentity}`,
		);
	}
	commandIdentities.add(definition.commandIdentity);
	if (!registeredEvents.has(definition.eventType)) {
		throw new TypeError(
			`Corporate Administration operation ${definition.id} references an unregistered event`,
		);
	}
	referencedEvents.add(definition.eventType);
}

assertRegistryIntegrity();
