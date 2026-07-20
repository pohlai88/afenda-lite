import { ok, type Result } from "@afenda/errors/result";
import type { SalesFulfillmentQueryPort } from "../../src/ports";

export function createMemorySalesFulfillmentQueryPort(
	orders: Map<
		string,
		{
			organizationId: string;
			salesOrderId: string;
			status: string;
			version: number;
			customerPartyId: string;
			customerPartyCode: string;
			customerPartyName: string;
			shipToSnapshot: {
				name: string;
				addressLines: string[];
				countryCode: string;
			} | null;
			lines: Array<{
				salesOrderLineId: string;
				itemId: string;
				uomId: string;
				orderedQuantity: string;
			}>;
		}
	> = new Map(),
): SalesFulfillmentQueryPort {
	return {
		async getFulfillableSalesOrder(input: {
			organizationId: string;
			salesOrderId: string;
			actorUserId: string;
		}): Promise<
			Result<{
				status: string;
				version: number;
				customerPartyId: string;
				customerPartyCode: string;
				customerPartyName: string;
				shipToSnapshot: {
					name: string;
					addressLines: string[];
					countryCode: string;
				} | null;
				lines: Array<{
					salesOrderLineId: string;
					itemId: string;
					uomId: string;
					orderedQuantity: string;
				}>;
			} | null>
		> {
			const order = orders.get(input.salesOrderId);
			if (!order || order.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(order);
		},
	};
}
