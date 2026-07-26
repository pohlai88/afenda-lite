export const HUMAN_RESOURCES_COMMAND_PERSON_CREATE =
	"human-resources.person.create" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_UPDATE =
	"human-resources.person.update" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE =
	"human-resources.person.preferred-name.update" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET =
	"human-resources.person.privacy-classification.set" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD =
	"human-resources.person.contact.add" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE =
	"human-resources.person.contact.update" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE =
	"human-resources.person.contact.retire" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD =
	"human-resources.person.identifier.add" as const;
export const HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE =
	"human-resources.person.identifier.retire" as const;
export const HUMAN_RESOURCES_COMMAND_WORKER_CREATE =
	"human-resources.worker.create" as const;
export const HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE =
	"human-resources.worker.change-type" as const;
export const HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS =
	"human-resources.worker.change-status" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE =
	"human-resources.employee.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE =
	"human-resources.employee.update" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE =
	"human-resources.employment.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND =
	"human-resources.employment.amend" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT =
	"human-resources.employment.correct" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE =
	"human-resources.employment-contract.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT =
	"human-resources.employment-contract.correct" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE =
	"human-resources.employment-contract.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END =
	"human-resources.employment-contract.end" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE =
	"human-resources.department.create" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE =
	"human-resources.department.update" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE =
	"human-resources.department.activate" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE =
	"human-resources.department.archive" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_CREATE =
	"human-resources.job.create" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_UPDATE =
	"human-resources.job.update" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE =
	"human-resources.job.activate" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE =
	"human-resources.job.archive" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_CREATE =
	"human-resources.position.create" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_UPDATE =
	"human-resources.position.update" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE =
	"human-resources.position.activate" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_FREEZE =
	"human-resources.position.freeze" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_CLOSE =
	"human-resources.position.close" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE =
	"human-resources.assignment.create" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END =
	"human-resources.assignment.end" as const;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY =
	"human-resources.reporting-line.assign-primary" as const;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE =
	"human-resources.reporting-line.close" as const;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY =
	"human-resources.reporting-line.replace-primary" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT =
	"human-resources.requisition.create-draft" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND =
	"human-resources.requisition.amend" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT =
	"human-resources.requisition.submit" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE =
	"human-resources.requisition.approve" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN =
	"human-resources.requisition.open" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD =
	"human-resources.requisition.place-on-hold" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE =
	"human-resources.requisition.close" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL =
	"human-resources.requisition.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER =
	"human-resources.requisition.assign-hiring-manager" as const;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE =
	"human-resources.candidate.create" as const;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE =
	"human-resources.candidate.update-profile" as const;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT =
	"human-resources.candidate.withdraw-consent" as const;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION =
	"human-resources.candidate.change-retention" as const;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_ANONYMIZE =
	"human-resources.candidate.anonymize" as const;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE =
	"human-resources.application.create" as const;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW =
	"human-resources.application.move-to-in-review" as const;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING =
	"human-resources.application.move-to-interviewing" as const;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT =
	"human-resources.application.reject" as const;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW =
	"human-resources.application.withdraw" as const;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN =
	"human-resources.application.reopen" as const;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE =
	"human-resources.interview.schedule" as const;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER =
	"human-resources.interview.assign-interviewer" as const;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL =
	"human-resources.interview.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION =
	"human-resources.interview.record-evaluation" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_CREATE =
	"human-resources.offer.create" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT =
	"human-resources.offer.amend-draft" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_ISSUE =
	"human-resources.offer.issue" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT =
	"human-resources.offer.accept" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_DECLINE =
	"human-resources.offer.decline" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE =
	"human-resources.offer.expire" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW =
	"human-resources.offer.withdraw" as const;
export const HUMAN_RESOURCES_COMMAND_OFFER_APPROVE =
	"human-resources.offer.approve" as const;
export const HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER =
	"human-resources.hire.from-accepted-offer" as const;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_START =
	"human-resources.onboarding.start" as const;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK =
	"human-resources.onboarding.complete-task" as const;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE =
	"human-resources.onboarding.complete" as const;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION =
	"human-resources.onboarding.record-orientation" as const;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF =
	"human-resources.onboarding.record-equipment-handoff" as const;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF =
	"human-resources.onboarding.record-access-handoff" as const;
export const HUMAN_RESOURCES_COMMAND_PROBATION_OPEN =
	"human-resources.probation.open" as const;
export const HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND =
	"human-resources.probation.extend" as const;
export const HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME =
	"human-resources.probation.record-outcome" as const;
export const HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT =
	"human-resources.probation.record-assessment" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM =
	"human-resources.employment.confirm" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER =
	"human-resources.assignment.transfer" as const;
export const HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE =
	"human-resources.termination.propose" as const;
export const HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE =
	"human-resources.termination.approve" as const;
export const HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE =
	"human-resources.termination.finalize" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_START =
	"human-resources.offboarding.start" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK =
	"human-resources.offboarding.complete-task" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW =
	"human-resources.offboarding.record-exit-interview" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE =
	"human-resources.offboarding.record-clearance" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION =
	"human-resources.offboarding.record-access-revocation" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF =
	"human-resources.offboarding.record-payroll-handoff" as const;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE =
	"human-resources.offboarding.complete" as const;
export const HUMAN_RESOURCES_COMMAND_COURSE_CREATE =
	"human-resources.course.create" as const;
export const HUMAN_RESOURCES_COMMAND_COURSE_UPDATE =
	"human-resources.course.update" as const;
export const HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE =
	"human-resources.course.activate" as const;
export const HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE =
	"human-resources.course.archive" as const;
export const HUMAN_RESOURCES_COMMAND_SESSION_CREATE =
	"human-resources.session.create" as const;
export const HUMAN_RESOURCES_COMMAND_SESSION_START =
	"human-resources.session.start" as const;
export const HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE =
	"human-resources.session.complete" as const;
export const HUMAN_RESOURCES_COMMAND_SESSION_CANCEL =
	"human-resources.session.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR =
	"human-resources.session.assign-instructor" as const;
export const HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE =
	"human-resources.learning-assignment.create" as const;
export const HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL =
	"human-resources.learning-assignment.enrol" as const;
