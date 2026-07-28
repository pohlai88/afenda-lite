"use server";

import type {
	BenefitEnrollment,
	BenefitEnrollmentDependent,
	BenefitPlan,
	BenefitPlanEligibility,
} from "@afenda/human-resources";
import {
	addBenefitEnrollmentDependent,
	archiveBenefitPlan,
	cancelBenefitEnrollment,
	createBenefitPlan,
	endBenefitEnrollment,
	endBenefitEnrollmentDependent,
	enrolBenefit,
	getBenefitPlanEligibility,
	setBenefitPlanEligibility,
	updateBenefitPlan,
	waiveBenefit,
} from "@afenda/human-resources";
import {
	addBenefitEnrollmentDependentInputSchema,
	archiveBenefitPlanInputSchema,
	cancelBenefitEnrollmentInputSchema,
	createBenefitPlanInputSchema,
	endBenefitEnrollmentDependentInputSchema,
	endBenefitEnrollmentInputSchema,
	enrolBenefitInputSchema,
	getBenefitPlanEligibilityInputSchema,
	setBenefitPlanEligibilityInputSchema,
	updateBenefitPlanInputSchema,
	waiveBenefitInputSchema,
} from "@afenda/human-resources/schemas";

import {
	invokeHrPackage,
	runHrCompensationHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

const createBenefitPlanActionSchema = hrActionSchema(
	createBenefitPlanInputSchema,
);
const updateBenefitPlanActionSchema = hrActionSchema(
	updateBenefitPlanInputSchema,
);
const archiveBenefitPlanActionSchema = hrActionSchema(
	archiveBenefitPlanInputSchema,
);
const setBenefitPlanEligibilityActionSchema = hrActionSchema(
	setBenefitPlanEligibilityInputSchema,
);
const getBenefitPlanEligibilityActionSchema = hrActionSchema(
	getBenefitPlanEligibilityInputSchema,
);
const enrolBenefitActionSchema = hrActionSchema(enrolBenefitInputSchema);
const waiveBenefitActionSchema = hrActionSchema(waiveBenefitInputSchema);
const endBenefitEnrollmentActionSchema = hrActionSchema(
	endBenefitEnrollmentInputSchema,
);
const cancelBenefitEnrollmentActionSchema = hrActionSchema(
	cancelBenefitEnrollmentInputSchema,
);
const addBenefitEnrollmentDependentActionSchema = hrActionSchema(
	addBenefitEnrollmentDependentInputSchema,
);
const endBenefitEnrollmentDependentActionSchema = hrActionSchema(
	endBenefitEnrollmentDependentInputSchema,
);

const BENEFITS_MANAGE = "human-resources.benefits.manage" as const;

export async function createBenefitPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: BenefitPlan }>> {
	return runHrHumanResourcesAction<BenefitPlan, { plan: BenefitPlan }>({
		path: "createBenefitPlanAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not create benefit plan.",
		validationMessage: "Enter a valid benefit plan.",
		actionSchema: createBenefitPlanActionSchema,
		input,
		invoke: invokeHrPackage(createBenefitPlan),
		mapData: (plan) => ({ plan }),
	});
}

export async function updateBenefitPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: BenefitPlan }>> {
	return runHrHumanResourcesAction<BenefitPlan, { plan: BenefitPlan }>({
		path: "updateBenefitPlanAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not update benefit plan.",
		validationMessage: "Enter a valid benefit plan update.",
		actionSchema: updateBenefitPlanActionSchema,
		input,
		invoke: invokeHrPackage(updateBenefitPlan),
		mapData: (plan) => ({ plan }),
	});
}

export async function archiveBenefitPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: BenefitPlan }>> {
	return runHrHumanResourcesAction<BenefitPlan, { plan: BenefitPlan }>({
		path: "archiveBenefitPlanAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not archive benefit plan.",
		validationMessage: "Enter a valid benefit plan archive request.",
		actionSchema: archiveBenefitPlanActionSchema,
		input,
		invoke: invokeHrPackage(archiveBenefitPlan),
		mapData: (plan) => ({ plan }),
	});
}

export async function setBenefitPlanEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: BenefitPlanEligibility }>> {
	return runHrHumanResourcesAction<
		BenefitPlanEligibility,
		{ eligibility: BenefitPlanEligibility }
	>({
		path: "setBenefitPlanEligibilityAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not set benefit plan eligibility.",
		validationMessage: "Enter valid benefit plan eligibility.",
		actionSchema: setBenefitPlanEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(setBenefitPlanEligibility),
		mapData: (eligibility) => ({ eligibility }),
	});
}

