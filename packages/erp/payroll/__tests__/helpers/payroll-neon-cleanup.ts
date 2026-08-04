import {
	database as afendaDatabase,
	and,
	eq,
	payrollAcceptedHandoff,
	payrollAdjustment,
	payrollCalendar,
	payrollDeductionRule,
	payrollEarningRule,
	payrollEmployeeAssignment,
	payrollException,
	payrollPayGroup,
	payrollPayslip,
	payrollPeriod,
	payrollResultLine,
	payrollRuleFinalizedUsage,
	payrollRun,
	payrollRunEmployee,
	payrollStatutoryRule,
	payrollVariableInput,
	platformAuditLog,
	platformDomainEvent,
	sql,
} from "@afenda/db";

const PAYROLL_MODULE = "payroll" as const;

function normalizeTestOrganizationId(organizationId: string): string {
	const normalized = organizationId.trim();
	if (normalized.length === 0) {
		throw new RangeError("Payroll test cleanup requires an organization ID");
	}
	return normalized;
}

async function tableExists(tableName: string): Promise<boolean> {
	const rows = await afendaDatabase.client.execute(sql`
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = ${tableName}
		LIMIT 1
	`);
	return (rows.rows as unknown[]).length > 0;
}

export function isPayrollAcceptedHandoffTableReady(): Promise<boolean> {
	return tableExists("payroll_accepted_handoff");
}

