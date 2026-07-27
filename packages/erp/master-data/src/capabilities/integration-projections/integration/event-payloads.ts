import type { JsonObject } from "./json-types";

export type PartyActivatedPayload = Readonly<{
	partyId: string;
	previousStatus: "draft" | "inactive";
	resultingStatus: "active";
}>;

export type PartyMergedPayload = Readonly<{
	sourcePartyId: string;
	canonicalTargetPartyId: string;
	sourceResultingStatus: "merged";
}>;

export type MasterAggregateChangedPayload = Readonly<{
	changedFields: readonly string[];
}>;

export type ImportRowAppliedPayload = Readonly<{
	importBatchId: string;
	importRowId: string;
	resultingEntityId: string;
}>;

export type MasterDataEventPayloadMap = Readonly<{
	"master_data.party.created": MasterAggregateChangedPayload;
	"master_data.party.updated": MasterAggregateChangedPayload;
	"master_data.party.activated": PartyActivatedPayload;
	"master_data.party.blocked": MasterAggregateChangedPayload;
	"master_data.party.merged": PartyMergedPayload;
	"master_data.party_role.activated": MasterAggregateChangedPayload;
	"master_data.party_address.primary_changed": MasterAggregateChangedPayload;
	"master_data.party_contact.verified": MasterAggregateChangedPayload;
	"master_data.item.created": MasterAggregateChangedPayload;
	"master_data.item.updated": MasterAggregateChangedPayload;
	"master_data.item.activated": MasterAggregateChangedPayload;
	"master_data.item.retired": MasterAggregateChangedPayload;
	"master_data.item_uom.updated": MasterAggregateChangedPayload;
	"master_data.item_barcode.assigned": MasterAggregateChangedPayload;
	"master_data.warehouse.activated": MasterAggregateChangedPayload;
	"master_data.payment_term.inactivated": MasterAggregateChangedPayload;
	"master_data.tax_registration.revoked": MasterAggregateChangedPayload;
	"master_data.change_request.approved": MasterAggregateChangedPayload;
	"master_data.change_request.applied": MasterAggregateChangedPayload;
	"master_data.import_batch.applied": MasterAggregateChangedPayload;
	"master_data.import_row.applied": ImportRowAppliedPayload;
}>;

export type MasterDataEventType = keyof MasterDataEventPayloadMap;

export type MasterDataEventPayload =
	MasterDataEventPayloadMap[MasterDataEventType];

export type _MasterDataEventPayloadMapJsonCheck =
	MasterDataEventPayloadMap extends Readonly<Record<string, JsonObject>>
		? true
		: never;
