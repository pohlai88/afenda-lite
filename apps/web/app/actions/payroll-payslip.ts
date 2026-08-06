"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { getOwnPayrollPayslip, getPayrollPayslip } from "@afenda/payroll";
import { z } from "zod";
import { runMemberPermissionAction } from "@/app/actions/_runtime/run-member-permission-action";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const employeeIdSchema = z.string().trim().min(1).max(128);

const getOwnPayslipSchema = z
	.object({
		runId: uuidSchema,
	})
	.strict();

const getPayslipSchema = z
	.object({
		employeeId: employeeIdSchema,
		runId: uuidSchema,
	})
	.strict();

export async function getOwnPayrollPayslipAction(input: {
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runMemberPermissionAction({
		path: "getOwnPayrollPayslipAction",
		permission: "payroll.payslip.read-own",
		safeMessage: "Could not read your payslip.",
		execute: async (session) => {
			const parsed = parseSchema(getOwnPayslipSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid own-payslip request.",
				});
			}
			return mapPackageResult(
				await getOwnPayrollPayslip(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollPayslipAction(input: {
	employeeId: string;
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollPayslipAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not read the payslip.",
		execute: async (session) => {
			const parsed = parseSchema(getPayslipSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payslip lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollPayslip(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						employeeId: parsed.data.employeeId,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