export const HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE =
	"human-resources.learning-assignment.waive" as const;
export const HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD =
	"human-resources.completion.record" as const;
export const HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD =
	"human-resources.learning-attendance.record" as const;
export const HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE =
	"human-resources.certification.issue" as const;
export const HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE =
	"human-resources.certification.revoke" as const;
export const HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE =
	"human-resources.certification.expire" as const;
export const HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW =
	"human-resources.certification.renew" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE =
	"human-resources.compensation-grade.create" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE =
	"human-resources.compensation-grade.update" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE =
	"human-resources.compensation-grade.archive" as const;
export const HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE =
	"human-resources.salary-band.create" as const;
export const HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE =
	"human-resources.salary-band.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE =
	"human-resources.salary-band.archive" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE =
	"human-resources.compensation-grade-progression-rule.create" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE =
	"human-resources.compensation-grade-progression-rule.archive" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE =
	"human-resources.employee-compensation.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND =
	"human-resources.employee-compensation.amend" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE =
	"human-resources.employee-compensation.approve" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE =
	"human-resources.employee-compensation.schedule" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE =
	"human-resources.employee-compensation.activate" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT =
	"human-resources.employee-compensation.correct" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END =
	"human-resources.employee-compensation.end" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT =
	"human-resources.compensation-review.create-draft" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION =
	"human-resources.compensation-review.record-recommendation" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE =
	"human-resources.compensation-review.finalize" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT =
	"human-resources.compensation-review.apply-approved-result" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE =
	"human-resources.compensation-review-cycle.create" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN =
	"human-resources.compensation-review-cycle.open" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE =
	"human-resources.compensation-review-cycle.close" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL =
	"human-resources.compensation-review-cycle.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE =
	"human-resources.compensation-proposal.create" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND =
	"human-resources.compensation-proposal.amend" as const;
export const HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE =
	"human-resources.compensation-proposal.approve" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE =
	"human-resources.benefit-plan.create" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE =
	"human-resources.benefit-plan.update" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE =
	"human-resources.benefit-plan.archive" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL =
	"human-resources.benefit-enrollment.enrol" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END =
	"human-resources.benefit-enrollment.end" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL =
	"human-resources.benefit-enrollment.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET =
	"human-resources.benefit-plan.eligibility.set" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE =
	"human-resources.benefit-enrollment.waive" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD =
	"human-resources.benefit-enrollment-dependent.add" as const;
export const HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END =
	"human-resources.benefit-enrollment-dependent.end" as const;

export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN =
	"human-resources.employee-case.open" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_UPDATE_CLASSIFICATION =
	"human-resources.employee-case.update-classification" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER =
	"human-resources.employee-case.assign-owner" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_PARTICIPANT =
	"human-resources.employee-case.add-participant" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT =
	"human-resources.employee-case.record-event" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE =
	"human-resources.employee-case.add-evidence-reference" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE =
	"human-resources.employee-case.redact-evidence-reference" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ISSUE_INTERIM_MEASURE =
	"human-resources.employee-case.issue-interim-measure" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_FINDING =
	"human-resources.employee-case.record-finding" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION =
	"human-resources.employee-case.recommend-action" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION =
	"human-resources.employee-case.approve-action" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL =
	"human-resources.employee-case.record-appeal" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL =
	"human-resources.employee-case.resolve-appeal" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_CLOSE =
	"human-resources.employee-case.close" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN =
	"human-resources.employee-case.reopen" as const;

export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE =
	"human-resources.leave-policy.create" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE =
	"human-resources.leave-policy.update" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH =
	"human-resources.leave-policy.publish" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE =
	"human-resources.leave-policy.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE =
	"human-resources.leave-policy.archive" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT =
	"human-resources.leave-entitlement.grant" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE =
	"human-resources.leave-entitlement.accrue" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD =
	"human-resources.leave-entitlement.carry-forward" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE =
	"human-resources.leave-entitlement.expire" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST =
	"human-resources.leave-entitlement.adjust" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT =
	"human-resources.leave-request.create-draft" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT =
	"human-resources.leave-request.submit" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE =
	"human-resources.leave-request.approve" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT =
	"human-resources.leave-request.reject" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN =
	"human-resources.leave-request.return" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW =
	"human-resources.leave-request.withdraw" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED =
	"human-resources.leave-request.cancel-approved" as const;
export const HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND =
	"human-resources.leave-request.amend" as const;

export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE =
	"human-resources.headcount-plan.create" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE =
	"human-resources.headcount-plan.update" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD =
	"human-resources.headcount-plan-line.add" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE =
	"human-resources.headcount-plan-line.update" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE =
	"human-resources.headcount-plan-line.remove" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT =
	"human-resources.headcount-plan.submit" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE =
	"human-resources.headcount-plan.approve" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT =
	"human-resources.headcount-plan.reject" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE =
	"human-resources.headcount-plan.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE =
	"human-resources.headcount-plan.close" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE =
	"human-resources.headcount.reserve" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE =
	"human-resources.headcount-reservation.release" as const;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME =
	"human-resources.headcount-reservation.consume" as const;

export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE =
	"human-resources.performance-cycle.create" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE =
	"human-resources.performance-cycle.update" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN =
	"human-resources.performance-cycle.open" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE =
	"human-resources.performance-cycle.close" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL =
	"human-resources.performance-cycle.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH =
	"human-resources.performance-cycle.publish" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS =
	"human-resources.performance-cycle.set-review-periods" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY =
	"human-resources.performance-cycle.set-eligibility" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE =
	"human-resources.performance-cycle.enroll-eligible" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT =
	"human-resources.performance-cycle.add-participant" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT =
	"human-resources.performance-cycle.remove-participant" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE =
	"human-resources.performance-goal.create" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE =
	"human-resources.performance-goal.update" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT =
	"human-resources.performance-goal.submit" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE =
	"human-resources.performance-goal.approve" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT =
	"human-resources.performance-goal.reject" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS =
	"human-resources.performance-goal.record-progress" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE =
	"human-resources.performance-goal.close" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL =
	"human-resources.performance-goal.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE =
	"human-resources.performance-goal.activate" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN =
	"human-resources.performance-goal.align" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_START =
	"human-resources.performance-review.start" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_SELF_ASSESSMENT =
	"human-resources.performance-review.submit-self-assessment" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_MANAGER_ASSESSMENT =
	"human-resources.performance-review.submit-manager-assessment" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_RETURN_FOR_CORRECTION =
	"human-resources.performance-review.return-for-correction" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ACKNOWLEDGE =
	"human-resources.performance-review.acknowledge" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE =
	"human-resources.performance-review.finalize" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN =
	"human-resources.performance-review.reopen" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ADD_DELEGATED_REVIEWER =
	"human-resources.performance-review.add-delegated-reviewer" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_DELEGATED_ASSESSMENT =
	"human-resources.performance-review.submit-delegated-assessment" as const;
