import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import type {
	PayrollRun,
	PayrollStatutoryResult,
} from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import type {
	PayrollPeriodId,
	PayrollRunId,
} from "../../kernel/identity/brands";
import {
	PAYROLL_COMMAND_STATUTORY_FILING_ANNUAL_GENERATE,
	PAYROLL_COMMAND_STATUTORY_FILING_EVIDENCE_SEAL,
	PAYROLL_COMMAND_STATUTORY_FILING_GENERATE,
	PAYROLL_QUERY_STATUTORY_FILING_OBLIGATION_LIST,
} from "../../kernel/operations/module-ids";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import type { PayrollStatutoryStore } from "../statutory-rules/statutory.store";
import type {
	PayrollFilingObligation,
	PayrollStatutoryFiling,
	PayrollStatutoryFilingLine,
	PayrollStatutoryFilingTotals,
	PayrollStatutoryFilingView,
} from "./contract";
import {
	generateAnnualStatementInputSchema,
	generateStatutoryFilingInputSchema,
	listFilingObligationsInputSchema,
	sealFilingEvidenceInputSchema,
} from "./filing.schema";
import type { PayrollStatutoryFilingStore } from "./filing.store";
import { fingerprintPayrollStatutoryFiling } from "./fingerprint";

type FilingStore = PayrollStatutoryFilingStore &
	PayrollRunsStore &
	PayrollSetupStore &
	PayrollStatutoryStore;

export type PayrollStatutoryFilingCommandOptions =
	GenericPayrollCommandOptions<FilingStore>;

type GeneratePeriodInput = z.infer<typeof generateStatutoryFilingInputSchema>;
type GenerateAnnualInput = z.infer<typeof generateAnnualStatementInputSchema>;
type ListObligationsInput = z.infer<typeof listFilingObligationsInputSchema>;

function nowFrom(options: PayrollStatutoryFilingCommandOptions): Date {
	return options.clock?.now() ?? new Date();
}

/**
 * Fail-closed statutory gate for filing generation (bridging A2).
 *
 * This is the same seam payroll runs and final settlements use
 * (`PayrollStatutoryCapability` over the package calculator registry), applied
 * at the artifact-generation step. A filing may never assert its own statutory
 * authority: absent the capability, or with any sealed result whose calculator
 * is unregistered or not production-approved, generation refuses with
 * `CONFLICT`. Today's only registered calculator is `synth.v1`
 * (`synthetic_only`), so production filing generation fails closed and synth
 * filings stay test-only.
 */
function assertFilingCalculatorsApproved(
	results: readonly PayrollStatutoryResult[],
	options: PayrollStatutoryFilingCommandOptions,
): Result<null> {
	const notApproved = errorResult.fail("CONFLICT", {
		publicMessage:
			"Payroll statutory filing generation is not approved for production",
	});
	const { statutory } = options;
	if (statutory === undefined) {
		return notApproved;
	}
	const calculatorIds = [
		...new Set(results.map((result) => result.calculatorId)),
	].sort();
	for (const calculatorId of calculatorIds) {
		const registered = statutory.requireCalculator(calculatorId);
		if (!(registered.ok && statutory.isProductionApproved(calculatorId))) {
			return notApproved;
		}
	}
	return errorResult.ok(null);
}

function taxYearFromDate(value: string): number {
	return Number(value.slice(0, 4));
}

function sumAmounts(
	results: readonly PayrollStatutoryResult[],
): PayrollStatutoryFilingTotals {
	let base = 0;
	let employee = 0;
	let employer = 0;
	for (const result of results) {
		base += Number(result.baseAmount);
		employee += Number(result.employeeAmount);
		employer += Number(result.employerAmount);
	}
	return {
		baseAmount: base.toFixed(2),
		employeeAmount: employee.toFixed(2),
		employerAmount: employer.toFixed(2),
	};
}

async function requireFiling(
	store: FilingStore,
	input: { filingId: string; organizationId: string },
) {
	const filing = await store.getStatutoryFiling(input);
	if (!filing.ok) {
		return filing;
	}
	if (filing.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The statutory filing was not found",
		});
	}
	return errorResult.ok(filing.data);
}

