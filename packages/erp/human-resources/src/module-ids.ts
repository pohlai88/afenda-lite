export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE =
	"human-resources.employee.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE =
	"human-resources.employee.update" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE =
	"human-resources.employment.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND =
	"human-resources.employment.amend" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE =
	"human-resources.employment-contract.create" as const;
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
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE =
	"human-resources.candidate.create" as const;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE =
	"human-resources.candidate.update-profile" as const;
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
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE =
	"human-resources.interview.schedule" as const;
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

export const HUMAN_RESOURCES_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
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
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
	HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
	HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
	HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
	HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
	HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
	HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
	HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
	HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
] as const;

export type HumanResourcesCommandId =
	(typeof HUMAN_RESOURCES_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_QUERY_EMPLOYEE_GET =
	"human-resources.employee.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST =
	"human-resources.employee.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET =
	"human-resources.employment.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET =
	"human-resources.employment-contract.get" as const;
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
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET =
	"human-resources.assignment.get" as const;
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
export const HUMAN_RESOURCES_QUERY_APPLICATION_GET =
	"human-resources.application.get" as const;
export const HUMAN_RESOURCES_QUERY_APPLICATION_LIST =
	"human-resources.application.list" as const;
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

export const HUMAN_RESOURCES_QUERY_IDS = [
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
	HUMAN_RESOURCES_QUERY_JOB_GET,
	HUMAN_RESOURCES_QUERY_JOB_LIST,
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
	HUMAN_RESOURCES_QUERY_REQUISITION_GET,
	HUMAN_RESOURCES_QUERY_REQUISITION_LIST,
	HUMAN_RESOURCES_QUERY_CANDIDATE_GET,
	HUMAN_RESOURCES_QUERY_CANDIDATE_LIST,
	HUMAN_RESOURCES_QUERY_APPLICATION_GET,
	HUMAN_RESOURCES_QUERY_APPLICATION_LIST,
	HUMAN_RESOURCES_QUERY_INTERVIEW_GET,
	HUMAN_RESOURCES_QUERY_INTERVIEW_LIST,
	HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
	HUMAN_RESOURCES_QUERY_OFFER_GET,
	HUMAN_RESOURCES_QUERY_OFFER_LIST,
] as const;

export type HumanResourcesQueryId = (typeof HUMAN_RESOURCES_QUERY_IDS)[number];
