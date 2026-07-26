import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesPersonId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	HumanResourcesPrivacySubjectRecord,
	HumanResourcesSubjectExportBundle,
	HumanResourcesSubjectExportRecord,
} from "../privacy";
import { HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION } from "../privacy";
import type { HumanResourcesStore } from "../store";

const DEFAULT_PAGE_SIZE = 100;

export type CollectHumanResourcesSubjectDataInput = {
	organizationId: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
	correlationId: string;
	store: HumanResourcesStore;
	generatedAt?: string;
};

function exportRecord(
	input: Omit<HumanResourcesSubjectExportRecord, "data"> & {
		data: Record<string, unknown>;
	},
): HumanResourcesSubjectExportRecord {
	return {
		category: input.category,
		entityType: input.entityType,
		entityId: input.entityId,
		classification: input.classification,
		retentionClass: input.retentionClass,
		data: input.data,
	};
}

function asExportData(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return { value };
	}
	return { ...(value as Record<string, unknown>) };
}

async function collectAllPages<
	TItem,
	TPage extends {
		page: number;
		pageSize: number;
		totalCount: number;
	},
>(
	fetchPage: (page: number) => Promise<Result<TPage>>,
	selectItems: (page: TPage) => readonly TItem[],
): Promise<Result<readonly TItem[]>> {
	const items: TItem[] = [];
	let page = 1;
	for (;;) {
		const pageResult = await fetchPage(page);
		if (!pageResult.ok) {
			return pageResult;
		}
		items.push(...selectItems(pageResult.data));
		const hasMore =
			pageResult.data.page * pageResult.data.pageSize <
			pageResult.data.totalCount;
		if (!hasMore) {
			break;
		}
		page += 1;
	}
	return ok(items);
}

export async function collectHumanResourcesSubjectData(
	input: CollectHumanResourcesSubjectDataInput,
): Promise<
	Result<
		Omit<HumanResourcesSubjectExportBundle, "exportReference" | "recordCount">
	>