interface SourceResultFilter {
	employeeId?: string;
	instrumentCode: string;
	jurisdictionCode: string;
	organizationId: string;
	periodId?: PayrollPeriodId;
	runIds: readonly PayrollRunId[];
	taxYear?: number;
}

interface FinalizedRunPeriod {
	periodId: PayrollPeriodId;
	runId: PayrollRunId;
	taxYear: number;
}

async function loadRequiredRuns(
	store: FilingStore,
	organizationId: string,
	runIds: readonly PayrollRunId[],
): Promise<Result<readonly PayrollRun[]>> {
	const loaded = await Promise.all(
		runIds.map((runId) => store.getRun({ organizationId, runId })),
	);
	const runs: PayrollRun[] = [];
	for (const run of loaded) {
		if (!run.ok) {
			return run;
		}
		if (run.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "A source payroll run was not found",
			});
		}
		runs.push(run.data);
	}
	return errorResult.ok(runs);
}

function assertFinalizedSourceRuns(
	runs: readonly PayrollRun[],
	periodId: PayrollPeriodId | undefined,
): Result<null> {
	for (const run of runs) {
		if (run.status !== "finalized") {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Statutory filings can be generated only from finalized payroll runs",
			});
		}
		if (periodId !== undefined && run.periodId !== periodId) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"A source payroll run does not belong to the filing period",
			});
		}
	}
	return errorResult.ok(null);
}

async function assertRunsMatchTaxYear(
	store: FilingStore,
	organizationId: string,
	runs: readonly PayrollRun[],
	taxYear: number,
): Promise<Result<null>> {
	const periods = await Promise.all(
		runs.map((run) =>
			store.getPeriod({ organizationId, periodId: run.periodId }),
		),
	);
	for (const period of periods) {
		if (!period.ok) {
			return period;
		}
		if (period.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The payroll period was not found",
			});
		}
		if (taxYearFromDate(period.data.periodStart) !== taxYear) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"A source payroll run does not belong to the filing tax year",
			});
		}
	}
	return errorResult.ok(null);
}

function matchesFilingFilter(
	result: PayrollStatutoryResult,
	input: SourceResultFilter,
): boolean {
	if (result.jurisdictionCode !== input.jurisdictionCode) {
		return false;
	}
	if (result.ruleCode !== input.instrumentCode) {
		return false;
	}
	return (
		input.employeeId === undefined || result.employeeId === input.employeeId
	);
}

async function loadMatchingStatutoryResults(
	store: FilingStore,
	input: SourceResultFilter,
): Promise<Result<readonly PayrollStatutoryResult[]>> {
	const batches = await Promise.all(
		input.runIds.map((runId) =>
			store.listStatutoryResultsForRun({
				organizationId: input.organizationId,
				runId,
			}),
		),
	);
	const matched: PayrollStatutoryResult[] = [];
	for (const batch of batches) {
		if (!batch.ok) {
			return batch;
		}
		matched.push(
			...batch.data.filter((result) => matchesFilingFilter(result, input)),
		);
	}
	if (matched.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"No sealed statutory results match the filing jurisdiction and instrument",
		});
	}
	return errorResult.ok(matched);
}

async function loadFinalizedSourceResults(
	store: FilingStore,
	input: SourceResultFilter,
): Promise<Result<readonly PayrollStatutoryResult[]>> {
	const runs = await loadRequiredRuns(
		store,
		input.organizationId,
		input.runIds,
	);
	if (!runs.ok) {
		return runs;
	}
	const finalized = assertFinalizedSourceRuns(runs.data, input.periodId);
	if (!finalized.ok) {
		return finalized;
	}
	if (input.taxYear !== undefined) {
		const taxYear = await assertRunsMatchTaxYear(
			store,
			input.organizationId,
			runs.data,
			input.taxYear,
		);
		if (!taxYear.ok) {
			return taxYear;
		}
	}
	return loadMatchingStatutoryResults(store, input);
}

