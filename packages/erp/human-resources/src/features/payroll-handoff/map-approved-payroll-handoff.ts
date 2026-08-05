import { errorResult, type Result } from "@afenda/errors";
import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";
import {
	approvedPayrollHandoffSchema,
	DEFAULT_HANDOFF_ROUNDING_MODE,
	deriveHandoffDecimalScale,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
	handoffStatutoryProfileSchema,
} from "@afenda/events/schemas";
import type {
	ApprovedCompensationHandoff,
	ApprovedLeaveHandoff,
	ApprovedTimeHandoff,
	BenefitEnrollment,
	EmployeeCompensation,
	PriorEmployerYtd,
	StatutoryProfile,
	WorkAssignment,
} from "../../kernel/contracts";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type { EmployeeAssignmentContext } from "../time/handoff/ports";
import type { EmploymentStatus } from "../workforce-records/employment/employment-status";

export interface MapApprovedPayrollHandoffInput {
	assignment: WorkAssignment;
	assignmentContext?: EmployeeAssignmentContext | null;
	compensationHandoff: ApprovedCompensationHandoff;
	correlationId: string;
	effectiveDate: string;
	employmentStatus: EmploymentStatus;
	leaveBalanceAtTermination: ApprovedPayrollHandoff["leaveBalanceAtTermination"];
	leaveHandoffs: readonly ApprovedLeaveHandoff[];
	priorEmployerYtd: readonly PriorEmployerYtd[];
	statutoryProfile: StatutoryProfile | null;
	timeHandoff: ApprovedTimeHandoff | null;
}

function toIsoDateTime(value: Date | string): string {
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function mapBenefitComponent(
	enrollment: BenefitEnrollment,
	kind: "benefit_employee_contribution" | "benefit_employer_contribution",
	amount: string,
): Result<ApprovedPayrollHandoff["components"][number]> {
	const currencyCode = enrollment.contributionCurrencyCode;
	if (!currencyCode) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
		code: `benefit-${enrollment.planId}`,
		kind,
		amount,
		currencyCode,
		decimalScale: deriveHandoffDecimalScale(amount),
		sourceType: "hr_benefit_enrollment",
		sourceId: enrollment.id,
		sourceVersion: enrollment.version,
	});
}

function buildComponents(
	compensation: EmployeeCompensation,
	enrollments: readonly BenefitEnrollment[],
): Result<ApprovedPayrollHandoff["components"]> {
	const components: ApprovedPayrollHandoff["components"] = [
		{
			code: "base",
			kind: "base",
			amount: compensation.baseAmount,
			currencyCode: compensation.currencyCode,
			decimalScale: deriveHandoffDecimalScale(compensation.baseAmount),
			sourceType: "hr_employee_compensation",
			sourceId: compensation.id,
			sourceVersion: compensation.version,
		},
	];

	for (const enrollment of enrollments) {
		if (enrollment.employeeContributionAmount) {
			const mapped = mapBenefitComponent(
				enrollment,
				"benefit_employee_contribution",
				enrollment.employeeContributionAmount,
			);
			if (!mapped.ok) {
				return mapped;
			}
			components.push(mapped.data);
		}
		if (enrollment.employerContributionAmount) {
			const mapped = mapBenefitComponent(
				enrollment,
				"benefit_employer_contribution",
				enrollment.employerContributionAmount,
			);
			if (!mapped.ok) {
				return mapped;
			}
			components.push(mapped.data);
		}
	}

	return errorResult.ok(components);
}

function mapLeaveFacts(
	leaveHandoffs: readonly ApprovedLeaveHandoff[],
): ApprovedPayrollHandoff["leaveFacts"] {
	return leaveHandoffs.map((handoff) => ({
		requestId: handoff.requestId,
		policyId: handoff.policyId,
		policyVersion: handoff.policyVersion,
		paid: handoff.paid,
		unit: handoff.unit,
		startDate: handoff.startDate,
		endDate: handoff.endDate,
		quantity: handoff.quantity,
		segments: handoff.segments.map((segment) => ({
			date: segment.date,
			quantity: segment.quantity,
			dayPortion: segment.dayPortion,
		})),
		approvedAt: handoff.approvedAt,
		correlationId: handoff.correlationId,
	}));
}

