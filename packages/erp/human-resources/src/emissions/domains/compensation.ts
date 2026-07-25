import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
	type HumanResourcesCompensationBenefitsCommandId,
} from "../../module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_COMPENSATION_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE,
		{
			domain: "compensation-benefits",
			aggregateType: "benefit_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE,
		{
			domain: "compensation-benefits",
			aggregateType: "benefit_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE,
		{
			domain: "compensation-benefits",
			aggregateType: "benefit_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
		{
			domain: "compensation-benefits",
			aggregateType: "benefit_enrollment",
			eventTypes: [HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
		{
			domain: "compensation-benefits",
			aggregateType: "benefit_enrollment",
			eventTypes: [HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
		{
			domain: "compensation-benefits",
			aggregateType: "benefit_enrollment",
			eventTypes: [HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
		{
			domain: "compensation-benefits",
			aggregateType: "compensation_grade",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
		{
			domain: "compensation-benefits",
			aggregateType: "compensation_grade",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
		{
			domain: "compensation-benefits",
			aggregateType: "compensation_grade",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
			{
				domain: "compensation-benefits",
				aggregateType: "compensation_review",
			},
		),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
			{
				domain: "compensation-benefits",
				aggregateType: "compensation_review",
			},
		),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
		{
			domain: "compensation-benefits",
			aggregateType: "compensation_review",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
			{
				domain: "compensation-benefits",
				aggregateType: "compensation_review",
				eventTypes: [HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
			{
				domain: "compensation-benefits",
				aggregateType: "employee_compensation",
				eventTypes: [HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
		{
			domain: "compensation-benefits",
			aggregateType: "employee_compensation",
			eventTypes: [HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
		{
			domain: "compensation-benefits",
			aggregateType: "salary_band",
		},
	),
	[HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
		{
			domain: "compensation-benefits",
			aggregateType: "salary_band",
		},
	),
	[HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
		{
			domain: "compensation-benefits",
			aggregateType: "salary_band",
		},
	),
} satisfies Record<
	HumanResourcesCompensationBenefitsCommandId,
	HumanResourcesMutationEmissionDefinition
>;