function buildLines(input: {
	filingId: string;
	now: Date;
	organizationId: string;
	results: readonly PayrollStatutoryResult[];
}): PayrollStatutoryFilingLine[] {
	return input.results.map((result, index) => ({
		baseAmount: result.baseAmount,
		calculatorId: result.calculatorId,
		createdAt: input.now,
		currencyCode: result.currencyCode,
		employeeAmount: result.employeeAmount,
		employeeId: result.employeeId,
		employerAmount: result.employerAmount,
		filingId: input.filingId,
		id: randomUUID(),
		organizationId: input.organizationId,
		ruleCode: result.ruleCode,
		ruleVersion: result.ruleVersion,
		runId: result.runId,
		sequence: index + 1,
	}));
}

/**
 * Idempotent replay lookup.
 *
 * The request fingerprint covers caller-supplied identity only (kind,
 * jurisdiction, instrument, period / tax year / employee, source run ids). It
 * deliberately excludes the sourced statutory results: a filing already
 * generated must replay byte-identically even if the sourced run evidence is
 * later reversed or recalculated, and the artifact's own reproducibility is
 * carried by its sealed lines and content hash, not by the request hash.
 */
async function existingOrConflict(
	store: FilingStore,
	input: { idempotencyKey: string; organizationId: string },
	requestFingerprint: string,
): Promise<Result<PayrollStatutoryFiling | null>> {
	const existing = await store.findStatutoryFilingByIdempotencyKey(input);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return errorResult.ok(null);
	}
	if (existing.data.requestFingerprint === requestFingerprint) {
		return errorResult.ok(existing.data);
	}
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

async function persistGeneratedFiling(input: {
	createdBy: string;
	correlationId: string;
	employeeId: string | null;
	idempotencyKey: string;
	instrumentCode: string;
	jurisdictionCode: string;
	kind: PayrollStatutoryFiling["kind"];
	now: Date;
	organizationId: string;
	periodId: string | null;
	requestFingerprint: string;
	results: readonly PayrollStatutoryResult[];
	sourceRunIds: readonly string[];
	store: FilingStore;
	taxYear: number;
}): Promise<Result<PayrollStatutoryFilingView>> {
	const filingId = randomUUID();
	const lines = buildLines({
		filingId,
		now: input.now,
		organizationId: input.organizationId,
		results: input.results,
	});
	const totals = sumAmounts(input.results);
	const filing: PayrollStatutoryFiling = {
		correlationId: input.correlationId,
		createdAt: input.now,
		createdBy: input.createdBy,
		employeeId: input.employeeId,
		evidence: null,
		id: filingId,
		idempotencyKey: input.idempotencyKey,
		instrumentCode: input.instrumentCode,
		jurisdictionCode: input.jurisdictionCode,
		kind: input.kind,
		organizationId: input.organizationId,
		periodId: input.periodId,
		requestFingerprint: input.requestFingerprint,
		sealedAt: null,
		sealedBy: null,
		sourceRunIds: [...input.sourceRunIds],
		status: "generated",
		taxYear: input.taxYear,
		totals,
		updatedAt: input.now,
		updatedBy: input.createdBy,
		version: 1,
	};
	const saved = await input.store.createStatutoryFiling({ filing, lines });
	if (!saved.ok) {
		return saved;
	}
	return errorResult.ok({ filing: saved.data, lines });
}

/**
 * Returns the already-generated artifact for an idempotent replay, before any
 * source evidence is re-read. A retry of the same request therefore never
 * depends on the current state of the sourced runs.
 */
async function replayFiling(
	store: FilingStore,
	input: { idempotencyKey: string; organizationId: string },
	requestFingerprint: string,
): Promise<Result<PayrollStatutoryFilingView | null>> {
	const existing = await existingOrConflict(store, input, requestFingerprint);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return errorResult.ok(null);
	}
	const lines = await store.listStatutoryFilingLines({
		filingId: existing.data.id,
		organizationId: input.organizationId,
	});
	if (!lines.ok) {
		return lines;
	}
	return errorResult.ok({ filing: existing.data, lines: lines.data });
}

