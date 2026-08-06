import { errorResult, type Result } from "@afenda/errors";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import {
	PAYROLL_COMMAND_PRIVACY_RESTRICTION_LIFT,
	PAYROLL_COMMAND_PRIVACY_RESTRICTION_PLACE,
	PAYROLL_COMMAND_PRIVACY_RETENTION_EXPIRE,
	PAYROLL_COMMAND_PRIVACY_RETENTION_RECORD,
	PAYROLL_QUERY_PRIVACY_FIELDS_PROJECT,
	PAYROLL_QUERY_PRIVACY_SUBJECT_ACCESS,
} from "../../kernel/operations/module-ids";
import type { PayrollOutputsStore } from "../calculation/outputs.store";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import { getOwnPayrollPayslip, getPayrollPayslip } from "../payslips/payslip";
import type {
	PayrollPrivacyPort,
	PayrollProjectedFields,
	PayrollRetentionEvidence,
	PayrollSubjectAccessExport,
} from "./contract";
import {
	payrollSubjectAccessRecords,
	projectPayrollPayslipFields,
} from "./field-projection";
import {
	expirePayrollRetentionInputSchema,
	liftPayrollRestrictionInputSchema,
	projectPayrollFieldsInputSchema,
	recordPayrollRetentionEvidenceInputSchema,
	respondToPayrollSubjectAccessInputSchema,
	restrictPayrollSubjectInputSchema,
} from "./privacy.schema";

type PayrollPrivacyStore = Pick<PayrollRunsStore, "getRun"> &
	Pick<PayrollOutputsStore, "listResultLinesForRun" | "listRunEmployeesForRun">;

export type PayrollPrivacyCommandOptions =
	GenericPayrollCommandOptions<PayrollPrivacyStore> & {
		privacy?: PayrollPrivacyPort;
	};

function requirePrivacyPort(
	options: PayrollPrivacyCommandOptions,
): Result<PayrollPrivacyPort> {
	if (options.privacy === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payroll privacy capability is not composed.",
		});
	}
	return errorResult.ok(options.privacy);
}

export function restrictPayrollSubject(
	input: unknown,
	options: PayrollPrivacyCommandOptions = {},
): Promise<Result<{ restrictionId: string }>> {
	return runPayrollCommand(input, options, {
		schema: restrictPayrollSubjectInputSchema,
		invalidMessage: "Invalid payroll restriction input",
		command: PAYROLL_COMMAND_PRIVACY_RESTRICTION_PLACE,
		execute: (data) => {
			const privacy = requirePrivacyPort(options);
			if (!privacy.ok) {
				return Promise.resolve(privacy);
			}
			return privacy.data.restrictSubject({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				subjectEmployeeId: data.employeeId,
				requestedAt: data.requestedAt ?? new Date().toISOString(),
				legalBasis: data.legalBasis ?? "processing_restriction",
				classifications: data.classifications,
				restrictionReference: data.restrictionReference,
			});
		},
	});
}

export function liftPayrollRestriction(
	input: unknown,
	options: PayrollPrivacyCommandOptions = {},
): Promise<Result<void>> {
	return runPayrollCommand(input, options, {
		schema: liftPayrollRestrictionInputSchema,
		invalidMessage: "Invalid payroll restriction lift input",
		command: PAYROLL_COMMAND_PRIVACY_RESTRICTION_LIFT,
		execute: (data) => {
			const privacy = requirePrivacyPort(options);
			if (!privacy.ok) {
				return Promise.resolve(privacy);
			}
			return privacy.data.liftRestriction({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				restrictionId: data.restrictionId,
				reason: data.reason,
				liftedAt: data.liftedAt ?? new Date().toISOString(),
			});
		},
	});
}