export const HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_CALIBRATE =
	"human-resources.performance-review.calibrate" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE =
	"human-resources.improvement-plan.create" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN =
	"human-resources.improvement-plan.open" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE =
	"human-resources.improvement-plan.acknowledge" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT =
	"human-resources.improvement-plan.record-checkpoint" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND =
	"human-resources.improvement-plan.amend" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE =
	"human-resources.improvement-plan.complete" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL =
	"human-resources.improvement-plan.close-unsuccessful" as const;
export const HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL =
	"human-resources.improvement-plan.cancel" as const;

export const HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE =
	"human-resources.competency.create" as const;
export const HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE =
	"human-resources.competency.update" as const;
export const HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE =
	"human-resources.competency.retire" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP =
	"human-resources.job-competency.map" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE =
	"human-resources.job-competency.remove" as const;
export const HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD =
	"human-resources.competency-assessment.record" as const;
export const HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE =
	"human-resources.competency-assessment.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE =
	"human-resources.competency-assessment.expire" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE =
	"human-resources.talent-profile.create" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE =
	"human-resources.talent-profile.update" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD =
	"human-resources.talent-profile-assessment.record" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM =
	"human-resources.talent-profile-assessment.confirm" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE =
	"human-resources.talent-profile.archive" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD =
	"human-resources.talent-profile-mobility.record" as const;
export const HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD =
	"human-resources.critical-role-readiness.record" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE =
	"human-resources.talent-pool.create" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE =
	"human-resources.talent-pool.update" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE =
	"human-resources.talent-pool.close" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE =
	"human-resources.talent-pool-member.nominate" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE =
	"human-resources.talent-pool-member.approve" as const;
export const HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE =
	"human-resources.talent-pool-member.remove" as const;
export const HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE =
	"human-resources.career-plan.create" as const;
export const HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE =
	"human-resources.career-plan.update" as const;
export const HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE =
	"human-resources.career-plan.acknowledge" as const;
export const HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD =
	"human-resources.career-plan-action.add" as const;
export const HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE =
	"human-resources.career-plan-action.complete" as const;
export const HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE =
	"human-resources.career-plan.close" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE =
	"human-resources.succession-plan.create" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE =
	"human-resources.succession-plan.update" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE =
	"human-resources.succession-candidate.nominate" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS =
	"human-resources.succession-candidate.assess-readiness" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE =
	"human-resources.succession-candidate.approve" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE =
	"human-resources.succession-candidate.remove" as const;
export const HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE =
	"human-resources.succession-plan.close" as const;

export const HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE =
	"human-resources.document-requirement.create" as const;
export const HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE =
	"human-resources.document-requirement.update" as const;
export const HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH =
	"human-resources.document-requirement.publish" as const;
export const HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE =
	"human-resources.document-requirement.retire" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER =
	"human-resources.employee-document.register" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA =
	"human-resources.employee-document.update-metadata" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY =
	"human-resources.employee-document.verify" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT =
	"human-resources.employee-document.reject" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION =
	"human-resources.employee-document.revoke-verification" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED =
	"human-resources.employee-document.mark-expired" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD =
	"human-resources.work-eligibility.record" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY =
	"human-resources.work-eligibility.verify" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND =
	"human-resources.work-eligibility.suspend" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW =
	"human-resources.work-eligibility.renew" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE =
	"human-resources.work-eligibility.close" as const;
export const HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE =
	"human-resources.policy-acknowledgement.issue" as const;
export const HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE =
	"human-resources.policy-acknowledgement.acknowledge" as const;
export const HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE =
	"human-resources.policy-acknowledgement.revoke" as const;
export const HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE =
	"human-resources.policy-acknowledgement.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE =
	"human-resources.work-calendar.create" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SUPERSEDE =
	"human-resources.work-calendar.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE =
	"human-resources.work-calendar.update" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE =
	"human-resources.work-calendar.archive" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD =
	"human-resources.work-calendar.holiday.add" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE =
	"human-resources.work-calendar.holiday.remove" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD =
	"human-resources.work-calendar.date-override.add" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE =
	"human-resources.work-calendar.date-override.remove" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN =
	"human-resources.employment-calendar.assign" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END =
	"human-resources.employment-calendar.end" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_ASSIGN =
	"human-resources.work-calendar.scope.assign" as const;
export const HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_END =
	"human-resources.work-calendar.scope.end" as const;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_CREATE =
	"human-resources.time-policy.create" as const;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_ACTIVATE =
	"human-resources.time-policy.activate" as const;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_SUPERSEDE =
	"human-resources.time-policy.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_TIME_POLICY_ASSIGN =
	"human-resources.time-policy.assign" as const;
export const HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_ASSIGN =
	"human-resources.time-approval-authority.assign" as const;
export const HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_END =
	"human-resources.time-approval-authority.end" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_CREATE =
	"human-resources.shift.create" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE =
	"human-resources.shift.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE =
	"human-resources.shift.update" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE =
	"human-resources.shift.activate" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE =
	"human-resources.shift.deactivate" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD =
	"human-resources.shift.break.add" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE =
	"human-resources.shift.break.remove" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN =
	"human-resources.shift-assignment.assign" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH =
	"human-resources.shift-assignment.publish" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL =
	"human-resources.shift-assignment.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE =
	"human-resources.shift-assignment.change" as const;
