"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	archivePayrollCalendar,
	archivePayrollDeductionRule,
	archivePayrollEarningRule,
	archivePayrollPayGroup,
	archivePayrollStatutoryRule,
	createPayrollCalendar,
	createPayrollDeductionRule,
	createPayrollEarningRule,
	createPayrollPayGroup,
	createPayrollStatutoryRule,
	getPayrollCalendar,
	getPayrollDeductionRule,
	getPayrollEarningRule,
	getPayrollPayGroup,
	getPayrollStatutoryRule,
	listPayrollCalendars,
	listPayrollPayGroups,
	supersedePayrollDeductionRule,
	supersedePayrollEarningRule,
	supersedePayrollStatutoryRule,
	updatePayrollCalendar,
	updatePayrollDeductionRule,
	updatePayrollEarningRule,
	updatePayrollPayGroup,
	updatePayrollStatutoryRule,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const expectedVersionSchema = z.number().int().positive();
const calendarStatusSchema = z.enum(["active", "archived"]);
const payGroupStatusSchema = z.enum(["active", "archived"]);
const ruleTypeSchema = z.enum(["fixed", "rate"]);
const decimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);
const taxTimingSchema = z.enum(["pre_tax", "post_tax"]);

// ─── Calendar schemas ───────────────────────────────────────────────────────

const createCalendarSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: idempotencyKeySchema,
		name: z.string().trim().min(1).max(256),
		timezone: z.string().trim().min(1).max(64),
	})
	.strict();

const updateCalendarSchema = z
	.object({
		calendarId: uuidSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		name: z.string().trim().min(1).max(256).optional(),
		timezone: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

const archiveCalendarSchema = z
	.object({
		calendarId: uuidSchema,
		expectedVersion: expectedVersionSchema,
	})
	.strict();

const getCalendarSchema = z
	.object({
		calendarId: uuidSchema,
	})
	.strict();

const listCalendarsSchema = z
	.object({
		status: calendarStatusSchema.optional(),
	})
	.strict();

// ─── Pay group schemas ───────────────────────────────────────────────────────

const createPayGroupSchema = z
	.object({
		calendarId: uuidSchema,
		code: z.string().trim().min(1).max(64),
		currencyCode: z.string().trim().length(3),
		idempotencyKey: idempotencyKeySchema,
		name: z.string().trim().min(1).max(256),
	})
	.strict();

const updatePayGroupSchema = z
	.object({
		currencyCode: z.string().trim().length(3).optional(),
		expectedVersion: expectedVersionSchema,
		name: z.string().trim().min(1).max(256).optional(),
		payGroupId: uuidSchema,
	})
	.strict();

const archivePayGroupSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		payGroupId: uuidSchema,
	})
	.strict();

const getPayGroupSchema = z
	.object({
		payGroupId: uuidSchema,
	})
	.strict();

const listPayGroupsSchema = z
	.object({
		status: payGroupStatusSchema.optional(),
	})
	.strict();

// ─── Earning rule schemas ────────────────────────────────────────────────────

const createEarningRuleSchema = z
	.object({
		amount: decimalStringSchema.nullable(),
		code: z.string().trim().min(1).max(64),
		currencyCode: z.string().trim().length(3),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: idempotencyKeySchema,
		name: z.string().trim().min(1).max(256),
		payGroupId: uuidSchema,
		rate: decimalStringSchema.nullable(),
		ruleType: ruleTypeSchema,
		ruleVersion: z.string().trim().min(1).max(64),
	})
	.strict();

const updateEarningRuleSchema = z
	.object({
		amount: decimalStringSchema.nullable().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		name: z.string().trim().min(1).max(256).optional(),
		rate: decimalStringSchema.nullable().optional(),
		ruleId: uuidSchema,
	})
	.strict();

const archiveEarningRuleSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		ruleId: uuidSchema,
	})
	.strict();

const supersedeEarningRuleSchema = z
	.object({
		amount: decimalStringSchema.nullable().optional(),
		currencyCode: z.string().trim().length(3).optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		idempotencyKey: idempotencyKeySchema,
		name: z.string().trim().min(1).max(256).optional(),
		rate: decimalStringSchema.nullable().optional(),
		ruleId: uuidSchema,
		ruleType: ruleTypeSchema.optional(),
		ruleVersion: z.string().trim().min(1).max(64),
	})
	.strict();

