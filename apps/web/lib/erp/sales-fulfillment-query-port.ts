import { errorResult } from "@afenda/errors";
import type { SalesFulfillmentQueryPort } from "@afenda/fulfillment";
import { getFulfillableSalesOrder } from "@afenda/sales";

import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";

/** Composition-root Sales fulfillable-order adapter for `@afenda/fulfillment`. */
export function createSalesFulfillmentQueryPort(): SalesFulfillmentQueryPort {
	return {
		async getFulfillableSalesOrder(input) {
			const result = await getFulfillableSalesOrder(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: `fulfillment:${input.organizationId}:${input.salesOrderId}`,
					id: input.salesOrderId,
				},
				createSalesCommandOptions(),
			);
			if (!result.ok) {
				return result;
			}
			if (!result.data) {
				return errorResult.ok(null);
			}
			const { order, lines } = result.data;
			return errorResult.ok({
				status: order.status,
				version: order.version,
				customerPartyId: order.customer.partyId,
				customerPartyCode: order.customer.code,
				customerPartyName: order.customer.name,
				shipToSnapshot: order.customer.shipToAddress
					? {
							name: order.customer.name,
							addressLines: [order.customer.shipToAddress],
							countryCode: "",
						}
					: null,
				lines: lines.map((line) => ({
					salesOrderLineId: line.id,
					itemId: line.item.itemId,
					uomId: line.item.baseUomId,
					orderedQuantity: line.quantity,
				})),
			});
		},
	};
}