async function executeGeneratePeriod(
	data: GeneratePeriodInput,
	store: FilingStore,
	options: PayrollStatutoryFilingCommandOptions,
): Promise<Result<PayrollStatutoryFilingView>> {
	const requestFingerprint = fingerprintPayrollStatutoryFiling({
		instrumentCode: data.instrumentCode,
		jurisdictionCode: data.jurisdictionCode,
		kind: "period_filing",
		periodId: data.periodId,
		runIds: [...data.runIds].sort(),
	});
	const replay = await replayFiling(
		store,
		{
			idempotencyKey: data.idempotencyKey,
			organizationId: data.organizationId,
		},
		requestFingerprint,
	);
	if (!replay.ok) {
		return replay;
	}
	if (replay.data !== null) {
		return errorResult.ok(replay.data);
	}
	const period = await store.getPeriod({
		organizationId: data.organizationId,
		periodId: data.periodId,
	});
	if (!period.ok) {
		return period;
	}
	if (period.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The payroll period was not found",
		});
	}
	const results = await loadFinalizedSourceResults(store, {
		instrumentCode: data.instrumentCode,
		jurisdictionCode: data.jurisdictionCode,
		organizationId: data.organizationId,
		periodId: data.periodId,
		runIds: data.runIds,
	});
	if (!results.ok) {
		return results;
	}
	const approved = assertFilingCalculatorsApproved(results.data, options);
	if (!approved.ok) {
		return approved;
	}
	return persistGeneratedFiling({
		correlationId: data.correlationId,
		createdBy: data.actorUserId,
		employeeId: null,
		idempotencyKey: data.idempotencyKey,
		instrumentCode: data.instrumentCode,
		jurisdictionCode: data.jurisdictionCode,
		kind: "period_filing",
		now: nowFrom(options),
		organizationId: data.organizationId,
		periodId: data.periodId,
		requestFingerprint,
		results: results.data,
		sourceRunIds: data.runIds,
		store,
		taxYear: taxYearFromDate(period.data.periodStart),
	});
}

async function executeGenerateAnnual(
	data: GenerateAnnualInput,
	store: FilingStore,
	options: PayrollStatutoryFilingCommandOptions,
): Promise<Result<PayrollStatutoryFilingView>> {
	const requestFingerprint = fingerprintPayrollStatutoryFiling({
		employeeId: data.employeeId,
		instrumentCode: data.instrumentCode,
		jurisdictionCode: data.jurisdictionCode,
		kind: "annual_statement",
		runIds: [...data.runIds].sort(),
		taxYear: data.taxYear,
	});
	const replay = await replayFiling(
		store,
		{
			idempotencyKey: data.idempotencyKey,
			organizationId: data.organizationId,
		},
		requestFingerprint,
	);
	if (!replay.ok) {
		return replay;
	}
	if (replay.data !== null) {
		return errorResult.ok(replay.data);
	}
	const results = await loadFinalizedSourceResults(store, {
		employeeId: data.employeeId,
		instrumentCode: data.instrumentCode,
		jurisdictionCode: data.jurisdictionCode,
		organizationId: data.organizationId,
		runIds: data.runIds,
		taxYear: data.taxYear,
	});
	if (!results.ok) {
		return results;
	}
	const approved = assertFilingCalculatorsApproved(results.data, options);
	if (!approved.ok) {
		return approved;
	}
	return persistGeneratedFiling({
		correlationId: data.correlationId,
		createdBy: data.actorUserId,
		employeeId: data.employeeId,
		idempotencyKey: data.idempotencyKey,
		instrumentCode: data.instrumentCode,
		jurisdictionCode: data.jurisdictionCode,
		kind: "annual_statement",
		now: nowFrom(options),
		organizationId: data.organizationId,
		periodId: null,
		requestFingerprint,
		results: results.data,
		sourceRunIds: data.runIds,
		store,
		taxYear: data.taxYear,
	});
}

function obligationKey(row: {
	employeeId: string | null;
	instrumentCode: string;
	jurisdictionCode: string;
	kind: string;
	periodId: string | null;
	taxYear: number;
}): string {
	return `${row.kind}:${row.jurisdictionCode}:${row.instrumentCode}:${row.periodId ?? ""}:${row.employeeId ?? ""}:${row.taxYear}`;
}

function pushMissingObligation(
	seen: Set<string>,
	missing: PayrollFilingObligation[],
	obligation: PayrollFilingObligation,
): void {
	const key = obligationKey(obligation);
	if (seen.has(key)) {
		return;
	}
	seen.add(key);
	missing.push(obligation);
}

