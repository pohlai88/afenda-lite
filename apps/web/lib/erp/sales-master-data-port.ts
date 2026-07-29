import { fail, ok } from "@afenda/errors/result";
import {
	getItemById,
	getPartyById,
	getPaymentTermById,
	type MasterQueryOptions,
} from "@afenda/master-data";
import {
	createDrizzleMasterDataStore,
	createDrizzlePlatformReferenceStore,
} from "@afenda/master-data/adapters/drizzle";
import { refUomIdSchema } from "@afenda/master-data/platform-references";
import type { MasterDataSnapshotPort } from "@afenda/sales";

import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

/** Resolves active Master Data records into immutable Sales document snapshots. */
export function createSalesMasterDataPort(): MasterDataSnapshotPort {
	const store = createDrizzleMasterDataStore();
	const references = createDrizzlePlatformReferenceStore();
	const options: MasterQueryOptions = {
		store,
		authorization: createMasterDataAuthorizationPort(),
	};
	return {
		async resolveCustomer(input) {
			const partyResult = await getPartyById(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					id: input.partyId,
				},
				options,
			);
			if (!partyResult.ok) return partyResult;
			const party = partyResult.data;
			if (party?.status !== "active")
				return fail("CONFLICT", "Customer master is not active", {
					reason: "SALES_MASTER_NOT_USABLE",
				});
			if (!input.paymentTermId)
				return ok({
					partyId: input.partyId,
					code: party.code,
					name: party.name,
				});
			const termResult = await getPaymentTermById(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					id: input.paymentTermId,
				},
				options,
			);
			if (!termResult.ok) return termResult;
			const term = termResult.data;
			if (term?.status !== "active")
				return fail("CONFLICT", "Payment term master is not active", {
					reason: "SALES_MASTER_NOT_USABLE",
				});
			return ok({
				partyId: input.partyId,
				code: party.code,
				name: party.name,
				paymentTermId: input.paymentTermId,
				paymentTermCode: term.code,
				paymentTermName: term.name,
				netDays: term.netDays,
			});
		},
		async resolveItem(input) {
			const itemResult = await getItemById(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					id: input.itemId,
				},
				options,
			);
			if (!itemResult.ok) return itemResult;
			const item = itemResult.data;
			if (item?.status !== "active" || !item.sellable)
				return fail("CONFLICT", "Item master is not sellable", {
					reason: "SALES_MASTER_NOT_USABLE",
				});
			const uomId = refUomIdSchema.safeParse(
				input.requestedUomId ?? item.baseUomId,
			);
			if (!uomId.success)
				return fail(
					"VALIDATION_ERROR",
					"Unit of measure identifier is invalid",
					{
						reason: "SALES_MASTER_NOT_USABLE",
					},
				);
			const uom = await references.getUomById(uomId.data);
			if (!uom?.active)
				return fail("CONFLICT", "Unit of measure is not active", {
					reason: "SALES_MASTER_NOT_USABLE",
				});
			return ok({
				itemId: input.itemId,
				code: item.code,
				name: item.name,
				baseUomId: uom.id,
				baseUomCode: uom.code,
			});
		},
	};
}
