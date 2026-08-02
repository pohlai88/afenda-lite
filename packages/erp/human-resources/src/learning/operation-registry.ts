import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import {
	HUMAN_RESOURCES_PERMISSION_CERTIFICATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_LEARNING_MANAGE,
} from "../permissions";

const LEARNING_OWNER = "learning" as const;
const LEARNING_POLICY = "hr.learning" as const;

const LEARNING_COMMAND = {
	authorizationPolicy: LEARNING_POLICY,
	kind: "command",
	owner: LEARNING_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_LEARNING_MANAGE,
} as const;

const CERTIFICATION_COMMAND = {
	...LEARNING_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_CERTIFICATION_MANAGE,
} as const;

const LEARNING_QUERY = {
	authorizationPolicy: LEARNING_POLICY,
	kind: "query",
	owner: LEARNING_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_LEARNING_MANAGE,
} as const;

const CERTIFICATION_QUERY = {
	...LEARNING_QUERY,
	permission: HUMAN_RESOURCES_PERMISSION_CERTIFICATION_MANAGE,
} as const;

export const HUMAN_RESOURCES_LEARNING_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createCourse: {
			...LEARNING_COMMAND,
			id: "human-resources.course.create",
			publicName: "createCourse",
		},
		updateCourse: {
			...LEARNING_COMMAND,
			id: "human-resources.course.update",
			publicName: "updateCourse",
		},
		activateCourse: {
			...LEARNING_COMMAND,
			id: "human-resources.course.activate",
			publicName: "activateCourse",
		},
		archiveCourse: {
			...LEARNING_COMMAND,
			id: "human-resources.course.archive",
			publicName: "archiveCourse",
		},
		createSession: {
			...LEARNING_COMMAND,
			id: "human-resources.session.create",
			observabilityArea: "time",
			publicName: "createSession",
		},
		startSession: {
			...LEARNING_COMMAND,
			id: "human-resources.session.start",
			observabilityArea: "time",
			publicName: "startSession",
		},
		completeSession: {
			...LEARNING_COMMAND,
			id: "human-resources.session.complete",
			observabilityArea: "time",
			publicName: "completeSession",
		},
		cancelSession: {
			...LEARNING_COMMAND,
			id: "human-resources.session.cancel",
			observabilityArea: "time",
			publicName: "cancelSession",
		},
		assignSessionInstructor: {
			...LEARNING_COMMAND,
			id: "human-resources.session.assign-instructor",
			observabilityArea: "time",
			publicName: "assignSessionInstructor",
		},
		assignLearning: {
			...LEARNING_COMMAND,
			id: "human-resources.learning-assignment.create",
			publicName: "assignLearning",
		},
		enrolAssignment: {
			...LEARNING_COMMAND,
			id: "human-resources.learning-assignment.enrol",
			publicName: "enrolAssignment",
		},
		waiveAssignment: {
			...LEARNING_COMMAND,
			id: "human-resources.learning-assignment.waive",
			publicName: "waiveAssignment",
		},
		recordCompletion: {
			...LEARNING_COMMAND,
			id: "human-resources.completion.record",
			publicName: "recordCompletion",
		},
		recordLearningAttendance: {
			...LEARNING_COMMAND,
			id: "human-resources.learning-attendance.record",
			publicName: "recordLearningAttendance",
		},
		issueCertification: {
			...CERTIFICATION_COMMAND,
			id: "human-resources.certification.issue",
			publicName: "issueCertification",
		},
		revokeCertification: {
			...CERTIFICATION_COMMAND,
			id: "human-resources.certification.revoke",
			publicName: "revokeCertification",
		},
		expireCertification: {
			...CERTIFICATION_COMMAND,
			id: "human-resources.certification.expire",
			publicName: "expireCertification",
		},
		renewCertification: {
			...CERTIFICATION_COMMAND,
			id: "human-resources.certification.renew",
			publicName: "renewCertification",
		},
	});

