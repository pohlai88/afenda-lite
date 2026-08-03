import type { PlatformPermissionCode } from "@afenda/db";

import {
	hasPermission,
	type PermissionBootstrapRole,
} from "@/modules/identity/domain/has-permission";

export type ProductPermissionCode = PlatformPermissionCode;

export interface PermissionSession {
	orgId: string;
	role: PermissionBootstrapRole;
	userId: string;
}

export const PERMISSION_DENIED_MESSAGE: Record<PlatformPermissionCode, string> =
	{
		"org.users.manage":
			"You do not have permission to manage organization users.",
		"org.roles.manage":
			"You do not have permission to manage organization roles.",
		"clients.invite": "You do not have permission to invite members.",
		"account.self": "You do not have permission to manage this account.",
		"master_data.import_create":
			"You do not have permission to create master-data imports.",
		"master_data.import_validate":
			"You do not have permission to validate master-data imports.",
		"master_data.import_approve":
			"You do not have permission to approve master-data imports.",
		"master_data.import_apply":
			"You do not have permission to apply approved master-data imports.",
		"master_data.import_cancel":
			"You do not have permission to cancel master-data imports.",
		"master_data.party_role_manage":
			"You do not have permission to manage party roles.",
		"master_data.party_address_manage":
			"You do not have permission to manage party addresses.",
		"master_data.party_contact_manage":
			"You do not have permission to manage party contacts.",
		"master_data.party_contact_verify":
			"You do not have permission to verify party contacts.",
		"master_data.party_external_id_manage":
			"You do not have permission to manage party external identifiers.",
		"master_data.party_external_id_regulatory_manage":
			"You do not have permission to manage regulatory party identifiers.",
		"master_data.party_relationship_manage":
			"You do not have permission to manage party relationships.",
		"master_data.party_relationship_control_manage":
			"You do not have permission to manage ownership or control relationships.",
		"master_data.item_uom_manage":
			"You do not have permission to manage item UoM conversions.",
		"master_data.item_barcode_manage":
			"You do not have permission to manage item barcodes.",
		"master_data.item_external_id_manage":
			"You do not have permission to manage item external identifiers.",
		"master_data.item_alias_manage":
			"You do not have permission to manage item aliases.",
		"master_data.warehouse_external_id_manage":
			"You do not have permission to manage warehouse external identifiers.",
		"master_data.item_template_attribute_manage":
			"You do not have permission to manage item-template attributes.",
		"master_data.item_template_option_manage":
			"You do not have permission to manage item-template options.",
		"master_data.item_variant_attribute_manage":
			"You do not have permission to assign item-variant attributes.",
		"master_data.item_variant_defining_attribute_manage":
			"You do not have permission to manage identity-defining variant attributes.",
		"corporate_administration.company.read":
			"You do not have permission to read legal company drafts.",
		"corporate_administration.company.manage":
			"You do not have permission to register legal company drafts.",
		"corporate_administration.establishment.manage":
			"You do not have permission to manage legal establishments.",
		"corporate_administration.governance.read":
			"You do not have permission to read corporate governance records.",
		"corporate_administration.governance.manage":
			"You do not have permission to manage corporate governance records.",
		"corporate_administration.officer.read":
			"You do not have permission to read corporate officer records.",
		"corporate_administration.officer.manage":
			"You do not have permission to manage corporate officer records.",
		"corporate_administration.officer_compliance.read":
			"You do not have permission to read officer compliance records.",
		"corporate_administration.officer_compliance.manage":
			"You do not have permission to manage officer compliance records.",
		"corporate_administration.meeting.read":
			"You do not have permission to read corporate meeting records.",
		"corporate_administration.meeting.manage":
			"You do not have permission to manage corporate meeting records.",
		"corporate_administration.resolution.read":
			"You do not have permission to read corporate resolution records.",
		"corporate_administration.resolution.manage":
			"You do not have permission to manage corporate resolution records.",
		"corporate_administration.authority.read":
			"You do not have permission to read corporate authority mandates.",
		"corporate_administration.authority.manage":
			"You do not have permission to manage corporate authority mandates.",
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
		"payables.manage":
			"You do not have permission to manage supplier payables.",
		"payments.payment.read": "You do not have permission to read payments.",
		"payments.payment.create": "You do not have permission to create payments.",
		"payments.payment.update": "You do not have permission to update payments.",
		"payments.payment.post": "You do not have permission to post payments.",
		"payments.payment.reverse":
			"You do not have permission to reverse payments.",
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
		"payments.account.read":
			"You do not have permission to read payment accounts.",
		"payments.availability.read":
			"You do not have permission to read payment application availability.",
		"payments.method.manage":
			"You do not have permission to manage payment methods.",
		"payments.method.read":
			"You do not have permission to read payment methods.",
		"payments.provider.read":
			"You do not have permission to read payment provider configurations.",
		"payments.provider.manage":
			"You do not have permission to manage payment provider configurations.",
		"payments.transaction.read":
			"You do not have permission to read gateway payment transactions.",
		"payments.transaction.manage":
			"You do not have permission to manage gateway payment transactions.",
		"payments.token.read":
			"You do not have permission to read stored payment instrument tokens.",
		"payments.token.manage":
			"You do not have permission to manage stored payment instrument tokens.",
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
		"human-resources.person.read":
			"You do not have permission to read person records.",
		"human-resources.person.manage":
			"You do not have permission to manage person records.",
		"human-resources.worker.read":
			"You do not have permission to read worker records.",
		"human-resources.worker.manage":
			"You do not have permission to manage worker records.",
		"human-resources.personal-details.read":
			"You do not have permission to read personal contact details.",
		"human-resources.personal-details.manage":
			"You do not have permission to manage personal contact details.",
		"human-resources.sensitive-identifiers.read":
			"You do not have permission to read sensitive identifiers.",
		"human-resources.sensitive-identifiers.manage":
			"You do not have permission to manage sensitive identifiers.",
		"human-resources.assignment.read":
			"You do not have permission to read work assignments.",
		"human-resources.assignment.manage":
			"You do not have permission to manage work assignments.",
		"human-resources.organization-context.read":
			"You do not have permission to read organization context.",
		"human-resources.reporting-line.manage":
			"You do not have permission to manage reporting lines.",
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
		"human-resources.interview.read":
			"You do not have permission to read interviews.",
		"human-resources.interview.record":
			"You do not have permission to record interviews.",
		"human-resources.offer.approve":
			"You do not have permission to approve offers.",
		"human-resources.hire.orchestrate":
			"You do not have permission to orchestrate hires.",
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
		"human-resources.leave.handoff.read":
			"You do not have permission to read approved leave handoff.",
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
		"human-resources.compensation-proposal.create":
			"You do not have permission to create compensation proposals.",
		"human-resources.compensation-proposal.amend":
			"You do not have permission to amend compensation proposals.",
		"human-resources.compensation-proposal.approve":
			"You do not have permission to approve compensation proposals.",
		"human-resources.compensation-proposal.read":
			"You do not have permission to read compensation proposals.",
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
		"human-resources.privacy.export":
			"You do not have permission to export human-resources subject data.",
		"human-resources.privacy.anonymize.evaluate":
			"You do not have permission to evaluate human-resources anonymization.",
		"human-resources.privacy.retention.evaluate":
			"You do not have permission to evaluate human-resources retention.",
		"human-resources.privacy.legal-hold.manage":
			"You do not have permission to manage human-resources legal holds.",
		"human-resources.privacy.anonymize.execute":
			"You do not have permission to anonymize human-resources subject data.",
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
		"master_data.reference_read":
			"You do not have permission to read platform reference values used by ERP master data.",
		"master_data.dimension_read":
			"You do not have permission to read organization dimension masters.",
		"master_data.dimension_create":
			"You do not have permission to create organization dimension masters.",
		"master_data.dimension_update":
			"You do not have permission to update organization dimension masters.",
		"master_data.dimension_activate":
			"You do not have permission to activate organization dimension masters.",
		"master_data.dimension_archive":
			"You do not have permission to archive organization dimension masters.",
		"master_data.party_read":
			"You do not have permission to read party masters and party extensions.",
		"master_data.party_create":
			"You do not have permission to create party masters.",
		"master_data.party_update":
			"You do not have permission to update party masters.",
		"master_data.party_suspend":
			"You do not have permission to suspend party masters from operational use.",
		"master_data.item_read":
			"You do not have permission to read item, item-group, template, and variant masters.",
		"master_data.item_create":
			"You do not have permission to create item masters.",
		"master_data.item_update":
			"You do not have permission to update item masters.",
		"master_data.item_suspend":
			"You do not have permission to suspend item masters from operational use.",
		"master_data.item_extension_manage":
			"You do not have permission to manage item groups, UoM conversions, barcodes, aliases, and item external IDs.",
		"master_data.warehouse_read":
			"You do not have permission to read warehouse masters.",
		"master_data.warehouse_manage":
			"You do not have permission to manage warehouse master identities.",
		"master_data.payment_term_read":
			"You do not have permission to read payment-term masters.",
		"master_data.payment_term_manage":
			"You do not have permission to manage payment-term masters.",
		"master_data.tax_registration_manage":
			"You do not have permission to manage tax-registration masters.",
		"master_data.template_manage":
			"You do not have permission to manage item templates and template attributes.",
		"master_data.variant_manage":
			"You do not have permission to manage item variants and variant attribute values.",
		"master_data.change_request_read":
			"You do not have permission to read controlled master-data change requests.",
		"master_data.change_request_create":
			"You do not have permission to create controlled master-data change requests.",
		"master_data.change_request_submit":
			"You do not have permission to submit controlled master-data change requests for review.",
		"master_data.change_request_approve":
			"You do not have permission to approve controlled master-data change requests.",
		"master_data.change_request_apply":
			"You do not have permission to apply approved master-data change requests.",
		"master_data.search_rebuild":
			"You do not have permission to rebuild master-data search projections.",
		"master_data.search_read":
			"You do not have permission to search master-data projections.",
		"master_data.duplicate_review":
			"You do not have permission to review master-data duplicate candidates.",
		"master_data.tax_registration_read":
			"You do not have permission to read masked tax-registration projections.",
		"master_data.tax_registration_sensitive_read":
			"You do not have permission to read unmasked tax-registration projections.",
		"master_data.party_contact_read":
			"You do not have permission to read masked party-contact projections.",
		"master_data.party_contact_sensitive_read":
			"You do not have permission to read unmasked party-contact projections.",
		"master_data.sensitive_external_id_read":
			"You do not have permission to read sensitive external identifier values.",
		"master_data.party_activate":
			"You do not have permission to activate party master records.",
		"master_data.party_inactivate":
			"You do not have permission to inactivate party master records.",
		"master_data.party_block":
			"You do not have permission to block party master records.",
		"master_data.party_unblock":
			"You do not have permission to restore blocked party master records.",
		"master_data.party_retire":
			"You do not have permission to retire party master records.",
		"master_data.party_archive":
			"You do not have permission to archive party master records.",
		"master_data.party_merge":
			"You do not have permission to merge duplicate party master records.",
		"master_data.item_activate":
			"You do not have permission to activate item master records.",
		"master_data.item_inactivate":
			"You do not have permission to inactivate item master records.",
		"master_data.item_block":
			"You do not have permission to block item master records.",
		"master_data.item_unblock":
			"You do not have permission to restore blocked item master records.",
		"master_data.item_retire":
			"You do not have permission to retire item master records.",
		"master_data.item_archive":
			"You do not have permission to archive item master records.",
		"master_data.item_group_activate":
			"You do not have permission to activate item-group master records.",
		"master_data.item_group_inactivate":
			"You do not have permission to inactivate item-group master records.",
		"master_data.item_group_archive":
			"You do not have permission to archive item-group master records.",
		"master_data.warehouse_activate":
			"You do not have permission to activate warehouse master records.",
		"master_data.warehouse_inactivate":
			"You do not have permission to inactivate warehouse master records.",
		"master_data.warehouse_block":
			"You do not have permission to block warehouse master records.",
		"master_data.warehouse_unblock":
			"You do not have permission to restore blocked warehouse master records.",
		"master_data.warehouse_retire":
			"You do not have permission to retire warehouse master records.",
		"master_data.warehouse_archive":
			"You do not have permission to archive warehouse master records.",
		"master_data.payment_term_activate":
			"You do not have permission to activate payment-term master records.",
		"master_data.payment_term_inactivate":
			"You do not have permission to inactivate payment-term master records.",
		"master_data.payment_term_archive":
			"You do not have permission to archive payment-term master records.",
		"master_data.tax_registration_activate":
			"You do not have permission to activate tax-registration master records.",
		"master_data.tax_registration_revoke":
			"You do not have permission to revoke tax-registration master records.",
		"master_data.tax_registration_archive":
			"You do not have permission to archive tax-registration master records.",
		"master_data.tax_registration_restore":
			"You do not have permission to restore tax-registration master records.",
		"master_data.item_template_activate":
			"You do not have permission to activate item-template master records.",
		"master_data.item_template_inactivate":
			"You do not have permission to inactivate item-template master records.",
		"master_data.item_template_retire":
			"You do not have permission to retire item-template master records.",
		"master_data.item_variant_activate":
			"You do not have permission to activate item-variant master records.",
		"master_data.item_variant_inactivate":
			"You do not have permission to inactivate item-variant master records.",
		"master_data.item_variant_block":
			"You do not have permission to block item-variant master records.",
		"master_data.item_variant_unblock":
			"You do not have permission to restore blocked item-variant master records.",
		"master_data.item_variant_retire":
			"You do not have permission to retire item-variant master records.",
		"master_data.item_variant_archive":
			"You do not have permission to archive item-variant master records.",
		"sales.pricing.read":
			"You do not have permission to read Sales price books and calculation traces.",
		"sales.pricing.manage":
			"You do not have permission to manage Sales price books and commercial conditions.",
		"sales.quotation.read":
			"You do not have permission to read Sales quotations.",
		"sales.quotation.create":
			"You do not have permission to create Sales quotations.",
		"sales.quotation.update":
			"You do not have permission to revise and transition Sales quotations.",
		"sales.quotation.approve":
			"You do not have permission to approve or reject Sales quotations.",
		"sales.order.approve":
			"You do not have permission to approve Sales orders.",
		"sales.order.release":
			"You do not have permission to release approved Sales orders to fulfillment.",
		"sales.order.hold":
			"You do not have permission to place and resolve Sales-order holds.",
		"sales.order.close":
			"You do not have permission to close fulfilled or cancelled Sales orders.",
		"sales.return.read":
			"You do not have permission to read Sales return authorizations.",
		"sales.return.create":
			"You do not have permission to create Sales return authorizations.",
		"sales.return.approve":
			"You do not have permission to approve, reject, or close Sales return authorizations.",
		"sales.return.cancel":
			"You do not have permission to cancel Sales return authorizations.",
		"human-resources.performance.goal.own.manage":
			"You do not have permission to create and manage own employee-proposed performance goals and progress.",
		"human-resources.reliability.operate":
			"You do not have permission to replay Human Resources reliability dead letters and acknowledge connector work.",
		"human-resources.connector-cursor.manage":
			"You do not have permission to repair Human Resources connector cursor checkpoints.",
	} as const satisfies Record<PlatformPermissionCode, string>;

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
