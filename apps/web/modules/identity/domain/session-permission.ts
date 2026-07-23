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
	"accounting.journal.read":
		"You do not have permission to read accounting journals.",
	"accounting.journal.create":
		"You do not have permission to create accounting journals.",
	"accounting.journal.update":
		"You do not have permission to update accounting journals.",
	"accounting.journal.post":
		"You do not have permission to post accounting journals.",
	"accounting.journal.reverse":
		"You do not have permission to reverse accounting journals.",
	"accounting.trial_balance.read":
		"You do not have permission to read the trial balance.",
	"accounting.ledger.read":
		"You do not have permission to read ledger activity.",
	"accounting.period.read":
		"You do not have permission to read accounting periods.",
	"accounting.period.open":
		"You do not have permission to open accounting periods.",
	"accounting.period.soft_close":
		"You do not have permission to soft-close accounting periods.",
	"accounting.period.close":
		"You do not have permission to close accounting periods.",
	"accounting.period.reopen":
		"You do not have permission to reopen accounting periods.",
	"accounting.account.read":
		"You do not have permission to read charts of accounts.",
	"accounting.account.manage":
		"You do not have permission to manage charts of accounts.",
	"accounting.posting_rule.manage":
		"You do not have permission to manage posting rules.",
	"accounting.exception.read":
		"You do not have permission to read posting exceptions.",
	"accounting.exception.manage":
		"You do not have permission to manage posting exceptions.",
	"human-resources.employee.create":
		"You do not have permission to create employees.",
	"human-resources.employee.read":
		"You do not have permission to read employees.",
	"human-resources.employee.update":
		"You do not have permission to update employees.",
	"human-resources.employment.manage":
		"You do not have permission to manage employments.",
	"human-resources.organization.read":
		"You do not have permission to read HR organization structure.",
	"human-resources.organization.manage":
		"You do not have permission to manage HR organization structure.",
	"human-resources.requisition.create":
		"You do not have permission to create requisitions.",
	"human-resources.candidate.manage":
		"You do not have permission to manage candidates.",
	"human-resources.interview.record":
		"You do not have permission to record interviews.",
	"human-resources.offer.approve":
		"You do not have permission to approve offers.",
	"human-resources.onboarding.manage":
		"You do not have permission to manage onboarding.",
	"human-resources.offboarding.manage":
		"You do not have permission to manage offboarding.",
	"human-resources.leave-policy.read":
		"You do not have permission to read leave policies.",
	"human-resources.leave-policy.manage":
		"You do not have permission to manage leave policies.",
	"human-resources.leave-entitlement.read":
		"You do not have permission to read leave entitlements.",
	"human-resources.leave-entitlement.grant":
		"You do not have permission to grant leave entitlements.",
	"human-resources.leave-entitlement.adjust":
		"You do not have permission to adjust leave entitlements.",
	"human-resources.leave-request.own":
		"You do not have permission to submit leave requests.",
	"human-resources.leave-request.approve-team":
		"You do not have permission to approve team leave requests.",
	"human-resources.leave-request.backdate":
		"You do not have permission to submit backdated leave requests.",
	"human-resources.leave-request.sensitive-read":
		"You do not have permission to read sensitive leave data.",
	"human-resources.attendance.manage":
		"You do not have permission to manage attendance.",
	"human-resources.time.calendar.read":
		"You do not have permission to read work calendars.",
	"human-resources.time.calendar.manage":
		"You do not have permission to manage work calendars.",
	"human-resources.time.shift.read":
		"You do not have permission to read shifts.",
	"human-resources.time.shift.manage":
		"You do not have permission to manage shifts.",
	"human-resources.time.schedule.read":
		"You do not have permission to read schedules.",
	"human-resources.time.schedule.manage":
		"You do not have permission to manage schedules.",
	"human-resources.time.schedule.publish":
		"You do not have permission to publish schedules.",
	"human-resources.time.attendance.self.record":
		"You do not have permission to record attendance.",
	"human-resources.time.attendance.read":
		"You do not have permission to read attendance.",
	"human-resources.time.attendance.correct":
		"You do not have permission to correct attendance.",
	"human-resources.time.attendance.manage":
		"You do not have permission to enter attendance for others.",
	"human-resources.time.exception.read":
		"You do not have permission to read attendance exceptions.",
	"human-resources.time.exception.resolve":
		"You do not have permission to resolve attendance exceptions.",
	"human-resources.time.timesheet.self.read":
		"You do not have permission to read own timesheets.",
	"human-resources.time.timesheet.self.edit":
		"You do not have permission to edit own timesheets.",
	"human-resources.time.timesheet.submit":
		"You do not have permission to submit timesheets.",
	"human-resources.time.timesheet.read":
		"You do not have permission to read timesheets.",
	"human-resources.time.timesheet.approve":
		"You do not have permission to approve timesheets.",
	"human-resources.time.timesheet.reopen":
		"You do not have permission to reopen timesheets.",
	"human-resources.time.timesheet.lock":
		"You do not have permission to lock timesheets.",
	"human-resources.time.overtime.request":
		"You do not have permission to request overtime.",
	"human-resources.time.overtime.read":
		"You do not have permission to read overtime requests.",
	"human-resources.time.overtime.approve":
		"You do not have permission to approve overtime requests.",
	"human-resources.time.handoff.read":
		"You do not have permission to read approved time handoff.",
	"human-resources.performance.manage":
		"You do not have permission to manage performance.",
	"human-resources.performance.own.read":
		"You do not have permission to read own performance.",
	"human-resources.performance.manager.manage":
		"You do not have permission to manage team performance.",
	"human-resources.performance.improvement-plan.manage":
		"You do not have permission to manage improvement plans.",
	"human-resources.performance.review.reopen":
		"You do not have permission to reopen performance reviews.",
	"human-resources.performance.confidential.read":
		"You do not have permission to read confidential performance data.",
	"human-resources.learning.manage":
		"You do not have permission to manage learning.",
	"human-resources.certification.manage":
		"You do not have permission to manage certifications.",
	"human-resources.compensation.read":
		"You do not have permission to read compensation.",
	"human-resources.compensation.manage":
		"You do not have permission to manage compensation.",
	"human-resources.benefits.manage":
		"You do not have permission to manage benefits.",
	"human-resources.employee-case.open":
		"You do not have permission to open employee cases.",
	"human-resources.employee-case.assigned.read":
		"You do not have permission to read assigned employee cases.",
	"human-resources.employee-case.investigate":
		"You do not have permission to investigate employee cases.",
	"human-resources.employee-case.finding":
		"You do not have permission to record case findings.",
	"human-resources.employee-case.action.approve":
		"You do not have permission to approve case actions.",
	"human-resources.employee-case.appeal":
		"You do not have permission to manage case appeals.",
	"human-resources.employee-case.exceptional.admin":
		"You do not have permission for exceptional case administration.",
	"human-resources.workforce-plan.read":
		"You do not have permission to read workforce plans.",
	"human-resources.workforce-plan.prepare":
		"You do not have permission to prepare workforce plans.",
	"human-resources.workforce-plan.approve":
		"You do not have permission to approve workforce plans.",
	"human-resources.headcount.reserve":
		"You do not have permission to reserve headcount.",
	"human-resources.headcount.exceptional-adjust":
		"You do not have permission for exceptional headcount adjustments.",
	"human-resources.document-requirement.manage":
		"You do not have permission to manage document requirements.",
	"human-resources.employee-document.own.read":
		"You do not have permission to read own employee documents.",
	"human-resources.employee-document.own.register":
		"You do not have permission to register own employee documents.",
	"human-resources.employee-document.verify":
		"You do not have permission to verify employee documents.",
	"human-resources.work-eligibility.verify":
		"You do not have permission to verify work eligibility.",
	"human-resources.compliance.administer":
		"You do not have permission to administer compliance.",
	"human-resources.identity-document.sensitive.read":
		"You do not have permission to read sensitive identity documents.",
	"human-resources.policy-acknowledgement.administer":
		"You do not have permission to administer policy acknowledgements.",
	"human-resources.competency.read":
		"You do not have permission to read competencies.",
	"human-resources.competency.manage":
		"You do not have permission to manage competencies.",
	"human-resources.competency.assess":
		"You do not have permission to assess competencies.",
	"human-resources.career-plan.own.read":
		"You do not have permission to read own career plans.",
	"human-resources.career-plan.manage":
		"You do not have permission to manage career plans.",
	"human-resources.talent.admin":
		"You do not have permission to administer talent.",
	"human-resources.talent.profile.sensitive.read":
		"You do not have permission to read sensitive talent profiles.",
	"human-resources.succession.admin":
		"You do not have permission to administer succession plans.",
	"human-resources.succession.executive.read":
		"You do not have permission to read succession coverage.",
	"payroll.setup.manage":
		"You do not have permission to manage payroll setup.",
	"payroll.input.manage":
		"You do not have permission to manage payroll inputs.",
	"payroll.run.create": "You do not have permission to create payroll runs.",
	"payroll.run.calculate":
		"You do not have permission to calculate payroll runs.",
	"payroll.run.review": "You do not have permission to review payroll runs.",
	"payroll.run.finalize":
		"You do not have permission to finalize payroll runs.",
	"payroll.run.reverse":
		"You do not have permission to reverse payroll runs.",
	"payroll.payslip.read-own":
		"You do not have permission to read own payslips.",
	"payroll.payslip.read-all":
		"You do not have permission to read organization payslips.",
	"payroll.reconciliation.manage":
		"You do not have permission to manage payroll reconciliation.",
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
