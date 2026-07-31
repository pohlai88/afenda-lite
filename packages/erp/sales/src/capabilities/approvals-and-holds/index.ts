import { errorResult } from "@afenda/errors";
import { z } from "zod";
import { requireSalesCommandPermission } from "../../authorization";
import { salesHoldIdSchema, salesOrderIdSchema } from "../../brands";
import {
	resolveSalesDeps,
	type SalesCommandOptions,
} from "../../command-options";
import { salesMutationContextSchema } from "../../contracts/context";
import { SALES_HOLD_KINDS } from "../../types";
import { salesEvidence } from "../integration-projections/evidence";

export const placeSalesOrderHoldInputSchema = salesMutationContextSchema.extend(
	{
		orderId: salesOrderIdSchema,
		kind: z.enum(SALES_HOLD_KINDS),
		reason: z.string().trim().min(3).max(500),
	},
);
export const resolveSalesOrderHoldInputSchema =
	salesMutationContextSchema.extend({ holdId: salesHoldIdSchema });
export async function placeSalesOrderHold(
	input: z.input<typeof placeSalesOrderHoldInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = placeSalesOrderHoldInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales-order hold",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.hold.place",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.placeHold(
		{ ...parsed.data },
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.hold_placed.v1",
			entityType: "sales_order_hold",
			code: parsed.data.orderId,
			action: "CREATE",
		}),
	);
}
export async function resolveSalesOrderHold(
	input: z.input<typeof resolveSalesOrderHoldInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = resolveSalesOrderHoldInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales-order hold resolution",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.hold.resolve",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.resolveHold(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.holdId,
			actorUserId: parsed.data.actorUserId,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.hold_resolved.v1",
			entityType: "sales_order_hold",
			code: parsed.data.holdId,
			action: "UPDATE",
		}),
	);
}
