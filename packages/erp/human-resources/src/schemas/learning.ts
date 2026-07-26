import { z } from "zod";
import {
	humanResourcesCertificationIdSchema,
	humanResourcesCompletionIdSchema,
	humanResourcesCourseIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesLearningAssignmentIdSchema,
	humanResourcesLearningAttendanceIdSchema,
	humanResourcesSessionIdSchema,
} from "../brands";
import {
	assignmentStatusSchema,
	certificationStatusSchema,
	completionOutcomeSchema,
	courseStatusSchema,
	learningAttendanceStatusSchema,
	sessionStatusSchema,
} from "../shared/learning-status";
import {
	humanResourcesActorUserIdSchema,
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
	isoDateTimeSchema,
} from "./common";

// Learning Course schemas
export const createCourseInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
		durationHours: z.number().positive().nullable().optional(),
	})
	.strict();

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const updateCourseInputSchema = humanResourcesMutationContextSchema
	.extend({
		courseId: humanResourcesCourseIdSchema,
		title: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		durationHours: z.number().positive().nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

export const courseStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			courseId: humanResourcesCourseIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CourseStatusTransitionInput = z.infer<
	typeof courseStatusTransitionInputSchema
>;

export const getCourseInputSchema = humanResourcesMutationContextSchema
	.extend({
		courseId: humanResourcesCourseIdSchema,
	})
	.strict();

export type GetCourseInput = z.infer<typeof getCourseInputSchema>;

export const listCoursesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: courseStatusSchema.optional(),
	})
	.strict();

export type ListCoursesInput = z.infer<typeof listCoursesInputSchema>;

// Learning Session schemas
export const createSessionInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		courseId: humanResourcesCourseIdSchema,
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		scheduledStartsAt: isoDateTimeSchema,
		scheduledEndsAt: isoDateTimeSchema,
		capacity: z.number().int().positive().nullable().optional(),
		primaryInstructorUserId: humanResourcesActorUserIdSchema
			.nullable()
			.optional(),
	})
	.strict();

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const sessionStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			sessionId: humanResourcesSessionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
			actualStartsAt: isoDateTimeSchema.optional(),
			actualEndsAt: isoDateTimeSchema.optional(),
		})
		.strict();

export type SessionStatusTransitionInput = z.infer<
	typeof sessionStatusTransitionInputSchema
>;

export const getSessionInputSchema = humanResourcesMutationContextSchema
	.extend({
		sessionId: humanResourcesSessionIdSchema,
	})
	.strict();

export type GetSessionInput = z.infer<typeof getSessionInputSchema>;

export const listSessionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: sessionStatusSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
	})
	.strict();

export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;

export const assignSessionInstructorInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			sessionId: humanResourcesSessionIdSchema,
			primaryInstructorUserId: humanResourcesActorUserIdSchema.nullable(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AssignSessionInstructorInput = z.infer<
	typeof assignSessionInstructorInputSchema
>;

// Learning Assignment schemas
export const createLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema.optional(),
			employeeId: humanResourcesEmployeeIdSchema,
			courseId: humanResourcesCourseIdSchema,
			sessionId: humanResourcesSessionIdSchema.nullable().optional(),
			dueOn: isoDateSchema.nullable().optional(),
		})
		.strict();

export type CreateLearningAssignmentInput = z.infer<
	typeof createLearningAssignmentInputSchema
>;

export const enrolLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
			sessionId: humanResourcesSessionIdSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EnrolLearningAssignmentInput = z.infer<
	typeof enrolLearningAssignmentInputSchema
>;

export const waiveLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type WaiveLearningAssignmentInput = z.infer<
	typeof waiveLearningAssignmentInputSchema
>;

export const getLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
		})
		.strict();

export type GetLearningAssignmentInput = z.infer<
	typeof getLearningAssignmentInputSchema
>;

export const listLearningAssignmentsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: assignmentStatusSchema.optional(),
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			courseId: humanResourcesCourseIdSchema.optional(),
		})
		.strict();

export type ListLearningAssignmentsInput = z.infer<
	typeof listLearningAssignmentsInputSchema
>;

// Learning Completion schemas
export const recordCompletionInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema.optional(),
		assignmentId: humanResourcesLearningAssignmentIdSchema,
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
		sessionId: humanResourcesSessionIdSchema.nullable().optional(),
		completedAt: isoDateTimeSchema,
		outcome: completionOutcomeSchema,
		assessorUserId: humanResourcesActorUserIdSchema.nullable().optional(),
		notes: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

export type RecordCompletionInput = z.infer<typeof recordCompletionInputSchema>;

export const getCompletionByAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
		})
		.strict();

export type GetCompletionByAssignmentInput = z.infer<
	typeof getCompletionByAssignmentInputSchema
>;

export const listCompletionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
	})
	.strict();

export type ListCompletionsInput = z.infer<typeof listCompletionsInputSchema>;

// Learning Attendance schemas
export const recordLearningAttendanceInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			sessionId: humanResourcesSessionIdSchema,
			assignmentId: humanResourcesLearningAssignmentIdSchema,
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			status: learningAttendanceStatusSchema,
			recordedAt: isoDateTimeSchema,
		})
		.strict();

export type RecordLearningAttendanceInput = z.infer<
	typeof recordLearningAttendanceInputSchema
>;

export const getLearningAttendanceInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			attendanceId: humanResourcesLearningAttendanceIdSchema,
		})
		.strict();

export type GetLearningAttendanceInput = z.infer<
	typeof getLearningAttendanceInputSchema
>;

export const listLearningAttendanceInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			sessionId: humanResourcesSessionIdSchema.optional(),
			employeeId: humanResourcesEmployeeIdSchema.optional(),
		})
		.strict();

export type ListLearningAttendanceInput = z.infer<
	typeof listLearningAttendanceInputSchema
>;

// Employee Certification schemas
export const issueCertificationInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeId: humanResourcesEmployeeIdSchema,
		courseId: humanResourcesCourseIdSchema,
		completionId: humanResourcesCompletionIdSchema,
		certificationCode: z.string().trim().min(1).max(64),
		issuedOn: isoDateSchema,
		expiresOn: isoDateSchema.nullable().optional(),
	})
	.strict();

export type IssueCertificationInput = z.infer<
	typeof issueCertificationInputSchema
>;

export const renewCertificationInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		certificationId: humanResourcesCertificationIdSchema,
		completionId: humanResourcesCompletionIdSchema,
		certificationCode: z.string().trim().min(1).max(64),
		issuedOn: isoDateSchema,
		expiresOn: isoDateSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type RenewCertificationInput = z.infer<
	typeof renewCertificationInputSchema
>;

export const certificationStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			certificationId: humanResourcesCertificationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CertificationStatusTransitionInput = z.infer<
	typeof certificationStatusTransitionInputSchema
>;

export const getCertificationInputSchema = humanResourcesMutationContextSchema
	.extend({
		certificationId: humanResourcesCertificationIdSchema,
	})
	.strict();

export type GetCertificationInput = z.infer<typeof getCertificationInputSchema>;

export const listCertificationsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: certificationStatusSchema.optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
	})
	.strict();

export type ListCertificationsInput = z.infer<
	typeof listCertificationsInputSchema
>;

export const listExpiringCertificationsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			asOf: isoDateSchema,
			withinDays: z.number().int().positive().max(365).optional(),
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export type ListExpiringCertificationsInput = z.infer<
	typeof listExpiringCertificationsInputSchema
>;