export function recordPayrollRetentionEvidence(
	input: unknown,
	options: PayrollPrivacyCommandOptions = {},
): Promise<Result<PayrollRetentionEvidence>> {
	return runPayrollCommand(input, options, {
		schema: recordPayrollRetentionEvidenceInputSchema,
		invalidMessage: "Invalid payroll retention evidence input",
		command: PAYROLL_COMMAND_PRIVACY_RETENTION_RECORD,
		execute: (data) => {
			const privacy = requirePrivacyPort(options);
			if (!privacy.ok) {
				return Promise.resolve(privacy);
			}
			return privacy.data.recordRetentionEvidence({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				subjectEmployeeId: data.employeeId,
				requestedAt: data.requestedAt ?? data.clockStartedAt,
				legalBasis: data.legalBasis,
				classifications: data.classifications,
				clockStartedAt: data.clockStartedAt,
				minimumRetentionMonths: data.minimumRetentionMonths,
			});
		},
	});
}

export function expirePayrollRetention(
	input: unknown,
	options: PayrollPrivacyCommandOptions = {},
): Promise<Result<PayrollRetentionEvidence>> {
	return runPayrollCommand(input, options, {
		schema: expirePayrollRetentionInputSchema,
		invalidMessage: "Invalid payroll retention expiry input",
		command: PAYROLL_COMMAND_PRIVACY_RETENTION_EXPIRE,
		execute: (data) => {
			const privacy = requirePrivacyPort(options);
			if (!privacy.ok) {
				return Promise.resolve(privacy);
			}
			return privacy.data.expireRetention({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				evidenceId: data.evidenceId,
				expiredAt: data.expiredAt ?? new Date().toISOString(),
			});
		},
	});
}

export function projectPayrollFields(
	input: unknown,
	options: PayrollPrivacyCommandOptions = {},
): Promise<Result<PayrollProjectedFields>> {
	return runPayrollQuery(input, options, {
		schema: projectPayrollFieldsInputSchema,
		invalidMessage: "Invalid payroll field projection input",
		query: PAYROLL_QUERY_PRIVACY_FIELDS_PROJECT,
		execute: async (data) => {
			const payslip = await getPayrollPayslip(data, options);
			if (!payslip.ok) {
				return payslip;
			}
			return errorResult.ok(
				projectPayrollPayslipFields({
					payslip: payslip.data,
					projectionScope: "read-all",
				}),
			);
		},
	});
}

export function respondToPayrollSubjectAccess(
	input: unknown,
	options: PayrollPrivacyCommandOptions = {},
): Promise<Result<PayrollSubjectAccessExport>> {
	return runPayrollQuery(input, options, {
		schema: respondToPayrollSubjectAccessInputSchema,
		invalidMessage: "Invalid payroll subject-access input",
		query: PAYROLL_QUERY_PRIVACY_SUBJECT_ACCESS,
		execute: async (data, { employees }) => {
			if (employees?.resolveActorEmployeeId === undefined) {
				return errorResult.fail("UNAUTHORIZED");
			}
			const actorEmployeeId = await employees.resolveActorEmployeeId({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
			});
			if (!actorEmployeeId.ok) {
				return actorEmployeeId;
			}
			if (actorEmployeeId.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Employee identity not found",
				});
			}
			if (actorEmployeeId.data !== data.employeeId) {
				// Subject-access responses stay on read-own: a caller may never
				// request another employee's payroll records. FORBIDDEN wording is
				// owned by the canonical error registry and is not overridden here.
				return errorResult.fail("FORBIDDEN");
			}
			const privacy = requirePrivacyPort(options);
			if (!privacy.ok) {
				return privacy;
			}
			const payslip = await getOwnPayrollPayslip(
				{
					organizationId: data.organizationId,
					runId: data.runId,
					actorUserId: data.actorUserId,
				},
				options,
			);
			if (!payslip.ok) {
				return payslip;
			}
			const projection = projectPayrollPayslipFields({
				payslip: payslip.data,
				projectionScope: "read-own",
			});
			return privacy.data.exportSubjectAccess({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				subjectEmployeeId: data.employeeId,
				requestedAt: data.requestedAt ?? new Date().toISOString(),
				legalBasis: data.legalBasis ?? "subject_access_request",
				projectionScope: "read-own",
				records: payrollSubjectAccessRecords(projection),
			});
		},
	});
}
