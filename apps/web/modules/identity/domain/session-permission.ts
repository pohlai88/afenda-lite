import type { PlatformPermissionCodeV1 } from "@afenda/db";

import {
	hasPermission,
	type PermissionBootstrapRole,
} from "@/modules/identity/domain/has-permission";

export type ProductPermissionCode = PlatformPermissionCodeV1;

export type PermissionSession = {
	orgId: string;
	userId: string;
	role: PermissionBootstrapRole;
};

export const PERMISSION_DENIED_MESSAGE: Record<PlatformPermissionCodeV1, string> = {
	"org.users.manage":
		"You do not have permission to manage organization users.",
	"org.roles.manage":
		"You do not have permission to manage organization roles.",
	"clients.invite": "You do not have permission to invite members.",
	"account.self": "You do not have permission to manage this account.",
	"master_data.read":
		"You do not have permission to read organization master data.",
	"master_data.manage":
		"You do not have permission to manage organization master data.",
	"master_data.approve":
		"You do not have permission to approve master-data change requests.",
	"master_data.import_approve":
		"You do not have permission to approve and apply master-data import.",
	"sales.order.create": "You do not have permission to create sales orders.",
	"sales.order.update": "You do not have permission to update sales orders.",
	"sales.order.post": "You do not have permission to post sales orders.",
	"sales.order.cancel": "You do not have permission to cancel sales orders.",
	"sales.order.read": "You do not have permission to read sales orders.",
	"sales.order.list": "You do not have permission to list sales orders.",
	"purchasing.order.create":
		"You do not have permission to create purchase orders.",
	"purchasing.order.update":
		"You do not have permission to update purchase orders.",
	"purchasing.order.post":
		"You do not have permission to post purchase orders.",
	"purchasing.order.cancel":
		"You do not have permission to cancel purchase orders.",
	"purchasing.order.close":
		"You do not have permission to close purchase orders.",
	"purchasing.order.read":
		"You do not have permission to read purchase orders.",
	"purchasing.order.list":
		"You do not have permission to list purchase orders.",
	"inventory.movement.create":
		"You do not have permission to create stock movements.",
	"inventory.movement.post":
		"You do not have permission to post stock movements.",
	"inventory.movement.cancel":
		"You do not have permission to cancel stock movements.",
	"inventory.movement.read":
		"You do not have permission to read stock movements.",
	"inventory.reservation.create":
		"You do not have permission to create stock reservations.",
	"inventory.reservation.release":
		"You do not have permission to release stock reservations.",
	"inventory.availability.read":
		"You do not have permission to read stock availability.",
	"inventory.adjustment.post":
		"You do not have permission to post stock adjustments.",
	"receiving.receipt.read":
		"You do not have permission to read goods receipts.",
	"receiving.receipt.create":
		"You do not have permission to create goods receipts.",
	"receiving.receipt.update":
		"You do not have permission to update goods receipts.",
	"receiving.receipt.post":
		"You do not have permission to post goods receipts.",
	"receiving.receipt.cancel":
		"You do not have permission to cancel draft goods receipts.",
	"receiving.receipt.reverse":
		"You do not have permission to reverse posted goods receipts.",
	"receiving.discrepancy.record":
		"You do not have permission to record receiving discrepancies.",
	"receiving.discrepancy.resolve":
		"You do not have permission to resolve receiving discrepancies.",
	"fulfillment.delivery.read":
		"You do not have permission to read deliveries.",
	"fulfillment.delivery.create":
		"You do not have permission to create deliveries.",
	"fulfillment.delivery.update":
		"You do not have permission to update deliveries.",
	"fulfillment.picking.confirm":
		"You do not have permission to confirm picking.",
	"fulfillment.packing.confirm":
		"You do not have permission to confirm packing.",
	"fulfillment.delivery.post":
		"You do not have permission to post deliveries.",
	"fulfillment.delivery.cancel":
		"You do not have permission to cancel deliveries.",
	"fulfillment.pod.record":
		"You do not have permission to record proof of delivery.",
	"fulfillment.delivery.close":
		"You do not have permission to close deliveries.",
	"receivables.invoice.read":
		"You do not have permission to read sales invoices.",
	"receivables.invoice.create":
		"You do not have permission to create sales invoices.",
	"receivables.invoice.update":
		"You do not have permission to update sales invoices.",
	"receivables.invoice.post":
		"You do not have permission to post sales invoices.",
	"receivables.invoice.cancel":
		"You do not have permission to cancel sales invoices.",
	"receivables.invoice.close":
		"You do not have permission to close sales invoices.",
	"receivables.credit_note.issue":
		"You do not have permission to issue sales credit notes.",
	"receivables.receipt.apply":
		"You do not have permission to apply customer receipts.",
	"receivables.receipt_application.reverse":
		"You do not have permission to reverse customer receipt applications.",
	"receivables.balance.read":
		"You do not have permission to read customer balances.",
	"receivables.aging.read":
		"You do not have permission to read customer aging.",
	"payables.read": "You do not have permission to read supplier payables.",
	"payables.manage": "You do not have permission to manage supplier payables.",
	"payments.payment.read": "You do not have permission to read payments.",
	"payments.payment.create": "You do not have permission to create payments.",
	"payments.payment.update": "You do not have permission to update payments.",
	"payments.payment.post": "You do not have permission to post payments.",
	"payments.payment.reverse": "You do not have permission to reverse payments.",
	"payments.refund.create": "You do not have permission to create refunds.",
	"payments.refund.post": "You do not have permission to post refunds.",
	"payments.transfer.create":
		"You do not have permission to create payment transfers.",
	"payments.transfer.post":
		"You do not have permission to post payment transfers.",
	"payments.application_instruction.manage":
		"You do not have permission to manage payment application instructions.",
	"payments.account.manage":
		"You do not have permission to manage payment accounts.",
	"payments.account.read": "You do not have permission to read payment accounts.",
	"payments.availability.read":
		"You do not have permission to read payment application availability.",
	"accounting.read":
		"You do not have permission to read accounting journals and balances.",
	"accounting.manage":
		"You do not have permission to manage accounting journals and periods.",
} as const satisfies Record<PlatformPermissionCodeV1, string>;

/**
 * Binds the N10 permission kernel to the authenticated session organization.
 * Product ports supply only a governed ARCH-023 v1 permission code.
 */
export function sessionHasPermission(
	session: PermissionSession,
	code: ProductPermissionCode,
): Promise<boolean> {
	return hasPermission({
		orgId: session.orgId,
		userId: session.userId,
		code,
		bootstrapRole: session.role,
	});
}