export async function countPayrollOutboxEvents(
	organizationId: string,
): Promise<number> {
	const scoped = normalizeTestOrganizationId(organizationId);
	const rows = await afendaDatabase.client
		.select({ value: sql<number>`count(*)::int` })
		.from(platformDomainEvent)
		.where(
			and(
				eq(platformDomainEvent.organizationId, scoped),
				eq(platformDomainEvent.sourceModule, PAYROLL_MODULE),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

export async function countPayrollAuditFacts(
	organizationId: string,
): Promise<number> {
	const scoped = normalizeTestOrganizationId(organizationId);
	const rows = await afendaDatabase.client
		.select({ value: sql<number>`count(*)::int` })
		.from(platformAuditLog)
		.where(
			and(
				eq(platformAuditLog.organizationId, scoped),
				eq(platformAuditLog.module, PAYROLL_MODULE),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

export async function countPayrollRuns(
	organizationId: string,
): Promise<number> {
	const scoped = normalizeTestOrganizationId(organizationId);
	const rows = await afendaDatabase.client
		.select({ value: sql<number>`count(*)::int` })
		.from(payrollRun)
		.where(eq(payrollRun.organizationId, scoped));
	return Number(rows[0]?.value ?? 0);
}

export async function countAcceptedPayrollHandoffs(
	organizationId: string,
): Promise<number> {
	const scoped = normalizeTestOrganizationId(organizationId);
	if (!(await isPayrollAcceptedHandoffTableReady())) {
		return 0;
	}
	const rows = await afendaDatabase.client
		.select({ value: sql<number>`count(*)::int` })
		.from(payrollAcceptedHandoff)
		.where(eq(payrollAcceptedHandoff.organizationId, scoped));
	return Number(rows[0]?.value ?? 0);
}

export async function countActiveAcceptedPayrollHandoffs(
	organizationId: string,
): Promise<number> {
	const scoped = normalizeTestOrganizationId(organizationId);
	if (!(await isPayrollAcceptedHandoffTableReady())) {
		return 0;
	}
	const rows = await afendaDatabase.client
		.select({ value: sql<number>`count(*)::int` })
		.from(payrollAcceptedHandoff)
		.where(
			and(
				eq(payrollAcceptedHandoff.organizationId, scoped),
				eq(payrollAcceptedHandoff.status, "accepted"),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

export async function cleanupPayrollNeonTestData(
	organizationId: string,
): Promise<void> {
	const scoped = normalizeTestOrganizationId(organizationId);

	await afendaDatabase.client
		.delete(platformDomainEvent)
		.where(
			and(
				eq(platformDomainEvent.organizationId, scoped),
				eq(platformDomainEvent.sourceModule, PAYROLL_MODULE),
			),
		);
	await afendaDatabase.client
		.delete(platformAuditLog)
		.where(
			and(
				eq(platformAuditLog.organizationId, scoped),
				eq(platformAuditLog.module, PAYROLL_MODULE),
			),
		);

	if (await isPayrollAcceptedHandoffTableReady()) {
		await afendaDatabase.client
			.delete(payrollAcceptedHandoff)
			.where(eq(payrollAcceptedHandoff.organizationId, scoped));
	}

	const optionalDeletes: Array<{
		ready: () => Promise<boolean>;
		run: () => Promise<unknown>;
	}> = [
		{
			ready: () => tableExists("payroll_payslip"),
			run: () =>
				afendaDatabase.client
					.delete(payrollPayslip)
					.where(eq(payrollPayslip.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_adjustment"),
			run: () =>
				afendaDatabase.client
					.delete(payrollAdjustment)
					.where(eq(payrollAdjustment.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_rule_finalized_usage"),
			run: () =>
				afendaDatabase.client
					.delete(payrollRuleFinalizedUsage)
					.where(eq(payrollRuleFinalizedUsage.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_result_line"),
			run: () =>
				afendaDatabase.client
					.delete(payrollResultLine)
					.where(eq(payrollResultLine.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_run_employee"),
			run: () =>
				afendaDatabase.client
					.delete(payrollRunEmployee)
					.where(eq(payrollRunEmployee.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_exception"),
			run: () =>
				afendaDatabase.client
					.delete(payrollException)
					.where(eq(payrollException.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_variable_input"),
			run: () =>
				afendaDatabase.client
					.delete(payrollVariableInput)
					.where(eq(payrollVariableInput.organizationId, scoped)),
		},
		{
			ready: () => tableExists("payroll_employee_assignment"),
			run: () =>
				afendaDatabase.client
					.delete(payrollEmployeeAssignment)
					.where(eq(payrollEmployeeAssignment.organizationId, scoped)),
		},
	];

	const readyFlags = await Promise.all(
		optionalDeletes.map(async (step) => step.ready()),
	);
	await Promise.all(
		optionalDeletes.flatMap((step, index) =>
			readyFlags[index] === true ? [step.run()] : [],
		),
	);

	await afendaDatabase.client
		.delete(payrollRun)
		.where(eq(payrollRun.organizationId, scoped));
	await afendaDatabase.client
		.delete(payrollPeriod)
		.where(eq(payrollPeriod.organizationId, scoped));
	await afendaDatabase.client
		.delete(payrollPayGroup)
		.where(eq(payrollPayGroup.organizationId, scoped));
	await afendaDatabase.client
		.delete(payrollEarningRule)
		.where(eq(payrollEarningRule.organizationId, scoped));
	await afendaDatabase.client
		.delete(payrollDeductionRule)
		.where(eq(payrollDeductionRule.organizationId, scoped));
	await afendaDatabase.client
		.delete(payrollStatutoryRule)
		.where(eq(payrollStatutoryRule.organizationId, scoped));
	await afendaDatabase.client
		.delete(payrollCalendar)
		.where(eq(payrollCalendar.organizationId, scoped));
}

export async function seedConflictingPayrollOutboxEvent(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	eventType: string;
	deduplicationKey: string;
}): Promise<void> {
	const scoped = normalizeTestOrganizationId(input.organizationId);
	await afendaDatabase.client.insert(platformDomainEvent).values({
		organizationId: scoped,
		type: input.eventType,
		sourceModule: PAYROLL_MODULE,
		deduplicationKey: input.deduplicationKey,
		correlationId: input.correlationId,
		actorUserId: input.actorUserId,
		payload: { injected: true },
		status: "pending",
		attempts: 0,
	});
}