function mapTimeFacts(
	timeHandoff: ApprovedTimeHandoff,
): ApprovedPayrollHandoff["timeFacts"] {
	return {
		timesheetId: timeHandoff.timesheetId,
		periodStart: timeHandoff.periodStart,
		periodEnd: timeHandoff.periodEnd,
		regularMinutes: timeHandoff.regularMinutes,
		publicHolidayMinutes: timeHandoff.publicHolidayMinutes,
		restDayMinutes: timeHandoff.restDayMinutes,
		nightMinutes: timeHandoff.nightMinutes,
		unpaidMinutes: timeHandoff.unpaidMinutes,
		paidLeaveMinutes: timeHandoff.paidLeaveMinutes,
		unpaidLeaveMinutes: timeHandoff.unpaidLeaveMinutes,
		timesheetVersion: timeHandoff.timesheetVersion,
		approvedAt: timeHandoff.approvedAt,
		approvalReference: timeHandoff.approvalReference,
	};
}

function mapStatutoryProfile(
	profile: StatutoryProfile,
): Result<NonNullable<ApprovedPayrollHandoff["statutoryProfile"]>> {
	const parsed = handoffStatutoryProfileSchema.safeParse({
		dependantCount: profile.dependantCount,
		employeeProvidentFundNumber: profile.employeeProvidentFundNumber,
		expatriate: profile.expatriate,
		jurisdictionCode: profile.jurisdictionCode,
		minimumWageZone: profile.minimumWageZone,
		nationalityCountryCode: profile.nationalityCountryCode,
		profileId: profile.id,
		reliefDeclarations: profile.reliefDeclarations.map((declaration) => ({
			amount: declaration.amount,
			currencyCode: declaration.currencyCode,
			dependantReference: declaration.dependantReference,
			evidenceRef: declaration.evidenceRef,
			reliefCode: declaration.reliefCode,
		})),
		reliefDeclarationVersion: profile.reliefDeclarationVersion,
		socialInsuranceBookNumber: profile.socialInsuranceBookNumber,
		socialSecurityNumber: profile.socialSecurityNumber,
		sourceVersion: profile.version,
		taxFileNumber: profile.taxFileNumber,
		taxResidencyStatus: profile.taxResidencyStatus,
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(parsed.data);
}

function mapPriorEmployerYtd(
	records: readonly PriorEmployerYtd[],
): NonNullable<ApprovedPayrollHandoff["priorEmployerYtd"]> {
	return records.map((record) => ({
		currencyCode: record.currencyCode,
		grossAmount: record.grossAmount,
		jurisdictionCode: record.jurisdictionCode,
		priorEmployerName: record.priorEmployerName,
		recordedOn: record.recordedOn,
		statutoryContributionAmount: record.statutoryContributionAmount,
		taxWithheldAmount: record.taxWithheldAmount,
		taxYear: record.taxYear,
	}));
}

function mapOvertimeFacts(
	timeHandoff: ApprovedTimeHandoff | null,
): ApprovedPayrollHandoff["overtimeFacts"] {
	if (!timeHandoff) {
		return [];
	}
	return timeHandoff.overtime.map((entry) => ({
		overtimeType: entry.type,
		approvedMinutes: entry.minutes,
		...(entry.payrollApprovedMinutes === undefined
			? {}
			: { payrollApprovedMinutes: entry.payrollApprovedMinutes }),
		timesheetId: timeHandoff.timesheetId,
		sourceVersion: timeHandoff.timesheetVersion,
	}));
}

function resolveApprovalEvidence(input: {
	compensation: EmployeeCompensation;
	timeHandoff: ApprovedTimeHandoff | null;
	correlationId: string;
}): Result<ApprovedPayrollHandoff["approvalEvidence"]> {
	const approvedAt = input.compensation.approvedAt
		? toIsoDateTime(input.compensation.approvedAt)
		: input.timeHandoff?.approvedAt;
	if (!approvedAt) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	return errorResult.ok({
		approvedAt,
		...(input.compensation.approvedBy
			? { approvedBy: input.compensation.approvedBy }
			: {}),
		correlationId: input.correlationId,
		...(input.timeHandoff?.approvalReference
			? { approvalReference: input.timeHandoff.approvalReference }
			: {}),
	});
}

export function mapApprovedPayrollHandoff(
	input: MapApprovedPayrollHandoffInput,
): Result<ApprovedPayrollHandoff> {
	const compensation = input.compensationHandoff.activeCompensation;
	if (!compensation) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const builtComponents = buildComponents(
		compensation,
		input.compensationHandoff.activeBenefitEnrollments,
	);
	if (!builtComponents.ok) {
		return builtComponents;
	}
	const components = builtComponents.data;

	const approvalEvidenceResult = resolveApprovalEvidence({
		compensation,
		timeHandoff: input.timeHandoff,
		correlationId: input.correlationId,
	});
	if (!approvalEvidenceResult.ok) {
		return approvalEvidenceResult;
	}
	const approvalEvidence = approvalEvidenceResult.data;

	const leavePolicyVersion = input.leaveHandoffs.reduce<number | undefined>(
		(max, fact) =>
			max === undefined
				? fact.policyVersion
				: Math.max(max, fact.policyVersion),
		undefined,
	);

	let statutoryProfile: ApprovedPayrollHandoff["statutoryProfile"] = null;
	if (input.statutoryProfile !== null) {
		const mappedProfile = mapStatutoryProfile(input.statutoryProfile);
		if (!mappedProfile.ok) {
			return mappedProfile;
		}
		statutoryProfile = mappedProfile.data;
	}

	const handoff: ApprovedPayrollHandoff = {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId: input.compensationHandoff.organizationId,
		employeeId: input.compensationHandoff.employeeId,
		employmentId: compensation.employmentId,
		employmentStatus: input.employmentStatus,
		assignment: {
			assignmentId: input.assignment.id,
			positionId: input.assignment.positionId,
			...(input.assignmentContext?.departmentId === undefined
				? {}
				: { departmentId: input.assignmentContext.departmentId }),
			...(input.assignmentContext?.locationKey === undefined
				? {}
				: { locationKey: input.assignmentContext.locationKey }),
			...(input.assignmentContext?.legalEntityKey === undefined
				? {}
				: { legalEntityKey: input.assignmentContext.legalEntityKey }),
		},
		effectiveDate: input.effectiveDate,
		currencyCode: compensation.currencyCode,
		baseAmount: compensation.baseAmount,
		decimalScale: deriveHandoffDecimalScale(compensation.baseAmount),
		roundingMode: DEFAULT_HANDOFF_ROUNDING_MODE,
		payFrequency: compensation.payFrequency,
		components,
		leaveFacts: mapLeaveFacts(input.leaveHandoffs),
		leaveBalanceAtTermination: input.leaveBalanceAtTermination ?? null,
		priorEmployerYtd: mapPriorEmployerYtd(input.priorEmployerYtd),
		statutoryProfile,
		timeFacts: input.timeHandoff ? mapTimeFacts(input.timeHandoff) : null,
		overtimeFacts: mapOvertimeFacts(input.timeHandoff),
		sourceVersion: {
			compensationVersion: compensation.version,
			...(leavePolicyVersion === undefined ? {} : { leavePolicyVersion }),
			...(input.statutoryProfile === null
				? {}
				: { statutoryProfileVersion: input.statutoryProfile.version }),
			...(input.timeHandoff === null
				? {}
				: { timesheetVersion: input.timeHandoff.timesheetVersion }),
		},
		approvalEvidence,
	};

	const parsed = approvedPayrollHandoffSchema.safeParse(handoff);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}

	return errorResult.ok(parsed.data);
}
