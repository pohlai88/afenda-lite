import {
	compensationBenefitsPolicy,
	compensationCatalogPolicy,
	compensationPayrollHandoffPolicy,
	compensationProposalPolicy,
	employeeCompensationPolicy,
} from "../../../features/compensation-benefits/authorization/compensation";
import {
	complianceAdministrativePolicy,
	employeeDocumentPolicy,
	workEligibilityPolicy,
} from "../../../features/compliance/authorization/compliance";
import { employeeRelationsCasePolicy } from "../../../features/employee-relations/authorization/employee-relations";
import { lifecyclePolicy } from "../../../features/employment-lifecycle/authorization/lifecycle";
import { learningPolicy } from "../../../features/learning/authorization/learning";
import { leavePolicy } from "../../../features/leave/authorization/leave";
import { organizationPolicy } from "../../../features/organization/authorization/organization";
import { performancePolicy } from "../../../features/performance/authorization/performance";
import { privacyPolicy } from "../../../features/privacy/authorization/privacy";
import { recruitmentPolicy } from "../../../features/recruitment/authorization/recruitment";
import {
	successionPolicy,
	talentAssessmentPolicy,
	talentProfilePolicy,
} from "../../../features/talent/authorization/talent";
import { timePolicy } from "../../../features/time/authorization/time";
import { workforcePlanningPolicy } from "../../../features/workforce-planning/authorization/workforce-planning";
import { employeeProfilePolicy } from "../../../features/workforce-records/employment/authorization/employee-profile";
import { employeeSubjectPolicy } from "../../../features/workforce-records/employment/authorization/employee-subject";
import type { HumanResourcesAuthorizationPolicy } from "../authorization-policy-types";
import { manifestOnlyPolicy } from "./manifest-only";

export {
	compensationBenefitsPolicy,
	compensationCatalogPolicy,
	compensationPayrollHandoffPolicy,
	compensationProposalPolicy,
	employeeCompensationPolicy,
} from "../../../features/compensation-benefits/authorization/compensation";
export {
	complianceAdministrativePolicy,
	employeeDocumentPolicy,
	workEligibilityPolicy,
} from "../../../features/compliance/authorization/compliance";
export { employeeRelationsCasePolicy } from "../../../features/employee-relations/authorization/employee-relations";
export { lifecyclePolicy } from "../../../features/employment-lifecycle/authorization/lifecycle";
export { learningPolicy } from "../../../features/learning/authorization/learning";
export { leavePolicy } from "../../../features/leave/authorization/leave";
export { organizationPolicy } from "../../../features/organization/authorization/organization";
export { performancePolicy } from "../../../features/performance/authorization/performance";
export { privacyPolicy } from "../../../features/privacy/authorization/privacy";
export { recruitmentPolicy } from "../../../features/recruitment/authorization/recruitment";
export {
	successionPolicy,
	talentAssessmentPolicy,
	talentProfilePolicy,
} from "../../../features/talent/authorization/talent";
export { timePolicy } from "../../../features/time/authorization/time";
export { workforcePlanningPolicy } from "../../../features/workforce-planning/authorization/workforce-planning";
export { employeeProfilePolicy } from "../../../features/workforce-records/employment/authorization/employee-profile";
export { employeeSubjectPolicy } from "../../../features/workforce-records/employment/authorization/employee-subject";
export { manifestOnlyPolicy } from "./manifest-only";

export const HUMAN_RESOURCES_AUTHORIZATION_POLICIES = [
	manifestOnlyPolicy,
	employeeProfilePolicy,
	employeeSubjectPolicy,
	leavePolicy,
	timePolicy,
	employeeRelationsCasePolicy,
	compensationBenefitsPolicy,
	compensationCatalogPolicy,
	employeeCompensationPolicy,
	compensationPayrollHandoffPolicy,
	compensationProposalPolicy,
	performancePolicy,
	complianceAdministrativePolicy,
	employeeDocumentPolicy,
	workEligibilityPolicy,
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