function collectMissingObligations(input: {
	filters: ListObligationsInput;
	missing: PayrollFilingObligation[];
	results: readonly PayrollStatutoryResult[];
	row: FinalizedRunPeriod;
	seen: Set<string>;
}): void {
	for (const result of input.results) {
		if (
			input.filters.jurisdictionCode !== undefined &&
			result.jurisdictionCode !== input.filters.jurisdictionCode
		) {
			continue;
		}
		if (
			input.filters.instrumentCode !== undefined &&
			result.ruleCode !== input.filters.instrumentCode
		) {
			continue;
		}
		pushMissingObligation(input.seen, input.missing, {
			employeeId: null,
			filingId: null,
			instrumentCode: result.ruleCode,
			jurisdictionCode: result.jurisdictionCode,
			kind: "period_filing",
			periodId: input.row.periodId,
			status: "missing",
			taxYear: input.row.taxYear,
		});
		pushMissingObligation(input.seen, input.missing, {
			employeeId: result.employeeId,
			filingId: null,
			instrumentCode: result.ruleCode,
			jurisdictionCode: result.jurisdictionCode,
			kind: "annual_statement",
			periodId: null,
			status: "missing",
			taxYear: input.row.taxYear,
		});
	}
}

async function loadFinalizedRunPeriods(
	store: FilingStore,
	organizationId: string,
	runIds: readonly PayrollRunId[],
	taxYearFilter: number | undefined,
): Promise<Result<readonly FinalizedRunPeriod[]>> {
	const loaded = await Promise.all(
		runIds.map((runId) => store.getRun({ organizationId, runId })),
	);
	const finalized: Array<{
		periodId: PayrollPeriodId;
		runId: PayrollRunId;
	}> = [];
	for (const [index, run] of loaded.entries()) {
		if (!run.ok) {
			return run;
		}
		if (run.data === null || run.data.status !== "finalized") {
			continue;
		}
		const runId = runIds[index];
		if (runId === undefined) {
			continue;
		}
		finalized.push({ periodId: run.data.periodId, runId });
	}
	const periods = await Promise.all(
		finalized.map((row) =>
			store.getPeriod({ organizationId, periodId: row.periodId }),
		),
	);
	const withYears: FinalizedRunPeriod[] = [];
	for (const [index, period] of periods.entries()) {
		const row = finalized[index];
		if (row === undefined || !period.ok || period.data === null) {
			continue;
		}
		const taxYear = taxYearFromDate(period.data.periodStart);
		if (taxYearFilter !== undefined && taxYear !== taxYearFilter) {
			continue;
		}
		withYears.push({ ...row, taxYear });
	}
	return errorResult.ok(withYears);
}

async function executeListObligations(
	data: ListObligationsInput,
	store: FilingStore,
): Promise<Result<readonly PayrollFilingObligation[]>> {
	const existing = await store.listFilingObligations({
		organizationId: data.organizationId,
		...(data.instrumentCode === undefined
			? {}
			: { instrumentCode: data.instrumentCode }),
		...(data.jurisdictionCode === undefined
			? {}
			: { jurisdictionCode: data.jurisdictionCode }),
		...(data.taxYear === undefined ? {} : { taxYear: data.taxYear }),
	});
	if (!existing.ok) {
		return existing;
	}
	if (data.runIds === undefined || data.runIds.length === 0) {
		return existing;
	}
	const seen = new Set(existing.data.map(obligationKey));
	const runPeriods = await loadFinalizedRunPeriods(
		store,
		data.organizationId,
		data.runIds,
		data.taxYear,
	);
	if (!runPeriods.ok) {
		return runPeriods;
	}
	const batches = await Promise.all(
		runPeriods.data.map((row) =>
			store.listStatutoryResultsForRun({
				organizationId: data.organizationId,
				runId: row.runId,
			}),
		),
	);
	const missing: PayrollFilingObligation[] = [];
	for (const [index, batch] of batches.entries()) {
		if (!batch.ok) {
			return batch;
		}
		const row = runPeriods.data[index];
		if (row === undefined) {
			continue;
		}
		collectMissingObligations({
			filters: data,
			missing,
			results: batch.data,
			row,
			seen,
		});
	}
	return errorResult.ok([...existing.data, ...missing]);
}