export async function getBenefitPlanEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: BenefitPlanEligibility | null }>> {
	return runHrHumanResourcesAction<
		BenefitPlanEligibility | null,
		{ eligibility: BenefitPlanEligibility | null }
	>({
		path: "getBenefitPlanEligibilityAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not get benefit plan eligibility.",
		validationMessage: "Enter a valid eligibility lookup.",
		actionSchema: getBenefitPlanEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(getBenefitPlanEligibility),
		mapData: (eligibility) => ({ eligibility }),
	});
}

export async function enrolBenefitAction(
	input: unknown,
): Promise<ActionResult<{ enrollment: BenefitEnrollment }>> {
	return runHrHumanResourcesAction<
		BenefitEnrollment,
		{ enrollment: BenefitEnrollment }
	>({
		path: "enrolBenefitAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not enrol benefit.",
		validationMessage: "Enter a valid benefit enrollment.",
		actionSchema: enrolBenefitActionSchema,
		input,
		invoke: invokeHrPackage(enrolBenefit),
		mapData: (enrollment) => ({ enrollment }),
	});
}

export async function waiveBenefitAction(
	input: unknown,
): Promise<ActionResult<{ enrollment: BenefitEnrollment }>> {
	return runHrHumanResourcesAction<
		BenefitEnrollment,
		{ enrollment: BenefitEnrollment }
	>({
		path: "waiveBenefitAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not waive benefit.",
		validationMessage: "Enter a valid benefit waiver.",
		actionSchema: waiveBenefitActionSchema,
		input,
		invoke: invokeHrPackage(waiveBenefit),
		mapData: (enrollment) => ({ enrollment }),
	});
}

export async function endBenefitEnrollmentAction(
	input: unknown,
): Promise<ActionResult<{ enrollment: BenefitEnrollment }>> {
	return runHrHumanResourcesAction<
		BenefitEnrollment,
		{ enrollment: BenefitEnrollment }
	>({
		path: "endBenefitEnrollmentAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not end benefit enrollment.",
		validationMessage: "Enter a valid enrollment end request.",
		actionSchema: endBenefitEnrollmentActionSchema,
		input,
		invoke: invokeHrPackage(endBenefitEnrollment),
		mapData: (enrollment) => ({ enrollment }),
	});
}

export async function cancelBenefitEnrollmentAction(
	input: unknown,
): Promise<ActionResult<{ enrollment: BenefitEnrollment }>> {
	return runHrHumanResourcesAction<
		BenefitEnrollment,
		{ enrollment: BenefitEnrollment }
	>({
		path: "cancelBenefitEnrollmentAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not cancel benefit enrollment.",
		validationMessage: "Enter a valid enrollment cancel request.",
		actionSchema: cancelBenefitEnrollmentActionSchema,
		input,
		invoke: invokeHrPackage(cancelBenefitEnrollment),
		mapData: (enrollment) => ({ enrollment }),
	});
}

export async function addBenefitEnrollmentDependentAction(
	input: unknown,
): Promise<ActionResult<{ dependent: BenefitEnrollmentDependent }>> {
	return runHrHumanResourcesAction<
		BenefitEnrollmentDependent,
		{ dependent: BenefitEnrollmentDependent }
	>({
		path: "addBenefitEnrollmentDependentAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not add benefit enrollment dependent.",
		validationMessage: "Enter a valid dependent enrollment.",
		actionSchema: addBenefitEnrollmentDependentActionSchema,
		input,
		invoke: invokeHrPackage(addBenefitEnrollmentDependent),
		mapData: (dependent) => ({ dependent }),
	});
}

export async function endBenefitEnrollmentDependentAction(
	input: unknown,
): Promise<ActionResult<{ dependent: BenefitEnrollmentDependent }>> {
	return runHrHumanResourcesAction<
		BenefitEnrollmentDependent,
		{ dependent: BenefitEnrollmentDependent }
	>({
		path: "endBenefitEnrollmentDependentAction",
		permission: BENEFITS_MANAGE,
		safeMessage: "Could not end benefit enrollment dependent.",
		validationMessage: "Enter a valid dependent end request.",
		actionSchema: endBenefitEnrollmentDependentActionSchema,
		input,
		invoke: invokeHrPackage(endBenefitEnrollmentDependent),
		mapData: (dependent) => ({ dependent }),
	});
}
