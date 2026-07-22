import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
	HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
	HUMAN_RESOURCES_QUERY_COURSE_GET,
	HUMAN_RESOURCES_QUERY_COURSE_LIST,
} from "../module-ids";
import {
	courseStatusTransitionInputSchema,
	createCourseInputSchema,
	getCourseInputSchema,
	listCoursesInputSchema,
	updateCourseInputSchema,
} from "../schemas";
import { fingerprintCourseCreate } from "../shared/fingerprint";
import {
	runLearningCommand,
	runLearningQuery,
} from "../shared/learning-command";
import type { CourseListPage, LearningCourse } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COURSE = "course" as const;
export type HumanResourcesCourseAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COURSE;

export async function createCourse(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCourse>> {
	return runLearningCommand(input, options, {
		schema: createCourseInputSchema,
		invalidMessage: "Invalid course create input",
		command: HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
		execute: async (data, { store, ports }) => {
			const durationHours =
				data.durationHours !== undefined && data.durationHours !== null
					? String(data.durationHours)
					: null;
			const requestFingerprint = fingerprintCourseCreate({
				code: data.code,
				title: data.title,
				description: data.description ?? null,
				durationHours,
			});

			const existingByKey = await store.findCourseByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.course);
			}

			return await store.createCourse(
				{
					organizationId: data.organizationId,
					code: data.code,
					title: data.title,
					description: data.description ?? null,
					durationHours,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function updateCourse(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCourse>> {
	return runLearningCommand(input, options, {
		schema: updateCourseInputSchema,
		invalidMessage: "Invalid course update input",
		command: HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
		execute: async (data, { store, ports }) => {
			const durationHours =
				data.durationHours !== undefined && data.durationHours !== null
					? String(data.durationHours)
					: undefined;
			return await store.updateCourse(
				{
					organizationId: data.organizationId,
					courseId: data.courseId,
					title: data.title,
					description: data.description,
					durationHours,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function archiveCourse(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCourse>> {
	return runLearningCommand(input, options, {
		schema: courseStatusTransitionInputSchema,
		invalidMessage: "Invalid course archive input",
		command: HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
		execute: async (data, { store, ports }) => {
			return await store.archiveCourse(
				{
					organizationId: data.organizationId,
					courseId: data.courseId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getCourse(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCourse | null>> {
	return runLearningQuery(input, options, {
		schema: getCourseInputSchema,
		invalidMessage: "Invalid course get input",
		query: HUMAN_RESOURCES_QUERY_COURSE_GET,
		execute: async (data, { store }) => {
			return await store.getCourseById({
				organizationId: data.organizationId,
				courseId: data.courseId,
			});
		},
	});
}

export async function listCourses(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CourseListPage>> {
	return runLearningQuery(input, options, {
		schema: listCoursesInputSchema,
		invalidMessage: "Invalid course list input",
		query: HUMAN_RESOURCES_QUERY_COURSE_LIST,
		execute: async (data, { store }) => {
			return await store.listCourses({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			});
		},
	});
}
