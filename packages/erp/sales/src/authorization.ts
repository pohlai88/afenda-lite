import { errorResult, type Result } from "@afenda/errors";
import type { SalesCommandId, SalesQueryId } from "./module-ids";
import type { SalesPermission } from "./permissions";

export interface SalesAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: SalesPermission;
	}) => Promise<boolean>;
}

const COMMAND_PERMISSION: Record<SalesCommandId, SalesPermission> = {
	"sales.pricing.price_book.create": "sales.pricing.manage",
	"sales.pricing.price_book.entry.add": "sales.pricing.manage",
	"sales.pricing.price_book.activate": "sales.pricing.manage",
	"sales.quotation.create": "sales.quotation.create",
	"sales.quotation.line.add": "sales.quotation.update",
	"sales.quotation.submit": "sales.quotation.update",
	"sales.quotation.approve": "sales.quotation.approve",
	"sales.quotation.send": "sales.quotation.update",
	"sales.quotation.accept": "sales.quotation.update",
	"sales.quotation.expire": "sales.quotation.update",
	"sales.quotation.reject": "sales.quotation.approve",
	"sales.quotation.cancel": "sales.quotation.update",
	"sales.quotation.convert": "sales.order.create",
	"sales.order.create": "sales.order.create",
	"sales.order.line.add": "sales.order.update",
	"sales.order.submit": "sales.order.update",
	"sales.order.approve": "sales.order.approve",
	"sales.order.post": "sales.order.post",
	"sales.order.release": "sales.order.release",
	"sales.order.hold.place": "sales.order.hold",
	"sales.order.hold.resolve": "sales.order.hold",
	"sales.order.fulfillment.record": "sales.order.update",
	"sales.order.cancel": "sales.order.cancel",
	"sales.order.close": "sales.order.close",
	"sales.return.create": "sales.return.create",
	"sales.return.line.add": "sales.return.create",
	"sales.return.submit": "sales.return.create",
	"sales.return.approve": "sales.return.approve",
	"sales.return.reject": "sales.return.approve",
	"sales.return.cancel": "sales.return.cancel",
	"sales.return.close": "sales.return.approve",
};
const QUERY_PERMISSION: Record<SalesQueryId, SalesPermission> = {
	"sales.pricing.calculate": "sales.pricing.read",
	"sales.pricing.price_book.get": "sales.pricing.read",
	"sales.pricing.price_book.list": "sales.pricing.read",
	"sales.quotation.get": "sales.quotation.read",
	"sales.quotation.list": "sales.quotation.read",
	"sales.order.get": "sales.order.read",
	"sales.order.list": "sales.order.list",
	"sales.order.fulfillable": "sales.order.read",
	"sales.return.get": "sales.return.read",
	"sales.return.list": "sales.return.read",
};

async function requirePermission(
	port: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: SalesPermission;
	},
): Promise<Result<void>> {
	if (!port) {
		return errorResult.fail("UNAUTHORIZED");
	}
	return (await port.can(input))
		? errorResult.ok(undefined)
		: errorResult.fail("FORBIDDEN");
}
export function requireSalesCommandPermission(
	port: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: SalesCommandId;
	},
) {
	return requirePermission(port, {
		...input,
		permission: COMMAND_PERMISSION[input.command],
	});
}
export function requireSalesQueryPermission(
	port: SalesAuthorizationPort | undefined,
	input: { organizationId: string; actorUserId: string; query: SalesQueryId },
) {
	return requirePermission(port, {
		...input,
		permission: QUERY_PERMISSION[input.query],
	});
}
export {
	COMMAND_PERMISSION as SALES_COMMAND_PERMISSION,
	QUERY_PERMISSION as SALES_QUERY_PERMISSION,
};