> {
	const employee = await input.store.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
	});
	if (!employee.ok) {
		return employee;
	}
	if (employee.data === null) {
		return fail(
			"NOT_FOUND",
			"Privacy subject employee was not found.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const workerIds: string[] = [];
	let subjectPersonId: HumanResourcesPersonId | null = null;
	const worker = await input.store.findWorkerByEmployeeId({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
	});
	if (worker.ok && worker.data !== null) {
		workerIds.push(worker.data.id);
		subjectPersonId = worker.data.personId;
	}

	const records: HumanResourcesSubjectExportRecord[] = [];

	if (subjectPersonId !== null) {
		const person = await input.store.getPersonById({
			organizationId: input.organizationId,
			personId: subjectPersonId,
		});
		if (!person.ok) {
			return person;
		}
		if (person.data !== null) {
			records.push(
				exportRecord({
					category: "identity",
					entityType: "hr_person",
					entityId: person.data.id,
					classification: "personal",
					retentionClass: person.data.privacyClassification,
					data: asExportData(person.data),
				}),
			);
		}

		const identityVersions = await input.store.listPersonIdentityVersions({
			organizationId: input.organizationId,
			personId: subjectPersonId,
		});
		if (!identityVersions.ok) {
			return identityVersions;
		}
		for (const version of identityVersions.data) {
			records.push(
				exportRecord({
					category: "identity",
					entityType: "hr_person_identity_version",
					entityId: version.id,
					classification: "personal",
					retentionClass: "workforce_core",
					data: asExportData(version),
				}),
			);
		}

		const contacts = await input.store.listPersonContacts({
			organizationId: input.organizationId,
			personId: subjectPersonId,
		});
		if (!contacts.ok) {
			return contacts;
		}
		for (const contact of contacts.data) {
			records.push(
				exportRecord({
					category: "identity",
					entityType: "hr_person_contact",
					entityId: contact.id,
					classification: "personal",
					retentionClass: "workforce_core",
					data: asExportData(contact),
				}),
			);
		}

		const identifiers = await input.store.listPersonIdentifiers({
			organizationId: input.organizationId,
			personId: subjectPersonId,
		});
		if (!identifiers.ok) {
			return identifiers;
		}
		for (const identifier of identifiers.data) {
			records.push(
				exportRecord({
					category: "identity",
					entityType: "hr_person_identifier",
					entityId: identifier.id,
					classification: "sensitive",
					retentionClass: "workforce_core",
					data: asExportData(identifier),
				}),
			);
		}
	}

	records.push(
		exportRecord({
			category: "identity",
			entityType: "hr_employee",
			entityId: employee.data.id,
			classification: "personal",
			retentionClass: "workforce_core",
			data: asExportData(employee.data),
		}),
	);

	const employment = await input.store.findOpenEmploymentByEmployee({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
	});
	if (employment.ok && employment.data !== null) {
		records.push(
			exportRecord({
				category: "employment",
				entityType: "hr_employment",
				entityId: employment.data.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(employment.data),
			}),
		);

		const assignment = await input.store.findOpenAssignmentByEmployment({
			organizationId: input.organizationId,
			employmentId: employment.data.id,
		});
		if (assignment.ok && assignment.data !== null) {
			records.push(
				exportRecord({
					category: "assignment",
					entityType: "hr_assignment",
					entityId: assignment.data.id,
					classification: "personal",
					retentionClass: "workforce_core",
					data: asExportData(assignment.data),
				}),
			);
		}
	}

	const reportingLines = await input.store.listReportingLinesForEmployee({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
	});
	if (reportingLines.ok) {
		for (const line of reportingLines.data) {
			records.push(
				exportRecord({
					category: "employment",
					entityType: "hr_reporting_line",
					entityId: line.id,
					classification: "personal",
					retentionClass: "workforce_core",
					data: asExportData(line),
				}),
			);
		}
	}

	const leaveEntitlements = await collectAllPages(
		(page) =>
			input.store.listLeaveEntitlements({
				organizationId: input.organizationId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				employeeId: input.subjectEmployeeId,
			}),
		(page) => page.entitlements,
	);
	if (!leaveEntitlements.ok) {
		return leaveEntitlements;
	}
	for (const entitlement of leaveEntitlements.data) {
		records.push(
			exportRecord({
				category: "leave",
				entityType: "hr_leave_entitlement",
				entityId: entitlement.id,
				classification: "sensitive",
				retentionClass: "medical_and_leave",
				data: asExportData(entitlement),
			}),
		);
	}

	const leaveRequests = await collectAllPages(
		(page) =>
			input.store.listLeaveRequests({
				organizationId: input.organizationId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				employeeId: input.subjectEmployeeId,
			}),
		(page) => page.requests,
	);
	if (!leaveRequests.ok) {
		return leaveRequests;
	}
	for (const request of leaveRequests.data) {
		records.push(
			exportRecord({
				category: "leave",
				entityType: "hr_leave_request",
				entityId: request.id,
				classification: "sensitive",
				retentionClass: "medical_and_leave",
				data: asExportData(request),
			}),
		);
	}

	const timesheets = await input.store.listTimesheets({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
		page: 1,
		pageSize: DEFAULT_PAGE_SIZE,
	});
	if (!timesheets.ok) {
		return timesheets;
	}
	for (const timesheet of timesheets.data) {
		records.push(
			exportRecord({
				category: "time",
				entityType: "hr_timesheet",
				entityId: timesheet.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(timesheet),
			}),
		);
	}

	const overtimeRequests = await input.store.listOvertimeRequests({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
		page: 1,
		pageSize: DEFAULT_PAGE_SIZE,
	});
	if (!overtimeRequests.ok) {
		return overtimeRequests;
	}
	for (const overtime of overtimeRequests.data) {
		records.push(
			exportRecord({
				category: "time",
				entityType: "hr_overtime_request",
				entityId: overtime.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(overtime),
			}),
		);
	}

	const compensations = await collectAllPages(
		(page) =>
			input.store.listEmployeeCompensationsByEmployee({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
			}),
		(page) => page.compensations,
	);
	if (!compensations.ok) {
		return compensations;
	}
	for (const compensation of compensations.data) {
		records.push(
			exportRecord({
				category: "compensation",
				entityType: "hr_employee_compensation",
				entityId: compensation.id,
				classification: "highly_sensitive",
				retentionClass: "pay_and_benefits",
				data: asExportData(compensation),
			}),
		);
	}

	const compensationReviews = await collectAllPages(
		(page) =>
			input.store.listCompensationReviewsByEmployee({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
			}),
		(page) => page.reviews,
	);
	if (!compensationReviews.ok) {
		return compensationReviews;
	}
	for (const review of compensationReviews.data) {
		records.push(
			exportRecord({
				category: "compensation",
				entityType: "hr_compensation_review",
				entityId: review.id,
				classification: "highly_sensitive",
				retentionClass: "pay_and_benefits",
				data: asExportData(review),
			}),
		);
	}

	const benefitEnrollments = await collectAllPages(
		(page) =>
			input.store.listBenefitEnrollmentsByEmployee({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
			}),
		(page) => page.enrollments,
	);
	if (!benefitEnrollments.ok) {
		return benefitEnrollments;
	}
	for (const enrollment of benefitEnrollments.data) {
		records.push(
			exportRecord({
				category: "compensation",
				entityType: "hr_benefit_enrollment",
				entityId: enrollment.id,
				classification: "sensitive",
				retentionClass: "pay_and_benefits",
				data: asExportData(enrollment),
			}),
		);
	}

	const goals = await collectAllPages(
		(page) =>
			input.store.listEmployeeGoals({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
			}),
		(page) => page.goals,
	);
	if (!goals.ok) {
		return goals;
	}
	for (const goal of goals.data) {
		records.push(
			exportRecord({
				category: "performance",
				entityType: "hr_employee_goal",
				entityId: goal.id,
				classification: "sensitive",
				retentionClass: "performance_and_talent",
				data: asExportData(goal),
			}),
		);
	}

	const performanceReviews = await collectAllPages(
		(page) =>
			input.store.listEmployeePerformanceReviews({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				includeConfidential: true,
			}),
		(page) => page.reviews,
	);
	if (!performanceReviews.ok) {
		return performanceReviews;
	}
	for (const review of performanceReviews.data) {
		records.push(
			exportRecord({
				category: "performance",
				entityType: "hr_performance_review",
				entityId: review.id,
				classification: "sensitive",
				retentionClass: "performance_and_talent",
				data: asExportData(review),
			}),
		);
	}

	const learningAssignments = await collectAllPages(
		(page) =>
			input.store.listLearningAssignments({
				organizationId: input.organizationId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				employeeId: input.subjectEmployeeId,
			}),
		(page) => page.assignments,
	);
	if (!learningAssignments.ok) {
		return learningAssignments;
	}
	for (const assignment of learningAssignments.data) {
		records.push(
			exportRecord({
				category: "learning",
				entityType: "hr_learning_assignment",
				entityId: assignment.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(assignment),
			}),
		);
	}

	const completions = await collectAllPages(
		(page) =>
			input.store.listCompletions({
				organizationId: input.organizationId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				employeeId: input.subjectEmployeeId,
			}),
		(page) => page.completions,
	);
	if (!completions.ok) {
		return completions;
	}
	for (const completion of completions.data) {
		records.push(
			exportRecord({
				category: "learning",
				entityType: "hr_learning_completion",
				entityId: completion.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(completion),
			}),
		);
	}

	const learningAttendance = await collectAllPages(
		(page) =>
			input.store.listLearningAttendance({
				organizationId: input.organizationId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				employeeId: input.subjectEmployeeId,
			}),
		(page) => page.attendanceRecords,
	);
	if (!learningAttendance.ok) {
		return learningAttendance;
	}
	for (const attendance of learningAttendance.data) {
		records.push(
			exportRecord({
				category: "learning",
				entityType: "hr_learning_attendance",
				entityId: attendance.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(attendance),
			}),
		);
	}

	const certifications = await collectAllPages(
		(page) =>
			input.store.listCertifications({
				organizationId: input.organizationId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				employeeId: input.subjectEmployeeId,
			}),
		(page) => page.certifications,
	);
	if (!certifications.ok) {
		return certifications;
	}
	for (const certification of certifications.data) {
		records.push(
			exportRecord({
				category: "learning",
				entityType: "hr_employee_certification",
				entityId: certification.id,
				classification: "personal",
				retentionClass: "workforce_core",
				data: asExportData(certification),
			}),
		);
	}

	const talentProfile = await input.store.getTalentProfileByEmployee({
		organizationId: input.organizationId,
		employeeId: input.subjectEmployeeId,
	});
	if (!talentProfile.ok) {
		return talentProfile;
	}
	if (talentProfile.data !== null) {
		records.push(
			exportRecord({
				category: "talent",
				entityType: "hr_talent_profile",
				entityId: talentProfile.data.id,
				classification: "sensitive",
				retentionClass: "performance_and_talent",
				data: asExportData(talentProfile.data),
			}),
		);
	}

	const careerPlans = await collectAllPages(
		(page) =>
			input.store.listEmployeeCareerPlans({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
			}),
		(page) => page.careerPlans,
	);
	if (!careerPlans.ok) {
		return careerPlans;
	}
	for (const plan of careerPlans.data) {
		records.push(
			exportRecord({
				category: "talent",
				entityType: "hr_career_plan",
				entityId: plan.id,
				classification: "sensitive",
				retentionClass: "performance_and_talent",
				data: asExportData(plan),
			}),
		);
	}

	const employeeDocuments = await collectAllPages(
		(page) =>
			input.store.listEmployeeDocuments({
				organizationId: input.organizationId,
				employeeId: input.subjectEmployeeId,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
			}),
		(page) => page.documents,
	);
	if (!employeeDocuments.ok) {
		return employeeDocuments;
	}
	for (const document of employeeDocuments.data) {
		records.push(
			exportRecord({
				category: "compliance",
				entityType: "hr_employee_document",
				entityId: document.id,
				classification: "sensitive",
				retentionClass: "recruitment_and_background",
				data: asExportData(document),
			}),
		);
	}

	const relationsHistory =
		await input.store.getEmployeeRelationsHistoryByEmployee({
			organizationId: input.organizationId,
			employeeId: input.subjectEmployeeId,
		});
	if (!relationsHistory.ok) {
		return relationsHistory;
	}
	for (const employeeCase of relationsHistory.data) {
		records.push(
			exportRecord({
				category: "employee_relations",
				entityType: "hr_employee_case",
				entityId: employeeCase.id,
				classification: "highly_sensitive",
				retentionClass: "employee_relations_and_legal",
				data: asExportData(employeeCase),
			}),
		);
	}

	return ok({
		schemaVersion: HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION,
		organizationId: input.organizationId,
		generatedAt: input.generatedAt ?? new Date().toISOString(),
		correlationId: input.correlationId,
		subject: {
			personId: subjectPersonId ?? input.subjectEmployeeId,
			employeeIds: [input.subjectEmployeeId],
			workerIds,
		},
		records,
	});
}

export async function listHumanResourcesSubjectInventoryRecords(input: {
	organizationId: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
	store: HumanResourcesStore;
}): Promise<Result<readonly HumanResourcesPrivacySubjectRecord[]>> {
	const collected = await collectHumanResourcesSubjectData({
		organizationId: input.organizationId,
		subjectEmployeeId: input.subjectEmployeeId,
		correlationId: "inventory",
		store: input.store,
	});
	if (!collected.ok) {
		return collected;
	}
	return ok(
		collected.data.records.map((record) => ({
			recordId: record.entityId,
			entity: record.entityType,
			organizationId: input.organizationId,
		})),
	);
}