export function generateStatutoryFiling(
	input: unknown,
	options: PayrollStatutoryFilingCommandOptions = {},
): Promise<Result<PayrollStatutoryFilingView>> {
	return runPayrollCommand(input, options, {
		schema: generateStatutoryFilingInputSchema,
		invalidMessage: "Invalid statutory filing generate input",
		command: PAYROLL_COMMAND_STATUTORY_FILING_GENERATE,
		execute: (data, { store }) => executeGeneratePeriod(data, store, options),
	});
}

export function generateAnnualStatement(
	input: unknown,
	options: PayrollStatutoryFilingCommandOptions = {},
): Promise<Result<PayrollStatutoryFilingView>> {
	return runPayrollCommand(input, options, {
		schema: generateAnnualStatementInputSchema,
		invalidMessage: "Invalid annual statutory statement input",
		command: PAYROLL_COMMAND_STATUTORY_FILING_ANNUAL_GENERATE,
		execute: (data, { store }) => executeGenerateAnnual(data, store, options),
	});
}

export function sealFilingEvidence(
	input: unknown,
	options: PayrollStatutoryFilingCommandOptions = {},
): Promise<Result<PayrollStatutoryFilingView>> {
	return runPayrollCommand(input, options, {
		schema: sealFilingEvidenceInputSchema,
		invalidMessage: "Invalid statutory filing seal input",
		command: PAYROLL_COMMAND_STATUTORY_FILING_EVIDENCE_SEAL,
		execute: async (data, { store }) => {
			const current = await requireFiling(store, {
				filingId: data.filingId,
				organizationId: data.organizationId,
			});
			if (!current.ok) {
				return current;
			}
			const filing = current.data;
			if (filing.status === "sealed") {
				const lines = await store.listStatutoryFilingLines({
					filingId: filing.id,
					organizationId: data.organizationId,
				});
				if (!lines.ok) {
					return lines;
				}
				return errorResult.ok({ filing, lines: lines.data });
			}
			if (filing.version !== data.expectedVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			if (filing.createdBy === data.actorUserId) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Segregation of duties: the actor who generated a statutory filing cannot seal it",
				});
			}
			const lines = await store.listStatutoryFilingLines({
				filingId: filing.id,
				organizationId: data.organizationId,
			});
			if (!lines.ok) {
				return lines;
			}
			const now = nowFrom(options);
			const evidence = {
				contentHash: fingerprintPayrollStatutoryFiling({
					instrumentCode: filing.instrumentCode,
					jurisdictionCode: filing.jurisdictionCode,
					kind: filing.kind,
					lines: lines.data.map((line) => ({
						baseAmount: line.baseAmount,
						calculatorId: line.calculatorId,
						employeeAmount: line.employeeAmount,
						employeeId: line.employeeId,
						employerAmount: line.employerAmount,
						ruleVersion: line.ruleVersion,
						runId: line.runId,
						sequence: line.sequence,
					})),
					sourceRunIds: filing.sourceRunIds,
					totals: filing.totals,
				}),
				instrumentCode: filing.instrumentCode,
				jurisdictionCode: filing.jurisdictionCode,
				kind: filing.kind,
				lines: lines.data,
				sourceRunIds: filing.sourceRunIds,
				totals: filing.totals,
			};
			const saved = await store.saveStatutoryFilingTransition({
				expectedVersion: filing.version,
				filing: {
					...filing,
					evidence,
					sealedAt: now,
					sealedBy: data.actorUserId,
					status: "sealed",
					updatedAt: now,
					updatedBy: data.actorUserId,
					version: filing.version + 1,
				},
			});
			if (!saved.ok) {
				return saved;
			}
			return errorResult.ok({ filing: saved.data, lines: lines.data });
		},
	});
}

export function listFilingObligations(
	input: unknown,
	options: PayrollStatutoryFilingCommandOptions = {},
): Promise<Result<readonly PayrollFilingObligation[]>> {
	return runPayrollQuery(input, options, {
		schema: listFilingObligationsInputSchema,
		invalidMessage: "Invalid statutory filing obligation query",
		query: PAYROLL_QUERY_STATUTORY_FILING_OBLIGATION_LIST,
		execute: (data, { store }) => executeListObligations(data, store),
	});
}
