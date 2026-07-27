import type { MasterDataAggregateType } from "./aggregate-types";
import type { MasterDataEventType } from "./event-payloads";

export const MASTER_DATA_EVENT_TYPES = [
	"master_data.party.created",
	"master_data.party.updated",
	"master_data.party.activated",
	"master_data.party.suspended",
	"master_data.party.blocked",
	"master_data.party.merged",
	"master_data.party_role.activated",
	"master_data.party_address.primary_changed",
	"master_data.party_contact.verified",
	"master_data.organization_dimension.created",
	"master_data.organization_dimension.updated",
	"master_data.item.created",
	"master_data.item.updated",
	"master_data.item.activated",
	"master_data.item.retired",
	"master_data.item_uom.updated",
	"master_data.item_barcode.assigned",
	"master_data.warehouse.created",
	"master_data.warehouse.activated",
	"master_data.payment_term.inactivated",
	"master_data.tax_registration.revoked",
	"master_data.change_request.approved",
	"master_data.change_request.applied",
	"master_data.import_batch.approved",
	"master_data.import_batch.applied",
	"master_data.import_row.applied",
] as const satisfies readonly MasterDataEventType[];

export type { MasterDataEventType };

type RegisteredMasterDataEventType = (typeof MASTER_DATA_EVENT_TYPES)[number];
type MissingEventPayloadMappings = Exclude<
	RegisteredMasterDataEventType,
	MasterDataEventType
>;
type UnregisteredEventPayloadMappings = Exclude<
	MasterDataEventType,
	RegisteredMasterDataEventType
>;

export const MASTER_DATA_EVENT_PAYLOAD_MAP_PARITY: [
	MissingEventPayloadMappings,
	UnregisteredEventPayloadMappings,
] extends [never, never]
	? true
	: never = true;

export const MASTER_DATA_EVENT_AGGREGATE_POLICY = {
	"master_data.party.created": "party",
	"master_data.party.updated": "party",
	"master_data.party.activated": "party",
	"master_data.party.suspended": "party",
	"master_data.party.blocked": "party",
	"master_data.party.merged": "party",
	"master_data.party_role.activated": "party",
	"master_data.party_address.primary_changed": "party",
	"master_data.party_contact.verified": "party",
	"master_data.organization_dimension.created": "organization_dimension",
	"master_data.organization_dimension.updated": "organization_dimension",
	"master_data.item.created": "item",
	"master_data.item.updated": "item",
	"master_data.item.activated": "item",
	"master_data.item.retired": "item",
	"master_data.item_uom.updated": "item",
	"master_data.item_barcode.assigned": "item",
	"master_data.warehouse.created": "warehouse",
	"master_data.warehouse.activated": "warehouse",
	"master_data.payment_term.inactivated": "payment_term",
	"master_data.tax_registration.revoked": "tax_registration",
	"master_data.change_request.approved": "change_request",
	"master_data.change_request.applied": "change_request",
	"master_data.import_batch.approved": "import_batch",
	"master_data.import_batch.applied": "import_batch",
	"master_data.import_row.applied": "import_row",
} as const satisfies Record<MasterDataEventType, MasterDataAggregateType>;

export function expectedAggregateTypeForEvent(
	eventType: MasterDataEventType,
): MasterDataAggregateType {
	return MASTER_DATA_EVENT_AGGREGATE_POLICY[eventType];
}

const MASTER_DATA_EVENT_TYPE_SET: ReadonlySet<string> = new Set(
	MASTER_DATA_EVENT_TYPES,
);

export function isMasterDataEventType(
	value: string,
): value is MasterDataEventType {
	return MASTER_DATA_EVENT_TYPE_SET.has(value);
}