export const HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE =
	"human-resources.shift-assignment.complete" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD =
	"human-resources.attendance-event.record" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT =
	"human-resources.attendance-events.import" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT =
	"human-resources.attendance-event.correct" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID =
	"human-resources.attendance-event.void" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE =
	"human-resources.attendance-session.resolve" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_WAIVER_APPROVE =
	"human-resources.attendance-break-waiver.approve" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE =
	"human-resources.attendance-exception.create" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW =
	"human-resources.attendance-exception.review" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE =
	"human-resources.attendance-exception.excuse" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT =
	"human-resources.attendance-exception.reject" as const;
export const HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE =
	"human-resources.attendance-exception.resolve" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE =
	"human-resources.timesheet.create" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES =
	"human-resources.timesheet.generate-entries" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD =
	"human-resources.timesheet.entry.add" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE =
	"human-resources.timesheet.entry.update" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE =
	"human-resources.timesheet.entry.remove" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT =
	"human-resources.timesheet.submit" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN =
	"human-resources.timesheet.return" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE =
	"human-resources.timesheet.approve" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT =
	"human-resources.timesheet.reject" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN =
	"human-resources.timesheet.reopen" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK =
	"human-resources.timesheet.lock" as const;
export const HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE =
	"human-resources.timesheet.supersede" as const;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE =
	"human-resources.overtime-request.create" as const;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE =
	"human-resources.overtime-request.approve" as const;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT =
	"human-resources.overtime-request.reject" as const;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL =
	"human-resources.overtime-request.cancel" as const;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL =
	"human-resources.overtime-request.record-actual" as const;
export const HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY =
	"human-resources.overtime-request.verify" as const;
export const HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE =
	"human-resources.privacy.legal-hold.place" as const;
export const HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE =
	"human-resources.privacy.legal-hold.release" as const;
export const HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE =
	"human-resources.privacy.subject.anonymize" as const;

export const HUMAN_RESOURCES_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
	HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
	HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_JOB_CREATE,
	HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
	HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
	HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
	HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
	HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT,
	HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
	HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL,
	HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_ANONYMIZE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
	HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
	HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
	HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
	HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
	HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
	HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
	HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
	HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_OFFER_APPROVE,
	HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
	HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
	HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
	HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
	HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
	HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
	HUMAN_RESOURCES_COMMAND_SESSION_START,
	HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
	HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
	HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
	HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_UPDATE_CLASSIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ISSUE_INTERIM_MEASURE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_FINDING,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_CLOSE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_START,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_SELF_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_MANAGER_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_RETURN_FOR_CORRECTION,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ADD_DELEGATED_REVIEWER,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_DELEGATED_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_CALIBRATE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE,
	HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP,
	HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_ASSIGN,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_END,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_ASSIGN,
	HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_ASSIGN,
	HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_END,
	HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_WAIVER_APPROVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
] as const;

export type HumanResourcesCommandId =
	(typeof HUMAN_RESOURCES_COMMAND_IDS)[number];

