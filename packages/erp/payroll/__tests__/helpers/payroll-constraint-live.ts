import {
	database as afendaDatabase,
	eq,
	payrollCalendar,
	payrollEmployeeAssignment,
	payrollException,
	payrollPayGroup,
	payrollPeriod,
	payrollRun,
	sql,
} from "@afenda/db";

export async function isPayrollAssignmentRangeMigrationApplied(): Promise<boolean> {
	const rows = await afendaDatabase.client.execute(sql`
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'payroll_employee_assignment_active_range_excl'
		LIMIT 1
	`);
	return (rows.rows as unknown[]).length > 0;
}

export async function isPayrollFoundationMigrationApplied(): Promise<boolean> {
	const rows = await afendaDatabase.client.execute(sql`
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'payroll_calendar'
			AND column_name = 'code'
		LIMIT 1
	`);
	const calendarReady = (rows.rows as unknown[]).length > 0;
	if (!calendarReady) {
		return false;
	}

	const runColumns = await afendaDatabase.client.execute(sql`
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'payroll_run'
			AND column_name = 'calculation_version'
		LIMIT 1
	`);
	return (runColumns.rows as unknown[]).length > 0;
}

export interface PayrollConstraintSeed {
	actorUserId: string;
	calendarId: string;
	organizationId: string;
	payGroupId: string;
	periodId: string;
	runId: string;
}

export async function seedPayrollConstraintChain(input: {
	organizationId: string;
	actorUserId: string;
	suffix: string;
}): Promise<PayrollConstraintSeed> {
	const calendarId = crypto.randomUUID();
	const payGroupId = crypto.randomUUID();
	const periodId = crypto.randomUUID();
	const runId = crypto.randomUUID();

	await afendaDatabase.client.insert(payrollCalendar).values({
		id: calendarId,
		organizationId: input.organizationId,
		code: `CAL-${input.suffix}`,
		name: "Constraint test calendar",
		timezone: "UTC",
		status: "active",
		effectiveFrom: "2025-01-01",
		effectiveTo: null,
		createIdempotencyKey: `idem-cal-${input.suffix}`,
		createRequestFingerprint: `fp-cal-${input.suffix}`,
		version: 1,
		createdBy: input.actorUserId,
		updatedBy: input.actorUserId,
	});

	await afendaDatabase.client.insert(payrollPayGroup).values({
		id: payGroupId,
		organizationId: input.organizationId,
		calendarId,
		code: `PG-${input.suffix}`,
		name: "Constraint test pay group",
		currencyCode: "USD",
		status: "active",
		createIdempotencyKey: `idem-pg-${input.suffix}`,
		createRequestFingerprint: `fp-pg-${input.suffix}`,
		version: 1,
		createdBy: input.actorUserId,
		updatedBy: input.actorUserId,
	});

	await afendaDatabase.client.insert(payrollPeriod).values({
		id: periodId,
		organizationId: input.organizationId,
		payGroupId,
		periodStart: "2025-01-01",
		periodEnd: "2025-01-31",
		cutoffDate: "2025-01-28",
		status: "open",
		createIdempotencyKey: `idem-period-${input.suffix}`,
		createRequestFingerprint: `fp-period-${input.suffix}`,
		version: 1,
		createdBy: input.actorUserId,
		updatedBy: input.actorUserId,
	});

	await afendaDatabase.client.insert(payrollRun).values({
		id: runId,
		organizationId: input.organizationId,
		payGroupId,
		periodId,
		runType: "regular",
		sequence: 1,
		status: "draft",
		finalizedAt: null,
		finalizedBy: null,
		calculationSnapshotHash: null,
		createIdempotencyKey: `idem-run-${input.suffix}`,
		createRequestFingerprint: `fp-run-${input.suffix}`,
		version: 1,
		createdBy: input.actorUserId,
		updatedBy: input.actorUserId,
	});

	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		calendarId,
		payGroupId,
		periodId,
		runId,
	};
}

export async function deletePayrollConstraintOrg(
	organizationId: string,
): Promise<void> {
	await afendaDatabase.client
		.delete(payrollEmployeeAssignment)
		.where(eq(payrollEmployeeAssignment.organizationId, organizationId));
	await afendaDatabase.client
		.delete(payrollException)
		.where(eq(payrollException.organizationId, organizationId));
	await afendaDatabase.client
		.delete(payrollRun)
		.where(eq(payrollRun.organizationId, organizationId));
	await afendaDatabase.client
		.delete(payrollPeriod)
		.where(eq(payrollPeriod.organizationId, organizationId));
	await afendaDatabase.client
		.delete(payrollPayGroup)
		.where(eq(payrollPayGroup.organizationId, organizationId));
	await afendaDatabase.client
		.delete(payrollCalendar)
		.where(eq(payrollCalendar.organizationId, organizationId));
}
