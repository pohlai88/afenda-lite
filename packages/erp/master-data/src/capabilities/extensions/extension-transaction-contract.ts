/**
 * Versioned outbox event names emitted by atomic extension mutations.
 *
 * Event payloads identify the changed extension and resulting version. Raw
 * contact values, addresses, barcodes, aliases, external identifiers, and
 * free-text operator reasons are deliberately excluded.
 */
import type { ExtensionKind } from "./extension-policies";

export const EXTENSION_EVENT_TYPES = {
	partyRoleCreated: "master_data.party_role.created.v1",
	partyRoleUpdated: "master_data.party_role.updated.v1",
	partyRoleActivated: "master_data.party_role.activated.v1",
	partyRoleDeactivated: "master_data.party_role.deactivated.v1",
	partyRoleRetired: "master_data.party_role.retired.v1",
	partyRoleArchived: "master_data.party_role.archived.v1",
	partyAddressCreated: "master_data.party_address.created.v1",
	partyAddressUpdated: "master_data.party_address.updated.v1",
	partyAddressPrimaryChanged: "master_data.party_address.primary_changed.v1",
	partyContactCreated: "master_data.party_contact.created.v1",
	partyContactUpdated: "master_data.party_contact.updated.v1",
	partyContactPrimaryChanged: "master_data.party_contact.primary_changed.v1",
	partyExternalIdAssigned: "master_data.party_external_id.assigned.v1",
	partyExternalIdPrimaryChanged:
		"master_data.party_external_id.primary_changed.v1",
	partyRelationshipCreated: "master_data.party_relationship.created.v1",
	itemUomCreated: "master_data.item_uom.created.v1",
	itemUomUpdated: "master_data.item_uom.updated.v1",
	itemUomDefaultsChanged: "master_data.item_uom.defaults_changed.v1",
	itemBarcodeAssigned: "master_data.item_barcode.assigned.v1",
	itemBarcodePrimaryChanged: "master_data.item_barcode.primary_changed.v1",
	itemExternalIdAssigned: "master_data.item_external_id.assigned.v1",
	itemExternalIdPrimaryChanged:
		"master_data.item_external_id.primary_changed.v1",
	itemAliasCreated: "master_data.item_alias.created.v1",
	warehouseExternalIdAssigned: "master_data.warehouse_external_id.assigned.v1",
	itemTemplateAttributeCreated:
		"master_data.item_template_attribute.created.v1",
	itemTemplateAttributeUpdated:
		"master_data.item_template_attribute.updated.v1",
	itemTemplateAttributeOptionCreated:
		"master_data.item_template_attribute_option.created.v1",
	itemVariantAttributeValueAssigned:
		"master_data.item_variant_attribute_value.assigned.v1",
} as const;

export type ExtensionEventType =
	(typeof EXTENSION_EVENT_TYPES)[keyof typeof EXTENSION_EVENT_TYPES];

export const EXTENSION_EVENT_CLASSIFICATION_TYPES = {
	party_role: "role_code",
	party_address: "address_type",
	party_contact: "contact_type",
	party_external_id: "external_id_type",
	party_relationship: "relationship_type",
	item_uom: "alternate_uom",
	item_barcode: "symbology",
	item_external_id: "external_id_type",
	item_alias: "alias_type",
	warehouse_external_id: "external_id_type",
	item_template_attribute: "attribute_code",
	item_template_attribute_option: "option_code",
	item_variant_attribute_value: "value_type",
} as const satisfies Record<ExtensionKind, string>;

export type ExtensionEventClassification = Readonly<{
	type: string;
	code: string;
}>;

export type ExtensionEventPayloadInput = Readonly<{
	organizationId: string;
	entityType: ExtensionKind;
	entityId: string;
	version: number;
	actorId: string;
	correlationId: string;
	parentEntityId?: string;
	/**
	 * Optional controlled classification. It must never contain a raw alias,
	 * barcode, external identifier, address, contact value, or free-form text.
	 */
	classification?: ExtensionEventClassification;
	/** Controlled reason code only. Free-text reasons remain in the audit log. */
	reasonCode?: string;
}>;

/** Stable, validated, non-sensitive payload shared by extension outbox events. */
export type ExtensionEventPayload = Readonly<{
	organizationId: string;
	entityType: ExtensionKind;
	entityId: string;
	version: number;
	actorId: string;
	correlationId: string;
	parentEntityId?: string;
	classification?: ExtensionEventClassification;
	reasonCode?: string;
}>;

function assertNonEmpty(value: string, field: string): void {
	if (value.trim().length === 0) {
		throw new TypeError(`Extension event payload ${field} is required`);
	}
}

export function extensionEventClassification(
	entityType: ExtensionKind,
	code: string,
): ExtensionEventClassification {
	assertNonEmpty(code, "classification.code");
	return {
		type: EXTENSION_EVENT_CLASSIFICATION_TYPES[entityType],
		code,
	};
}

export function createExtensionEventPayload(
	input: ExtensionEventPayloadInput,
): ExtensionEventPayload {
	assertNonEmpty(input.organizationId, "organizationId");
	assertNonEmpty(input.entityId, "entityId");
	assertNonEmpty(input.actorId, "actorId");
	assertNonEmpty(input.correlationId, "correlationId");
	if (!Number.isSafeInteger(input.version) || input.version < 1) {
		throw new TypeError(
			"Extension event payload version must be a positive safe integer",
		);
	}
	if (input.parentEntityId !== undefined) {
		assertNonEmpty(input.parentEntityId, "parentEntityId");
	}
	if (input.classification !== undefined) {
		assertNonEmpty(input.classification.type, "classification.type");
		assertNonEmpty(input.classification.code, "classification.code");
	}
	if (input.reasonCode !== undefined) {
		assertNonEmpty(input.reasonCode, "reasonCode");
	}
	const { classification, ...payload } = input;
	return {
		...payload,
		...(classification === undefined
			? {}
			: { classification: { ...classification } }),
	};
}

export type PartyRoleLifecycleEventSuffix =
	| "activated"
	| "deactivated"
	| "retired"
	| "archived";

export function partyRoleLifecycleEventType(
	suffix: PartyRoleLifecycleEventSuffix,
): ExtensionEventType {
	switch (suffix) {
		case "activated":
			return EXTENSION_EVENT_TYPES.partyRoleActivated;
		case "deactivated":
			return EXTENSION_EVENT_TYPES.partyRoleDeactivated;
		case "retired":
			return EXTENSION_EVENT_TYPES.partyRoleRetired;
		case "archived":
			return EXTENSION_EVENT_TYPES.partyRoleArchived;
		default: {
			const exhaustive: never = suffix;
			return exhaustive;
		}
	}
}