const getEarningRuleSchema = z
	.object({
		ruleId: uuidSchema,
	})
	.strict();

// ─── Deduction rule schemas ──────────────────────────────────────────────────

const createDeductionRuleSchema = createEarningRuleSchema.extend({
	taxTiming: taxTimingSchema,
});

const updateDeductionRuleSchema = z
	.object({
		amount: decimalStringSchema.nullable().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		name: z.string().trim().min(1).max(256).optional(),
		rate: decimalStringSchema.nullable().optional(),
		ruleId: uuidSchema,
		taxTiming: taxTimingSchema.optional(),
	})
	.strict();

const archiveDeductionRuleSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		ruleId: uuidSchema,
	})
	.strict();

const supersedeDeductionRuleSchema = z
	.object({
		amount: decimalStringSchema.nullable().optional(),
		currencyCode: z.string().trim().length(3).optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		idempotencyKey: idempotencyKeySchema,
		name: z.string().trim().min(1).max(256).optional(),
		rate: decimalStringSchema.nullable().optional(),
		ruleId: uuidSchema,
		ruleType: ruleTypeSchema.optional(),
		ruleVersion: z.string().trim().min(1).max(64),
		taxTiming: taxTimingSchema.optional(),
	})
	.strict();

const getDeductionRuleSchema = z
	.object({
		ruleId: uuidSchema,
	})
	.strict();

// ─── Statutory rule schemas ──────────────────────────────────────────────────

const createStatutoryRuleSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		configJson: z.record(z.string(), z.unknown()).optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: idempotencyKeySchema,
		jurisdictionCode: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		payGroupId: uuidSchema,
		ruleVersion: z.string().trim().min(1).max(64),
	})
	.strict();

const updateStatutoryRuleSchema = z
	.object({
		configJson: z.record(z.string(), z.unknown()).optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		jurisdictionCode: z.string().trim().min(1).max(64).optional(),
		name: z.string().trim().min(1).max(256).optional(),
		ruleId: uuidSchema,
	})
	.strict();

const archiveStatutoryRuleSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		ruleId: uuidSchema,
	})
	.strict();

const supersedeStatutoryRuleSchema = z
	.object({
		configJson: z.record(z.string(), z.unknown()).optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: expectedVersionSchema,
		idempotencyKey: idempotencyKeySchema,
		jurisdictionCode: z.string().trim().min(1).max(64).optional(),
		name: z.string().trim().min(1).max(256).optional(),
		ruleId: uuidSchema,
		ruleVersion: z.string().trim().min(1).max(64),
	})
	.strict();

const getStatutoryRuleSchema = z
	.object({
		ruleId: uuidSchema,
	})
	.strict();

// ─── Calendar actions ────────────────────────────────────────────────────────

