import { errorResult } from "@afenda/errors";
import { z } from "zod";
import {
	requireSalesCommandPermission,
	requireSalesQueryPermission,
} from "../../authorization";
import {
	returnAuthorizationIdSchema,
	salesOrderIdSchema,
	salesOrderLineIdSchema,
} from "../../brands";
import {
	resolveSalesDeps,
	type SalesCommandOptions,
	type SalesQueryOptions,
} from "../../command-options";
import {
	salesMutationContextSchema,
	salesQueryContextSchema,
	salesVersionedMutationContextSchema,
} from "../../contracts/context";
import { nonNegativeDecimalAmountSchema } from "../../contracts/money";
import { salesPageRequestSchema } from "../../pagination";
import type { ReturnAuthorizationStatus } from "../../types";
import { salesEvidence } from "../integration-projections/evidence";

export const createReturnAuthorizationInputSchema =
	salesMutationContextSchema.extend({
		code: z.string().trim().min(1).max(64),
		orderId: salesOrderIdSchema,
		reason: z.string().trim().min(3).max(500),
	});
export const addReturnAuthorizationLineInputSchema =
	salesVersionedMutationContextSchema.extend({
		returnAuthorizationId: returnAuthorizationIdSchema,
		orderLineId: salesOrderLineIdSchema,
		quantity: z.coerce.string().pipe(nonNegativeDecimalAmountSchema),
		reason: z.string().trim().min(3).max(500),
		requestedDisposition: z.enum(["refund", "replacement", "repair", "reject"]),
	});
export const returnTransitionInputSchema =
	salesVersionedMutationContextSchema.extend({
		returnAuthorizationId: returnAuthorizationIdSchema,
	});
export const getReturnAuthorizationInputSchema = salesQueryContextSchema.extend(
	{
		id: returnAuthorizationIdSchema,
	},
);
export const listReturnAuthorizationsInputSchema = salesPageRequestSchema;
export async function createReturnAuthorization(
	input: z.input<typeof createReturnAuthorizationInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = createReturnAuthorizationInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid return authorization",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.return.create",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.createReturnAuthorization(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			code: parsed.data.code,
			normalizedCode: parsed.data.code.toUpperCase(),
			orderId: parsed.data.orderId,
			status: "draft",
			reason: parsed.data.reason,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.return.created.v1",
			entityType: "sales_return_authorization",
			code: parsed.data.code,
			action: "CREATE",
		}),
	);
}
export async function addReturnAuthorizationLine(
	input: z.input<typeof addReturnAuthorizationLineInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = addReturnAuthorizationLineInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid return line",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.return.line.add",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.addReturnLine(
		{ ...parsed.data, actorUserId: parsed.data.actorUserId },
		salesEvidence({
			...parsed.data,
			eventType: "sales.return.line_added.v1",
			entityType: "sales_return_authorization_line",
			code: parsed.data.returnAuthorizationId,
			action: "CREATE",
		}),
	);
}
export async function getReturnAuthorization(
	input: z.input<typeof getReturnAuthorizationInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = getReturnAuthorizationInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid return-authorization ID",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.return.get",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.getReturnAuthorization({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
	});
}

export async function listReturnAuthorizations(
	input: z.input<typeof listReturnAuthorizationsInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = listReturnAuthorizationsInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter valid return-authorization filters",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.return.list",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.listReturnAuthorizations(parsed.data);
}
async function transition(
	command:
		| "sales.return.submit"
		| "sales.return.approve"
		| "sales.return.reject"
		| "sales.return.cancel"
		| "sales.return.close",
	status: ReturnAuthorizationStatus,
	input: z.input<typeof returnTransitionInputSchema>,
	options: SalesCommandOptions,
) {
	const parsed = returnTransitionInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid return transition",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.transitionReturn(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.returnAuthorizationId,
			expectedVersion: parsed.data.expectedVersion,
			status,
			actorUserId: parsed.data.actorUserId,
		},
		salesEvidence({
			...parsed.data,
			eventType: `sales.return.${status}.v1`,
			entityType: "sales_return_authorization",
			code: parsed.data.returnAuthorizationId,
			action: "UPDATE",
		}),
	);
}
export const submitReturnAuthorization = (
	input: z.input<typeof returnTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.return.submit", "submitted", input, options);
export const approveReturnAuthorization = (
	input: z.input<typeof returnTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.return.approve", "approved", input, options);
export const rejectReturnAuthorization = (
	input: z.input<typeof returnTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.return.reject", "rejected", input, options);
export const cancelReturnAuthorization = (
	input: z.input<typeof returnTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.return.cancel", "cancelled", input, options);
export const closeReturnAuthorization = (
	input: z.input<typeof returnTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.return.close", "closed", input, options);
