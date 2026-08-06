import {
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "privacy" as const;

export const PAYROLL_PRIVACY_COMMANDS = definePayrollOperationRegistry({
	restrictPayrollSubject: {
		id: "payroll.privacy.restriction.place",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "restrictPayrollSubject",
	},
	liftPayrollRestriction: {
		id: "payroll.privacy.restriction.lift",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "liftPayrollRestriction",
	},
	recordPayrollRetentionEvidence: {
		id: "payroll.privacy.retention.record",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "recordPayrollRetentionEvidence",
	},
	expirePayrollRetention: {
		id: "payroll.privacy.retention.expire",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "expirePayrollRetention",
	},
});

export const PAYROLL_PRIVACY_QUERIES = definePayrollOperationRegistry({
	projectPayrollFields: {
		id: "payroll.privacy.fields.project",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "projectPayrollFields",
	},
	respondToPayrollSubjectAccess: {
		id: "payroll.privacy.subject-access.respond",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
		publicName: "respondToPayrollSubjectAccess",
	},
});
