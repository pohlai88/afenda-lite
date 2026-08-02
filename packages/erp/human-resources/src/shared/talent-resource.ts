import {
	type HumanResourcesCareerPlanId,
	type HumanResourcesCompetencyAssessmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesTalentProfileId,
	parseHumanResourcesCareerPlanId,
	parseHumanResourcesCompetencyAssessmentId,
	parseHumanResourcesTalentProfileId,
} from "../brands";
import type { HumanResourcesIdentityResolverPort } from "../identity-resolver";
import type { HumanResourcesTalentAuthorizationStore } from "../talent/store";
import type { HumanResourcesResourceContext } from "./authorization-types";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

export interface TalentResourceDeps {
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	store: HumanResourcesTalentAuthorizationStore;
}

export function talentProfileResource(input: {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	resourceId?: string | undefined;
}): HumanResourcesResourceContext {
	return {
		organizationId: input.organizationId,
		kind: "talent_profile",
		subjectEmployeeId: input.employeeId,
		...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
	};
}

async function withPrimaryManagerOnResource(
	context: HumanResourcesResourceContext,
	employeeId: HumanResourcesEmployeeId,
	store: HumanResourcesTalentAuthorizationStore,
): Promise<HumanResourcesResourceContext> {
	const primaryManager = await store.getPrimaryManagerForEmployee({
		organizationId: context.organizationId,
		employeeId,
		asOf: new Date().toISOString().slice(0, 10),
	});
	if (primaryManager.ok && primaryManager.data !== null) {
		return { ...context, managerEmployeeId: primaryManager.data };
	}
	return context;
}

/** Subject-scoped talent resource with primary manager stamped for policy evaluation. */
export async function resolveTalentProfileResourceForEmployee(
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		resourceId?: string | undefined;
	},
	deps: TalentResourceDeps,
): Promise<HumanResourcesResourceContext> {
	return await withPrimaryManagerOnResource(
		talentProfileResource(input),
		input.employeeId,
		deps.store,
	);
}

/** Org-scoped talent admin ops still supply a resource shell for subject-scoped policies. */
export async function resolveActorTalentProfileResource(
	data: HumanResourcesAuthorizedActorInput,
	deps: TalentResourceDeps,
): Promise<HumanResourcesResourceContext> {
	const { identityResolver } = deps;
	if (identityResolver !== undefined) {
		const identity = await identityResolver.resolveEmployeeForActor({
			organizationId: data.organizationId,
			actorUserId: data.actorUserId,
		});
		if (identity.ok && identity.data !== null) {
			return talentProfileResource({
				organizationId: data.organizationId,
				employeeId: identity.data.employeeId,
			});
		}
	}
	return {
		organizationId: data.organizationId,
		kind: "talent_profile",
	};
}

export async function resolveTalentProfileResourceFromCareerPlan(
	data: { organizationId: string; careerPlanId: HumanResourcesCareerPlanId },
	deps: TalentResourceDeps,
): Promise<HumanResourcesResourceContext | undefined> {
	const parsedId = parseHumanResourcesCareerPlanId(data.careerPlanId);
	if (!parsedId.ok) {
		return;
	}
	const loaded = await deps.store.getCareerPlanById({
		organizationId: data.organizationId,
		careerPlanId: parsedId.data,
	});
	if (!loaded.ok || loaded.data === null) {
		return;
	}
	return withPrimaryManagerOnResource(
		talentProfileResource({
			organizationId: data.organizationId,
			employeeId: loaded.data.employeeId,
			resourceId: data.careerPlanId,
		}),
		loaded.data.employeeId,
		deps.store,
	);
}

export async function resolveTalentProfileResourceFromTalentProfile(
	data: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	},
	deps: TalentResourceDeps,
): Promise<HumanResourcesResourceContext | undefined> {
	const parsedId = parseHumanResourcesTalentProfileId(data.talentProfileId);
	if (!parsedId.ok) {
		return;
	}
	const loaded = await deps.store.getTalentProfileById({
		organizationId: data.organizationId,
		talentProfileId: parsedId.data,
	});
	if (!loaded.ok || loaded.data === null) {
		return;
	}
	return withPrimaryManagerOnResource(
		talentProfileResource({
			organizationId: data.organizationId,
			employeeId: loaded.data.employeeId,
			resourceId: data.talentProfileId,
		}),
		loaded.data.employeeId,
		deps.store,
	);
}

export async function resolveCompetencyAssessmentResource(
	data: {
		organizationId: string;
		assessmentId: HumanResourcesCompetencyAssessmentId;
	},
	deps: TalentResourceDeps,
): Promise<HumanResourcesResourceContext | undefined> {
	const parsedId = parseHumanResourcesCompetencyAssessmentId(data.assessmentId);
	if (!parsedId.ok) {
		return;
	}
	const loaded = await deps.store.getCompetencyAssessmentById({
		organizationId: data.organizationId,
		assessmentId: parsedId.data,
	});
	if (!loaded.ok || loaded.data === null) {
		return;
	}
	const context: HumanResourcesResourceContext = {
		organizationId: data.organizationId,
		kind: "competency_assessment",
		subjectEmployeeId: loaded.data.employeeId,
		resourceId: data.assessmentId,
	};
	return withPrimaryManagerOnResource(
		context,
		loaded.data.employeeId,
		deps.store,
	);
}
