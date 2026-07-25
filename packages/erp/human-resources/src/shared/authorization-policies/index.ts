import type { HumanResourcesAuthorizationPolicy } from "../authorization-policy-types";
import { compensationPolicy } from "./compensation";
import { compliancePolicy } from "./compliance";
import { employeeRelationsCasePolicy } from "./employee-relations";
import { employeeSubjectPolicy } from "./employee-subject";
import { learningPolicy } from "./learning";
import { leavePolicy } from "./leave";
import { lifecyclePolicy } from "./lifecycle";
import { manifestOnlyPolicy } from "./manifest-only";
import { organizationPolicy } from "./organization";
import { performancePolicy } from "./performance";
import { privacyPolicy } from "./privacy";
import { recruitmentPolicy } from "./recruitment";
import {
	successionPolicy,
	talentAssessmentPolicy,
	talentProfilePolicy,
} from "./talent";
import { timePolicy } from "./time";
import { workforcePlanningPolicy } from "./workforce-planning";

export {
	compensationPolicy,
	compliancePolicy,
	employeeRelationsCasePolicy,
	employeeSubjectPolicy,
	learningPolicy,
	leavePolicy,
	lifecyclePolicy,
	manifestOnlyPolicy,
	organizationPolicy,
	performancePolicy,
	privacyPolicy,
	recruitmentPolicy,
	successionPolicy,
	talentAssessmentPolicy,
	talentProfilePolicy,
	timePolicy,
	workforcePlanningPolicy,
};

export const HUMAN_RESOURCES_AUTHORIZATION_POLICIES = [
	manifestOnlyPolicy,
	employeeSubjectPolicy,
	leavePolicy,
	timePolicy,
	employeeRelationsCasePolicy,
	compensationPolicy,
	performancePolicy,
	compliancePolicy,
	talentAssessmentPolicy,
	talentProfilePolicy,
	successionPolicy,
	workforcePlanningPolicy,
	privacyPolicy,
	recruitmentPolicy,
	learningPolicy,
	lifecyclePolicy,
	organizationPolicy,
] as const satisfies readonly HumanResourcesAuthorizationPolicy[];