/** Time-domain mutation command ids (calendar through overtime). */
export const HUMAN_RESOURCES_TIME_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_ASSIGN,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_SCOPE_END,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_TIME_POLICY_ASSIGN,
	HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_ASSIGN,
	HUMAN_RESOURCES_COMMAND_TIME_APPROVAL_AUTHORITY_END,
	HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_WAIVER_APPROVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesTimeCommandId =
	(typeof HUMAN_RESOURCES_TIME_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_LEAVE_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_UPDATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_PUBLISH,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_GRANT,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ACCRUE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_CARRY_FORWARD,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesLeaveCommandId =
	(typeof HUMAN_RESOURCES_LEAVE_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
	HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
	HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesWorkforceFoundationCommandId =
	(typeof HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_JOB_CREATE,
	HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
	HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
	HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
	HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesCoreOrganizationCommandId =
	(typeof HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
	HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT,
	HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
	HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL,
	HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_ANONYMIZE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
	HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
	HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
	HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
	HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
	HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
	HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
	HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
	HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_OFFER_APPROVE,
] as const satisfies readonly HumanResourcesCommandId[];

export const HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesHireOrchestrationCommandId =
	(typeof HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS)[number];

export type HumanResourcesRecruitmentCommandId =
	(typeof HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
	HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
	HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
	HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesLifecycleCommandId =
	(typeof HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_UPDATE_CLASSIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ISSUE_INTERIM_MEASURE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_FINDING,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_CLOSE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesEmployeeRelationsCommandId =
	(typeof HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesComplianceCommandId =
	(typeof HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_TALENT_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE,
	HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP,
	HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesTalentCommandId =
	(typeof HUMAN_RESOURCES_TALENT_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesWorkforcePlanningCommandId =
	(typeof HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesCompensationBenefitsCommandId =
	(typeof HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_START,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_SELF_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_MANAGER_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_RETURN_FOR_CORRECTION,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ADD_DELEGATED_REVIEWER,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_DELEGATED_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_CALIBRATE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesPerformanceCommandId =
	(typeof HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_LEARNING_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
	HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
	HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
	HUMAN_RESOURCES_COMMAND_SESSION_START,
	HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
	HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
	HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
	HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
] as const satisfies readonly HumanResourcesCommandId[];

export type HumanResourcesLearningCommandId =
	(typeof HUMAN_RESOURCES_LEARNING_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE =
	"human-resources.employee.org-context.resolve" as const;
export const HUMAN_RESOURCES_QUERY_PERSON_GET =
	"human-resources.person.get" as const;
export const HUMAN_RESOURCES_QUERY_PERSON_AS_OF =
	"human-resources.person.get-as-of" as const;
export const HUMAN_RESOURCES_QUERY_PERSON_CONTACTS_LIST =
	"human-resources.person.contacts.list" as const;
export const HUMAN_RESOURCES_QUERY_PERSON_IDENTIFIERS_LIST =
	"human-resources.person.identifiers.list" as const;
export const HUMAN_RESOURCES_QUERY_PERSON_DUPLICATES_DETECT =
	"human-resources.person.duplicates.detect" as const;
export const HUMAN_RESOURCES_QUERY_WORKER_GET =
	"human-resources.worker.get" as const;
export const HUMAN_RESOURCES_QUERY_WORKER_AS_OF =
	"human-resources.worker.get-as-of" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_GET =
	"human-resources.employee.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST =
	"human-resources.employee.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET =
	"human-resources.employee.profile.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET =
	"human-resources.employment.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_AS_OF =
	"human-resources.employment.as-of" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_STATUS_HISTORY_LIST =
	"human-resources.employment.status-history.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET =
	"human-resources.employment-contract.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_AS_OF =
	"human-resources.employment-contract.as-of" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_CURRENT =
	"human-resources.employment-contract.current" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_LIST =
	"human-resources.employment-contract.list" as const;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_AS_OF =
	"human-resources.department.as-of" as const;
export const HUMAN_RESOURCES_QUERY_JOB_AS_OF =
	"human-resources.job.as-of" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_AS_OF =
	"human-resources.position.as-of" as const;
export const HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE_AS_OF =
	"human-resources.organization.tree-as-of" as const;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_GET =
	"human-resources.department.get" as const;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST =
	"human-resources.department.list" as const;
export const HUMAN_RESOURCES_QUERY_JOB_GET = "human-resources.job.get" as const;
export const HUMAN_RESOURCES_QUERY_JOB_LIST =
	"human-resources.job.list" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_GET =
	"human-resources.position.get" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_LIST =
	"human-resources.position.list" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_OCCUPANCY_AS_OF =
	"human-resources.position.occupancy-as-of" as const;
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET =
	"human-resources.assignment.get" as const;
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF =
	"human-resources.assignment.as-of" as const;
export const HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER =
	"human-resources.reporting-line.resolve-primary-manager" as const;
export const HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS =
	"human-resources.reporting-line.list-direct-reports" as const;
export const HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE =
	"human-resources.organization.tree" as const;
export const HUMAN_RESOURCES_QUERY_REQUISITION_GET =
	"human-resources.requisition.get" as const;
export const HUMAN_RESOURCES_QUERY_REQUISITION_LIST =
	"human-resources.requisition.list" as const;
export const HUMAN_RESOURCES_QUERY_CANDIDATE_GET =
	"human-resources.candidate.get" as const;
export const HUMAN_RESOURCES_QUERY_CANDIDATE_LIST =
	"human-resources.candidate.list" as const;
export const HUMAN_RESOURCES_QUERY_CANDIDATE_DUPLICATES_DETECT =
	"human-resources.candidate.duplicates.detect" as const;
export const HUMAN_RESOURCES_QUERY_APPLICATION_GET =
	"human-resources.application.get" as const;
export const HUMAN_RESOURCES_QUERY_APPLICATION_LIST =
	"human-resources.application.list" as const;
export const HUMAN_RESOURCES_QUERY_APPLICATION_STATUS_HISTORY_LIST =
	"human-resources.application.status-history.list" as const;
export const HUMAN_RESOURCES_QUERY_INTERVIEW_GET =
	"human-resources.interview.get" as const;
export const HUMAN_RESOURCES_QUERY_INTERVIEW_LIST =
	"human-resources.interview.list" as const;
export const HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET =
	"human-resources.interview-evaluation.get" as const;
export const HUMAN_RESOURCES_QUERY_OFFER_GET =
	"human-resources.offer.get" as const;
export const HUMAN_RESOURCES_QUERY_OFFER_LIST =
	"human-resources.offer.list" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_GET =
	"human-resources.compensation-proposal.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_LIST =
	"human-resources.compensation-proposal.list" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_GET =
	"human-resources.compensation-grade.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_LIST =
	"human-resources.compensation-grade.list" as const;
export const HUMAN_RESOURCES_QUERY_SALARY_BAND_GET =
	"human-resources.salary-band.get" as const;
export const HUMAN_RESOURCES_QUERY_SALARY_BAND_LIST_BY_GRADE =
	"human-resources.salary-band.list-by-grade" as const;
export const HUMAN_RESOURCES_QUERY_SALARY_BAND_FIND_AS_OF =
	"human-resources.salary-band.find-as-of" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET =
	"human-resources.compensation-grade-progression-rule.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_LIST_FROM_GRADE =
	"human-resources.compensation-grade-progression-rule.list-from-grade" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_TARGETS_LIST =
	"human-resources.compensation-grade-progression-targets.list" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_GET =
	"human-resources.compensation-review-cycle.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_LIST =
	"human-resources.compensation-review-cycle.list" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_GET =
	"human-resources.compensation-review.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_LIST_BY_EMPLOYEE =
	"human-resources.compensation-review.list-by-employee" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_GET =
	"human-resources.employee-compensation.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_LIST =
	"human-resources.employee-compensation.list" as const;
export const HUMAN_RESOURCES_QUERY_BENEFIT_PLAN_ELIGIBILITY_GET =
	"human-resources.benefit-plan.eligibility.get" as const;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_CASE_GET =
	"human-resources.onboarding-case.get" as const;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_TASKS_LIST =
	"human-resources.onboarding-tasks.list" as const;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_ORIENTATION_GET_BY_CASE =
	"human-resources.onboarding-orientation.get-by-case" as const;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_EQUIPMENT_HANDOFF_GET_BY_CASE =
	"human-resources.onboarding-equipment-handoff.get-by-case" as const;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_ACCESS_HANDOFF_GET_BY_CASE =
	"human-resources.onboarding-access-handoff.get-by-case" as const;
export const HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET =
	"human-resources.probation-review.get" as const;
export const HUMAN_RESOURCES_QUERY_PROBATION_REVIEWS_LIST_BY_EMPLOYMENT =
	"human-resources.probation-reviews.list-by-employment" as const;
export const HUMAN_RESOURCES_QUERY_PROBATION_ASSESSMENTS_LIST =
	"human-resources.probation-assessments.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET =
	"human-resources.employment-confirmation.get" as const;
export const HUMAN_RESOURCES_QUERY_TERMINATION_GET =
	"human-resources.termination.get" as const;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_CASE_GET =
	"human-resources.offboarding-case.get" as const;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_TASKS_LIST =
	"human-resources.offboarding-tasks.list" as const;
export const HUMAN_RESOURCES_QUERY_CLEARANCE_GET_BY_OFFBOARDING_CASE =
	"human-resources.clearance.get-by-offboarding-case" as const;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_ACCESS_REVOCATION_GET_BY_CASE =
	"human-resources.offboarding-access-revocation.get-by-case" as const;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_PAYROLL_HANDOFF_GET_BY_CASE =
	"human-resources.offboarding-payroll-handoff.get-by-case" as const;
export const HUMAN_RESOURCES_QUERY_COURSE_GET =
	"human-resources.course.get" as const;
export const HUMAN_RESOURCES_QUERY_COURSE_LIST =
	"human-resources.course.list" as const;
export const HUMAN_RESOURCES_QUERY_SESSION_GET =
	"human-resources.session.get" as const;
export const HUMAN_RESOURCES_QUERY_SESSION_LIST =
	"human-resources.session.list" as const;
export const HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_GET =
	"human-resources.learning-assignment.get" as const;
export const HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_LIST =
	"human-resources.learning-assignment.list" as const;
export const HUMAN_RESOURCES_QUERY_COMPLETION_GET_BY_ASSIGNMENT =
	"human-resources.completion.get-by-assignment" as const;
export const HUMAN_RESOURCES_QUERY_COMPLETION_LIST =
	"human-resources.completion.list" as const;
export const HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_GET =
	"human-resources.learning-attendance.get" as const;
export const HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_LIST =
	"human-resources.learning-attendance.list" as const;
export const HUMAN_RESOURCES_QUERY_CERTIFICATION_GET =
	"human-resources.certification.get" as const;
export const HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST =
	"human-resources.certification.list" as const;
export const HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST_EXPIRING =
	"human-resources.certification.list-expiring" as const;
export const HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET =
	"human-resources.approved-compensation-handoff.get" as const;
export const HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET =
	"human-resources.approved-payroll-handoff.get" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET =
	"human-resources.leave-policy.get" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST =
	"human-resources.leave-policy.list" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET =
	"human-resources.leave-entitlement.get" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST =
	"human-resources.leave-entitlement.list" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET =
	"human-resources.leave-balance.get" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_RECONCILE =
	"human-resources.leave-balance.reconcile" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET =
	"human-resources.leave-request.get" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST =
	"human-resources.leave-request.list" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL =
	"human-resources.leave-request.list-pending-approval" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR =
	"human-resources.leave-request.team-calendar" as const;
export const HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET =
	"human-resources.approved-leave-handoff.get" as const;
export const HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE =
	"human-resources.leave-policy.resolve-applicable" as const;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET =
	"human-resources.headcount-plan.get" as const;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_LIST =
	"human-resources.headcount-plan.list" as const;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET =
	"human-resources.headcount-plan.approved-get" as const;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_AVAILABILITY_GET =
	"human-resources.headcount.availability.get" as const;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_RESERVATION_LIST =
	"human-resources.headcount-reservation.list" as const;
export const HUMAN_RESOURCES_QUERY_RECRUITMENT_HEADCOUNT_HANDOFF_GET =
	"human-resources.recruitment.headcount-handoff.get" as const;
export const HUMAN_RESOURCES_QUERY_WORKFORCE_PLAN_VARIANCE_GET =
	"human-resources.workforce-plan.variance.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET =
	"human-resources.employee-case.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST =
	"human-resources.employee-case.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_ASSIGNED =
	"human-resources.employee-case.list-assigned" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_OPEN =
	"human-resources.employee-case.list-open" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE =
	"human-resources.employee-relations.history-by-employee" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_TIMELINE =
	"human-resources.employee-case.timeline" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_OUTCOME =
	"human-resources.employee-case.outcome" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET =
	"human-resources.performance-cycle.get" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST =
	"human-resources.performance-cycle.list" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS =
	"human-resources.performance-cycle.list-participants" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_REVIEW_PERIODS =
	"human-resources.performance-cycle.list-review-periods" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET_ELIGIBILITY =
	"human-resources.performance-cycle.get-eligibility" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET =
	"human-resources.performance-goal.get" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE =
	"human-resources.performance-goal.list-by-employee" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_PROGRESS =
	"human-resources.performance-goal.list-progress" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_GET =
	"human-resources.performance-review.get" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_BY_EMPLOYEE =
	"human-resources.performance-review.list-by-employee" as const;
export const HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_PENDING_MANAGER_ACTION =
	"human-resources.performance-review.list-pending-manager-action" as const;
export const HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_GET =
	"human-resources.improvement-plan.get" as const;
export const HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_ACTIVE =
	"human-resources.improvement-plan.list-active" as const;
export const HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_CHECKPOINTS =
	"human-resources.improvement-plan.list-checkpoints" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET =
	"human-resources.employee-performance-history.get" as const;

export const HUMAN_RESOURCES_QUERY_COMPETENCY_GET =
	"human-resources.competency.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPETENCY_LIST =
	"human-resources.competency.list" as const;
export const HUMAN_RESOURCES_QUERY_JOB_COMPETENCY_LIST =
	"human-resources.job-competency.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET =
	"human-resources.employee-competency-profile.get" as const;
export const HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE =
	"human-resources.talent-profile.get-by-employee" as const;
export const HUMAN_RESOURCES_QUERY_TALENT_PROFILE_ASSESSMENT_LIST =
	"human-resources.talent-profile-assessment.list" as const;
export const HUMAN_RESOURCES_QUERY_TALENT_PROFILE_MOBILITY_LIST =
	"human-resources.talent-profile-mobility.list" as const;
export const HUMAN_RESOURCES_QUERY_CRITICAL_ROLE_READINESS_LIST =
	"human-resources.critical-role-readiness.list" as const;
export const HUMAN_RESOURCES_QUERY_TALENT_POOL_MEMBER_LIST =
	"human-resources.talent-pool-member.list" as const;
export const HUMAN_RESOURCES_QUERY_CAREER_PLAN_GET =
	"human-resources.career-plan.get" as const;
export const HUMAN_RESOURCES_QUERY_CAREER_PLAN_LIST_BY_EMPLOYEE =
	"human-resources.career-plan.list-by-employee" as const;
export const HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_GET =
	"human-resources.succession-plan.get" as const;
export const HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_LIST =
	"human-resources.succession-plan.list" as const;
export const HUMAN_RESOURCES_QUERY_SUCCESSION_CANDIDATE_LIST =
	"human-resources.succession-candidate.list" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_SUCCESSION_COVERAGE_GET =
	"human-resources.position-succession-coverage.get" as const;

export const HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET =
	"human-resources.employee-document.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST =
	"human-resources.employee-document.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_MISSING_REQUIRED =
	"human-resources.employee-document.list-missing-required" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_EXPIRING =
	"human-resources.employee-document.list-expiring" as const;
export const HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_GET =
	"human-resources.work-eligibility.get" as const;
export const HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_LIST_RISK =
	"human-resources.work-eligibility.list-risk" as const;
export const HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_STATUS_GET =
	"human-resources.policy-acknowledgement.status.get" as const;
export const HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_LIST_OUTSTANDING =
	"human-resources.policy-acknowledgement.list-outstanding" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET =
	"human-resources.employee-compliance-summary.get" as const;
export const HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT =
	"human-resources.compliance.expiry-operations.detect" as const;
export const HUMAN_RESOURCES_QUERY_WORK_CALENDAR_GET =
	"human-resources.work-calendar.get" as const;
export const HUMAN_RESOURCES_QUERY_WORK_CALENDAR_LIST =
	"human-resources.work-calendar.list" as const;
export const HUMAN_RESOURCES_QUERY_WORK_CALENDAR_HOLIDAY_LIST =
	"human-resources.work-calendar.holiday.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CALENDAR_RESOLVE =
	"human-resources.employment-calendar.resolve" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_WORK_CALENDAR_RESOLVE =
	"human-resources.employee-work-calendar.resolve" as const;
export const HUMAN_RESOURCES_QUERY_TIME_POLICY_GET =
	"human-resources.time-policy.get" as const;
export const HUMAN_RESOURCES_QUERY_TIME_POLICY_RESOLVE =
	"human-resources.time-policy.resolve" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_GET =
	"human-resources.shift.get" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_LIST =
	"human-resources.shift.list" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_BREAK_LIST =
	"human-resources.shift.break.list" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_GET =
	"human-resources.shift-assignment.get" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LIST =
	"human-resources.shift-assignment.list" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SCHEDULED_FOR_DATE =
	"human-resources.shift-assignment.scheduled-for-date" as const;
export const HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LOCATION_SCHEDULE_LIST =
	"human-resources.shift-assignment.location-schedule.list" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_GET =
	"human-resources.attendance-event.get" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_LIST =
	"human-resources.attendance-event.list" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_ADJUSTMENT_LIST =
	"human-resources.attendance-adjustment.list" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_GET =
	"human-resources.attendance-session.get" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_LIST =
	"human-resources.attendance-session.list" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_BREAK_WAIVER_DECISION_LIST =
	"human-resources.attendance-break-waiver-decision.list" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET =
	"human-resources.attendance-exception.get" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST =
	"human-resources.attendance-exception.list" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED =
	"human-resources.attendance-exception.list-unresolved" as const;
export const HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET =
	"human-resources.attendance.daily-summary.get" as const;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_GET =
	"human-resources.timesheet.get" as const;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_FOR_EMPLOYEE_PERIOD_GET =
	"human-resources.timesheet.for-employee-period.get" as const;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_LIST =
	"human-resources.timesheet.list" as const;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_ENTRY_LIST =
	"human-resources.timesheet.entry.list" as const;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_TOTALS_GET =
	"human-resources.timesheet.totals.get" as const;
export const HUMAN_RESOURCES_QUERY_TIMESHEET_APPROVAL_DECISION_LIST =
	"human-resources.timesheet-approval-decision.list" as const;
export const HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET =
	"human-resources.approved-time-handoff.get" as const;
export const HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_GET =
	"human-resources.overtime-request.get" as const;
export const HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST =
	"human-resources.overtime-request.list" as const;
export const HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST_PENDING_APPROVAL =
	"human-resources.overtime-request.list-pending-approval" as const;
export const HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT =
	"human-resources.privacy.subject-export" as const;
export const HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET =
	"human-resources.privacy.case.get" as const;
export const HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE =
	"human-resources.privacy.anonymization.evaluate" as const;
export const HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE =
	"human-resources.privacy.retention.evaluate" as const;

export const HUMAN_RESOURCES_QUERY_IDS = [
	HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE,
	HUMAN_RESOURCES_QUERY_PERSON_GET,
	HUMAN_RESOURCES_QUERY_PERSON_AS_OF,
	HUMAN_RESOURCES_QUERY_PERSON_CONTACTS_LIST,
	HUMAN_RESOURCES_QUERY_PERSON_IDENTIFIERS_LIST,
	HUMAN_RESOURCES_QUERY_PERSON_DUPLICATES_DETECT,
	HUMAN_RESOURCES_QUERY_WORKER_GET,
	HUMAN_RESOURCES_QUERY_WORKER_AS_OF,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_AS_OF,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_STATUS_HISTORY_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_AS_OF,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_CURRENT,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_LIST,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_AS_OF,
	HUMAN_RESOURCES_QUERY_JOB_GET,
	HUMAN_RESOURCES_QUERY_JOB_LIST,
	HUMAN_RESOURCES_QUERY_JOB_AS_OF,
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
	HUMAN_RESOURCES_QUERY_POSITION_AS_OF,
	HUMAN_RESOURCES_QUERY_POSITION_OCCUPANCY_AS_OF,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE_AS_OF,
	HUMAN_RESOURCES_QUERY_REQUISITION_GET,
	HUMAN_RESOURCES_QUERY_REQUISITION_LIST,
	HUMAN_RESOURCES_QUERY_CANDIDATE_GET,
	HUMAN_RESOURCES_QUERY_CANDIDATE_LIST,
	HUMAN_RESOURCES_QUERY_CANDIDATE_DUPLICATES_DETECT,
	HUMAN_RESOURCES_QUERY_APPLICATION_GET,
	HUMAN_RESOURCES_QUERY_APPLICATION_LIST,
	HUMAN_RESOURCES_QUERY_APPLICATION_STATUS_HISTORY_LIST,
	HUMAN_RESOURCES_QUERY_INTERVIEW_GET,
	HUMAN_RESOURCES_QUERY_INTERVIEW_LIST,
	HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
	HUMAN_RESOURCES_QUERY_OFFER_GET,
	HUMAN_RESOURCES_QUERY_OFFER_LIST,
	HUMAN_RESOURCES_QUERY_ONBOARDING_CASE_GET,
	HUMAN_RESOURCES_QUERY_ONBOARDING_TASKS_LIST,
	HUMAN_RESOURCES_QUERY_ONBOARDING_ORIENTATION_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_ONBOARDING_EQUIPMENT_HANDOFF_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_ONBOARDING_ACCESS_HANDOFF_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET,
	HUMAN_RESOURCES_QUERY_PROBATION_REVIEWS_LIST_BY_EMPLOYMENT,
	HUMAN_RESOURCES_QUERY_PROBATION_ASSESSMENTS_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET,
	HUMAN_RESOURCES_QUERY_TERMINATION_GET,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_CASE_GET,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_TASKS_LIST,
	HUMAN_RESOURCES_QUERY_CLEARANCE_GET_BY_OFFBOARDING_CASE,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_ACCESS_REVOCATION_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_PAYROLL_HANDOFF_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_COURSE_GET,
	HUMAN_RESOURCES_QUERY_COURSE_LIST,
	HUMAN_RESOURCES_QUERY_SESSION_GET,
	HUMAN_RESOURCES_QUERY_SESSION_LIST,
	HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_LIST,
	HUMAN_RESOURCES_QUERY_COMPLETION_GET_BY_ASSIGNMENT,
	HUMAN_RESOURCES_QUERY_COMPLETION_LIST,
	HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_GET,
	HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_LIST,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_GET,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST_EXPIRING,
	HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_LIST,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_LIST,
	HUMAN_RESOURCES_QUERY_SALARY_BAND_GET,
	HUMAN_RESOURCES_QUERY_SALARY_BAND_LIST_BY_GRADE,
	HUMAN_RESOURCES_QUERY_SALARY_BAND_FIND_AS_OF,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_LIST_FROM_GRADE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_TARGETS_LIST,
	HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_LIST,
	HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_LIST_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_LIST,
	HUMAN_RESOURCES_QUERY_BENEFIT_PLAN_ELIGIBILITY_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_ENTITLEMENT_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_BALANCE_RECONCILE,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR,
	HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_POLICY_RESOLVE_APPLICABLE,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_LIST,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_AVAILABILITY_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_RESERVATION_LIST,
	HUMAN_RESOURCES_QUERY_RECRUITMENT_HEADCOUNT_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_WORKFORCE_PLAN_VARIANCE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_ASSIGNED,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_OPEN,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_TIMELINE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_OUTCOME,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_REVIEW_PERIODS,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET_ELIGIBILITY,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_PROGRESS,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_PENDING_MANAGER_ACTION,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_GET,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_ACTIVE,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_CHECKPOINTS,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET,
	HUMAN_RESOURCES_QUERY_COMPETENCY_GET,
	HUMAN_RESOURCES_QUERY_COMPETENCY_LIST,
	HUMAN_RESOURCES_QUERY_JOB_COMPETENCY_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_ASSESSMENT_LIST,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_MOBILITY_LIST,
	HUMAN_RESOURCES_QUERY_CRITICAL_ROLE_READINESS_LIST,
	HUMAN_RESOURCES_QUERY_TALENT_POOL_MEMBER_LIST,
	HUMAN_RESOURCES_QUERY_CAREER_PLAN_GET,
	HUMAN_RESOURCES_QUERY_CAREER_PLAN_LIST_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_GET,
	HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_LIST,
	HUMAN_RESOURCES_QUERY_SUCCESSION_CANDIDATE_LIST,
	HUMAN_RESOURCES_QUERY_POSITION_SUCCESSION_COVERAGE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_MISSING_REQUIRED,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_EXPIRING,
	HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_GET,
	HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_LIST_RISK,
	HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_STATUS_GET,
	HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_LIST_OUTSTANDING,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET,
	HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT,
	HUMAN_RESOURCES_QUERY_WORK_CALENDAR_GET,
	HUMAN_RESOURCES_QUERY_WORK_CALENDAR_LIST,
	HUMAN_RESOURCES_QUERY_WORK_CALENDAR_HOLIDAY_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CALENDAR_RESOLVE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_WORK_CALENDAR_RESOLVE,
	HUMAN_RESOURCES_QUERY_TIME_POLICY_GET,
	HUMAN_RESOURCES_QUERY_TIME_POLICY_RESOLVE,
	HUMAN_RESOURCES_QUERY_SHIFT_GET,
	HUMAN_RESOURCES_QUERY_SHIFT_LIST,
	HUMAN_RESOURCES_QUERY_SHIFT_BREAK_LIST,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LIST,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SCHEDULED_FOR_DATE,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LOCATION_SCHEDULE_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_ADJUSTMENT_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_BREAK_WAIVER_DECISION_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET,
	HUMAN_RESOURCES_QUERY_TIMESHEET_GET,
	HUMAN_RESOURCES_QUERY_TIMESHEET_FOR_EMPLOYEE_PERIOD_GET,
	HUMAN_RESOURCES_QUERY_TIMESHEET_LIST,
	HUMAN_RESOURCES_QUERY_TIMESHEET_ENTRY_LIST,
	HUMAN_RESOURCES_QUERY_TIMESHEET_TOTALS_GET,
	HUMAN_RESOURCES_QUERY_TIMESHEET_APPROVAL_DECISION_LIST,
	HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_GET,
	HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST,
	HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST_PENDING_APPROVAL,
	HUMAN_RESOURCES_QUERY_PRIVACY_SUBJECT_EXPORT,
	HUMAN_RESOURCES_QUERY_PRIVACY_CASE_GET,
	HUMAN_RESOURCES_QUERY_PRIVACY_ANONYMIZATION_EVALUATE,
	HUMAN_RESOURCES_QUERY_PRIVACY_RETENTION_EVALUATE,
] as const;

export type HumanResourcesQueryId = (typeof HUMAN_RESOURCES_QUERY_IDS)[number];