export async function createPayrollCalendarAction(input: {
	code: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	idempotencyKey: string;
	name: string;
	timezone: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollCalendarAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the payroll calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createCalendarSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll calendar.",
				});
			}
			return mapPackageResult(
				await createPayrollCalendar(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						code: parsed.data.code,
						name: parsed.data.name,
						timezone: parsed.data.timezone,
						effectiveFrom: parsed.data.effectiveFrom,
						idempotencyKey: parsed.data.idempotencyKey,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function updatePayrollCalendarAction(input: {
	calendarId: string;
	effectiveTo?: string | null;
	expectedVersion: number;
	name?: string;
	timezone?: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "updatePayrollCalendarAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not update the payroll calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateCalendarSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll calendar update.",
				});
			}
			return mapPackageResult(
				await updatePayrollCalendar(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						calendarId: parsed.data.calendarId,
						expectedVersion: parsed.data.expectedVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.timezone === undefined
							? {}
							: { timezone: parsed.data.timezone }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function archivePayrollCalendarAction(input: {
	calendarId: string;
	expectedVersion: number;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "archivePayrollCalendarAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not archive the payroll calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveCalendarSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll calendar archive request.",
				});
			}
			return mapPackageResult(
				await archivePayrollCalendar(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						calendarId: parsed.data.calendarId,
						expectedVersion: parsed.data.expectedVersion,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollCalendarAction(input: {
	calendarId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollCalendarAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the payroll calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getCalendarSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll calendar lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollCalendar(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						calendarId: parsed.data.calendarId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listPayrollCalendarsAction(input: {
	status?: "active" | "archived";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listPayrollCalendarsAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not list payroll calendars.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listCalendarsSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid payroll calendar list filters.",
				});
			}
			return mapPackageResult(
				await listPayrollCalendars(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...(parsed.data.status === undefined
							? {}
							: { status: parsed.data.status }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

// ─── Pay group actions ───────────────────────────────────────────────────────

export async function createPayrollPayGroupAction(input: {
	calendarId: string;
	code: string;
	currencyCode: string;
	idempotencyKey: string;
	name: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollPayGroupAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the pay group.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPayGroupSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid pay group.",
				});
			}
			return mapPackageResult(
				await createPayrollPayGroup(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						calendarId: parsed.data.calendarId,
						code: parsed.data.code,
						currencyCode: parsed.data.currencyCode,
						idempotencyKey: parsed.data.idempotencyKey,
						name: parsed.data.name,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function updatePayrollPayGroupAction(input: {
	currencyCode?: string;
	expectedVersion: number;
	name?: string;
	payGroupId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "updatePayrollPayGroupAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not update the pay group.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updatePayGroupSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid pay group update.",
				});
			}
			return mapPackageResult(
				await updatePayrollPayGroup(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						payGroupId: parsed.data.payGroupId,
						expectedVersion: parsed.data.expectedVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.currencyCode === undefined
							? {}
							: { currencyCode: parsed.data.currencyCode }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function archivePayrollPayGroupAction(input: {
	expectedVersion: number;
	payGroupId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "archivePayrollPayGroupAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not archive the pay group.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archivePayGroupSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid pay group archive request.",
				});
			}
			return mapPackageResult(
				await archivePayrollPayGroup(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						payGroupId: parsed.data.payGroupId,
						expectedVersion: parsed.data.expectedVersion,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollPayGroupAction(input: {
	payGroupId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollPayGroupAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the pay group.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPayGroupSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid pay group lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollPayGroup(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						payGroupId: parsed.data.payGroupId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listPayrollPayGroupsAction(input: {
	status?: "active" | "archived";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listPayrollPayGroupsAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not list pay groups.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listPayGroupsSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid pay group list filters.",
				});
			}
			return mapPackageResult(
				await listPayrollPayGroups(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...(parsed.data.status === undefined
							? {}
							: { status: parsed.data.status }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

// ─── Earning rule actions ────────────────────────────────────────────────────

export async function createPayrollEarningRuleAction(input: {
	amount: string | null;
	code: string;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	idempotencyKey: string;
	name: string;
	payGroupId: string;
	rate: string | null;
	ruleType: "fixed" | "rate";
	ruleVersion: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollEarningRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the earning rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createEarningRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid earning rule.",
				});
			}
			return mapPackageResult(
				await createPayrollEarningRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						amount: parsed.data.amount,
						code: parsed.data.code,
						currencyCode: parsed.data.currencyCode,
						effectiveFrom: parsed.data.effectiveFrom,
						idempotencyKey: parsed.data.idempotencyKey,
						name: parsed.data.name,
						payGroupId: parsed.data.payGroupId,
						rate: parsed.data.rate,
						ruleType: parsed.data.ruleType,
						ruleVersion: parsed.data.ruleVersion,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function updatePayrollEarningRuleAction(input: {
	amount?: string | null;
	effectiveTo?: string | null;
	expectedVersion: number;
	name?: string;
	rate?: string | null;
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "updatePayrollEarningRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not update the earning rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateEarningRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid earning rule update.",
				});
			}
			return mapPackageResult(
				await updatePayrollEarningRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
						expectedVersion: parsed.data.expectedVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.amount === undefined
							? {}
							: { amount: parsed.data.amount }),
						...(parsed.data.rate === undefined
							? {}
							: { rate: parsed.data.rate }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function archivePayrollEarningRuleAction(input: {
	expectedVersion: number;
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "archivePayrollEarningRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not archive the earning rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveEarningRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid earning rule archive request.",
				});
			}
			return mapPackageResult(
				await archivePayrollEarningRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
						expectedVersion: parsed.data.expectedVersion,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function supersedePayrollEarningRuleAction(input: {
	amount?: string | null;
	currencyCode?: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	expectedVersion: number;
	idempotencyKey: string;
	name?: string;
	rate?: string | null;
	ruleId: string;
	ruleType?: "fixed" | "rate";
	ruleVersion: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "supersedePayrollEarningRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not supersede the earning rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(supersedeEarningRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid earning rule supersede request.",
				});
			}
			return mapPackageResult(
				await supersedePayrollEarningRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						effectiveFrom: parsed.data.effectiveFrom,
						expectedVersion: parsed.data.expectedVersion,
						idempotencyKey: parsed.data.idempotencyKey,
						ruleId: parsed.data.ruleId,
						ruleVersion: parsed.data.ruleVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.ruleType === undefined
							? {}
							: { ruleType: parsed.data.ruleType }),
						...(parsed.data.amount === undefined
							? {}
							: { amount: parsed.data.amount }),
						...(parsed.data.rate === undefined
							? {}
							: { rate: parsed.data.rate }),
						...(parsed.data.currencyCode === undefined
							? {}
							: { currencyCode: parsed.data.currencyCode }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollEarningRuleAction(input: {
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollEarningRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the earning rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getEarningRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid earning rule lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollEarningRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

// ─── Deduction rule actions ──────────────────────────────────────────────────

export async function createPayrollDeductionRuleAction(input: {
	amount: string | null;
	code: string;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	idempotencyKey: string;
	name: string;
	payGroupId: string;
	rate: string | null;
	ruleType: "fixed" | "rate";
	ruleVersion: string;
	taxTiming: "pre_tax" | "post_tax";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollDeductionRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the deduction rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createDeductionRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid deduction rule.",
				});
			}
			return mapPackageResult(
				await createPayrollDeductionRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						amount: parsed.data.amount,
						code: parsed.data.code,
						currencyCode: parsed.data.currencyCode,
						effectiveFrom: parsed.data.effectiveFrom,
						idempotencyKey: parsed.data.idempotencyKey,
						name: parsed.data.name,
						payGroupId: parsed.data.payGroupId,
						rate: parsed.data.rate,
						ruleType: parsed.data.ruleType,
						ruleVersion: parsed.data.ruleVersion,
						taxTiming: parsed.data.taxTiming,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function updatePayrollDeductionRuleAction(input: {
	amount?: string | null;
	effectiveTo?: string | null;
	expectedVersion: number;
	name?: string;
	rate?: string | null;
	ruleId: string;
	taxTiming?: "pre_tax" | "post_tax";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "updatePayrollDeductionRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not update the deduction rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateDeductionRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid deduction rule update.",
				});
			}
			return mapPackageResult(
				await updatePayrollDeductionRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
						expectedVersion: parsed.data.expectedVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.amount === undefined
							? {}
							: { amount: parsed.data.amount }),
						...(parsed.data.rate === undefined
							? {}
							: { rate: parsed.data.rate }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
						...(parsed.data.taxTiming === undefined
							? {}
							: { taxTiming: parsed.data.taxTiming }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function archivePayrollDeductionRuleAction(input: {
	expectedVersion: number;
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "archivePayrollDeductionRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not archive the deduction rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveDeductionRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid deduction rule archive request.",
				});
			}
			return mapPackageResult(
				await archivePayrollDeductionRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
						expectedVersion: parsed.data.expectedVersion,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function supersedePayrollDeductionRuleAction(input: {
	amount?: string | null;
	currencyCode?: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	expectedVersion: number;
	idempotencyKey: string;
	name?: string;
	rate?: string | null;
	ruleId: string;
	ruleType?: "fixed" | "rate";
	ruleVersion: string;
	taxTiming?: "pre_tax" | "post_tax";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "supersedePayrollDeductionRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not supersede the deduction rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(supersedeDeductionRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid deduction rule supersede request.",
				});
			}
			return mapPackageResult(
				await supersedePayrollDeductionRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						effectiveFrom: parsed.data.effectiveFrom,
						expectedVersion: parsed.data.expectedVersion,
						idempotencyKey: parsed.data.idempotencyKey,
						ruleId: parsed.data.ruleId,
						ruleVersion: parsed.data.ruleVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.ruleType === undefined
							? {}
							: { ruleType: parsed.data.ruleType }),
						...(parsed.data.amount === undefined
							? {}
							: { amount: parsed.data.amount }),
						...(parsed.data.rate === undefined
							? {}
							: { rate: parsed.data.rate }),
						...(parsed.data.currencyCode === undefined
							? {}
							: { currencyCode: parsed.data.currencyCode }),
						...(parsed.data.taxTiming === undefined
							? {}
							: { taxTiming: parsed.data.taxTiming }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollDeductionRuleAction(input: {
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollDeductionRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the deduction rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getDeductionRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid deduction rule lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollDeductionRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

// ─── Statutory rule actions ──────────────────────────────────────────────────

export async function createPayrollStatutoryRuleAction(input: {
	code: string;
	configJson?: Record<string, unknown>;
	effectiveFrom: string;
	effectiveTo?: string | null;
	idempotencyKey: string;
	jurisdictionCode: string;
	name: string;
	payGroupId: string;
	ruleVersion: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollStatutoryRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the statutory rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createStatutoryRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid statutory rule.",
				});
			}
			return mapPackageResult(
				await createPayrollStatutoryRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						code: parsed.data.code,
						effectiveFrom: parsed.data.effectiveFrom,
						idempotencyKey: parsed.data.idempotencyKey,
						jurisdictionCode: parsed.data.jurisdictionCode,
						name: parsed.data.name,
						payGroupId: parsed.data.payGroupId,
						ruleVersion: parsed.data.ruleVersion,
						...(parsed.data.configJson === undefined
							? {}
							: { configJson: parsed.data.configJson }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function updatePayrollStatutoryRuleAction(input: {
	configJson?: Record<string, unknown>;
	effectiveTo?: string | null;
	expectedVersion: number;
	jurisdictionCode?: string;
	name?: string;
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "updatePayrollStatutoryRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not update the statutory rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateStatutoryRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid statutory rule update.",
				});
			}
			return mapPackageResult(
				await updatePayrollStatutoryRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
						expectedVersion: parsed.data.expectedVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.jurisdictionCode === undefined
							? {}
							: { jurisdictionCode: parsed.data.jurisdictionCode }),
						...(parsed.data.configJson === undefined
							? {}
							: { configJson: parsed.data.configJson }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function archivePayrollStatutoryRuleAction(input: {
	expectedVersion: number;
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "archivePayrollStatutoryRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not archive the statutory rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveStatutoryRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid statutory rule archive request.",
				});
			}
			return mapPackageResult(
				await archivePayrollStatutoryRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
						expectedVersion: parsed.data.expectedVersion,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function supersedePayrollStatutoryRuleAction(input: {
	configJson?: Record<string, unknown>;
	effectiveFrom: string;
	effectiveTo?: string | null;
	expectedVersion: number;
	idempotencyKey: string;
	jurisdictionCode?: string;
	name?: string;
	ruleId: string;
	ruleVersion: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "supersedePayrollStatutoryRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not supersede the statutory rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(supersedeStatutoryRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid statutory rule supersede request.",
				});
			}
			return mapPackageResult(
				await supersedePayrollStatutoryRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						effectiveFrom: parsed.data.effectiveFrom,
						expectedVersion: parsed.data.expectedVersion,
						idempotencyKey: parsed.data.idempotencyKey,
						ruleId: parsed.data.ruleId,
						ruleVersion: parsed.data.ruleVersion,
						...(parsed.data.name === undefined
							? {}
							: { name: parsed.data.name }),
						...(parsed.data.jurisdictionCode === undefined
							? {}
							: { jurisdictionCode: parsed.data.jurisdictionCode }),
						...(parsed.data.configJson === undefined
							? {}
							: { configJson: parsed.data.configJson }),
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollStatutoryRuleAction(input: {
	ruleId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollStatutoryRuleAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the statutory rule.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getStatutoryRuleSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid statutory rule lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollStatutoryRule(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						ruleId: parsed.data.ruleId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