export const HUMAN_RESOURCES_LEARNING_QUERIES =
	defineHumanResourcesOperationRegistry({
		getCourse: {
			...LEARNING_QUERY,
			id: "human-resources.course.get",
			publicName: "getCourse",
		},
		listCourses: {
			...LEARNING_QUERY,
			id: "human-resources.course.list",
			publicName: "listCourses",
		},
		getSession: {
			...LEARNING_QUERY,
			id: "human-resources.session.get",
			observabilityArea: "time",
			publicName: "getSession",
		},
		listSessions: {
			...LEARNING_QUERY,
			id: "human-resources.session.list",
			observabilityArea: "time",
			publicName: "listSessions",
		},
		getLearningAssignment: {
			...LEARNING_QUERY,
			id: "human-resources.learning-assignment.get",
			publicName: "getLearningAssignment",
		},
		listLearningAssignments: {
			...LEARNING_QUERY,
			id: "human-resources.learning-assignment.list",
			publicName: "listLearningAssignments",
		},
		getCompletion: {
			...LEARNING_QUERY,
			id: "human-resources.completion.get-by-assignment",
			publicName: "getCompletion",
		},
		listCompletions: {
			...LEARNING_QUERY,
			id: "human-resources.completion.list",
			publicName: "listCompletions",
		},
		getLearningAttendance: {
			...LEARNING_QUERY,
			id: "human-resources.learning-attendance.get",
			publicName: "getLearningAttendance",
		},
		listLearningAttendance: {
			...LEARNING_QUERY,
			id: "human-resources.learning-attendance.list",
			publicName: "listLearningAttendance",
		},
		getCertification: {
			...CERTIFICATION_QUERY,
			id: "human-resources.certification.get",
			publicName: "getCertification",
		},
		listCertifications: {
			...CERTIFICATION_QUERY,
			id: "human-resources.certification.list",
			publicName: "listCertifications",
		},
		listExpiringCertifications: {
			...CERTIFICATION_QUERY,
			id: "human-resources.certification.list-expiring",
			publicName: "listExpiringCertifications",
		},
	});

export const HUMAN_RESOURCES_LEARNING_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_LEARNING_COMMANDS);
export const HUMAN_RESOURCES_LEARNING_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_LEARNING_QUERIES);
export const HUMAN_RESOURCES_LEARNING_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_LEARNING_COMMANDS);
export const HUMAN_RESOURCES_LEARNING_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_LEARNING_QUERIES);

export const {
	createCourse: { id: HUMAN_RESOURCES_COMMAND_COURSE_CREATE },
	updateCourse: { id: HUMAN_RESOURCES_COMMAND_COURSE_UPDATE },
	activateCourse: { id: HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE },
	archiveCourse: { id: HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE },
	createSession: { id: HUMAN_RESOURCES_COMMAND_SESSION_CREATE },
	startSession: { id: HUMAN_RESOURCES_COMMAND_SESSION_START },
	completeSession: { id: HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE },
	cancelSession: { id: HUMAN_RESOURCES_COMMAND_SESSION_CANCEL },
	assignSessionInstructor: {
		id: HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
	},
	assignLearning: { id: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE },
	enrolAssignment: { id: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL },
	waiveAssignment: { id: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE },
	recordCompletion: { id: HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD },
	recordLearningAttendance: {
		id: HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
	},
	issueCertification: { id: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE },
	revokeCertification: { id: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE },
	expireCertification: { id: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE },
	renewCertification: { id: HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW },
} = HUMAN_RESOURCES_LEARNING_COMMANDS;

export const {
	getCourse: { id: HUMAN_RESOURCES_QUERY_COURSE_GET },
	listCourses: { id: HUMAN_RESOURCES_QUERY_COURSE_LIST },
	getSession: { id: HUMAN_RESOURCES_QUERY_SESSION_GET },
	listSessions: { id: HUMAN_RESOURCES_QUERY_SESSION_LIST },
	getLearningAssignment: { id: HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_GET },
	listLearningAssignments: {
		id: HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_LIST,
	},
	getCompletion: { id: HUMAN_RESOURCES_QUERY_COMPLETION_GET_BY_ASSIGNMENT },
	listCompletions: { id: HUMAN_RESOURCES_QUERY_COMPLETION_LIST },
	getLearningAttendance: { id: HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_GET },
	listLearningAttendance: {
		id: HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_LIST,
	},
	getCertification: { id: HUMAN_RESOURCES_QUERY_CERTIFICATION_GET },
	listCertifications: { id: HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST },
	listExpiringCertifications: {
		id: HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST_EXPIRING,
	},
} = HUMAN_RESOURCES_LEARNING_QUERIES;
