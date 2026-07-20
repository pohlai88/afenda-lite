import { z } from "zod";

const masterDataEntityPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.string().trim().min(1),
	entityId: z.string().trim().min(1),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
});

export const masterDataEntityPayloadSchema = masterDataEntityPayloadBase;

export type MasterDataEntityPayload = z.infer<
	typeof masterDataEntityPayloadSchema
>;

export const MasterDataEventSchemas = {
	"master_data.party.created.v1": masterDataEntityPayloadSchema,
	"master_data.party.updated.v1": masterDataEntityPayloadSchema,
	"master_data.party.activated.v1": masterDataEntityPayloadSchema,
	"master_data.party.inactive.v1": masterDataEntityPayloadSchema,
	"master_data.party.blocked.v1": masterDataEntityPayloadSchema,
	"master_data.party.retired.v1": masterDataEntityPayloadSchema,
	"master_data.party.restored.v1": masterDataEntityPayloadSchema,
	"master_data.item.created.v1": masterDataEntityPayloadSchema,
	"master_data.item.updated.v1": masterDataEntityPayloadSchema,
	"master_data.item.activated.v1": masterDataEntityPayloadSchema,
	"master_data.item.inactive.v1": masterDataEntityPayloadSchema,
	"master_data.item.retired.v1": masterDataEntityPayloadSchema,
	"master_data.item_group.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_group.updated.v1": masterDataEntityPayloadSchema,
	"master_data.item_group.activated.v1": masterDataEntityPayloadSchema,
	"master_data.item_group.inactive.v1": masterDataEntityPayloadSchema,
	"master_data.item_group.retired.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse.created.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse.updated.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse.activated.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse.inactive.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse.moved.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse.retired.v1": masterDataEntityPayloadSchema,
	"master_data.payment_term.created.v1": masterDataEntityPayloadSchema,
	"master_data.payment_term.updated.v1": masterDataEntityPayloadSchema,
	"master_data.payment_term.activated.v1": masterDataEntityPayloadSchema,
	"master_data.payment_term.inactive.v1": masterDataEntityPayloadSchema,
	"master_data.payment_term.retired.v1": masterDataEntityPayloadSchema,
	"master_data.tax_registration.created.v1": masterDataEntityPayloadSchema,
	"master_data.tax_registration.updated.v1": masterDataEntityPayloadSchema,
	"master_data.tax_registration.activated.v1": masterDataEntityPayloadSchema,
	"master_data.tax_registration.blocked.v1": masterDataEntityPayloadSchema,
	"master_data.tax_registration.retired.v1": masterDataEntityPayloadSchema,
	"master_data.tax_registration.restored.v1": masterDataEntityPayloadSchema,
	"master_data.party_role.created.v1": masterDataEntityPayloadSchema,
	"master_data.party_role.updated.v1": masterDataEntityPayloadSchema,
	"master_data.party_role.activated.v1": masterDataEntityPayloadSchema,
	"master_data.party_role.retired.v1": masterDataEntityPayloadSchema,
	"master_data.party_address.created.v1": masterDataEntityPayloadSchema,
	"master_data.party_address.updated.v1": masterDataEntityPayloadSchema,
	"master_data.party_contact.created.v1": masterDataEntityPayloadSchema,
	"master_data.party_contact.updated.v1": masterDataEntityPayloadSchema,
	"master_data.party_external_id.created.v1": masterDataEntityPayloadSchema,
	"master_data.party_relationship.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_uom.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_barcode.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_external_id.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_alias.created.v1": masterDataEntityPayloadSchema,
	"master_data.warehouse_external_id.created.v1": masterDataEntityPayloadSchema,
	"master_data.party.merged.v1": masterDataEntityPayloadSchema,
	"master_data.item_template.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_template.updated.v1": masterDataEntityPayloadSchema,
	"master_data.item_template.activated.v1": masterDataEntityPayloadSchema,
	"master_data.item_template.inactive.v1": masterDataEntityPayloadSchema,
	"master_data.item_template.retired.v1": masterDataEntityPayloadSchema,
	"master_data.item_template_attribute.created.v1":
		masterDataEntityPayloadSchema,
	"master_data.item_template_attribute_option.created.v1":
		masterDataEntityPayloadSchema,
	"master_data.item_variant.created.v1": masterDataEntityPayloadSchema,
	"master_data.item_variant.retired.v1": masterDataEntityPayloadSchema,
	"master_data.change_request.submitted.v1": masterDataEntityPayloadSchema,
	"master_data.change_request.approved.v1": masterDataEntityPayloadSchema,
	"master_data.change_request.rejected.v1": masterDataEntityPayloadSchema,
	"master_data.change_request.applied.v1": masterDataEntityPayloadSchema,
} as const;

export type MasterDataEventType = keyof typeof MasterDataEventSchemas;

/** Exact master-data event type IDs — primary contract authority stays this package. */
export const MASTER_DATA_EVENT_IDS = Object.keys(
	MasterDataEventSchemas,
) as MasterDataEventType[];
