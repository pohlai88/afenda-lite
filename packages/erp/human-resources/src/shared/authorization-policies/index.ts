import type { HumanResourcesAuthorizationPolicy } from "../authorization-policy-types";
import { compensationPolicy } from "./compensation";
import { compliancePolicy } from "./compliance";
import { employeeProfilePolicy } from "./employee-profile";
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

export { compensationPolicy } from "./compensation";
export { compliancePolicy } from "./compliance";
export { employeeProfilePolicy } from "./employee-profile";
export { employeeRelationsCasePolicy } from "./employee-relations";
export { employeeSubjectPolicy } from "./employee-subject";
export { learningPolicy } from "./learning";
export { leavePolicy } from "./leave";
export { lifecyclePolicy } from "./lifecycle";
export { manifestOnlyPolicy } from "./manifest-only";
export { organizationPolicy } from "./organization";
export { performancePolicy } from "./performance";
export { privacyPolicy } from "./privacy";
export { recruitmentPolicy } from "./recruitment";
export {
	successionPolicy,
	talentAssessmentPolicy,
	talentProfilePolicy,
} from "./talent";
export { timePolicy } from "./time";
export { workforcePlanningPolicy } from "./workforce-planning";

export const HUMAN_RESOURCES_AUTHORIZATION_POLICIES = [
	manifestOnlyPolicy,
	employeeProfilePolicy,
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
