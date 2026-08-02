/**
 * Memory vs Drizzle parity for lifecycle transfer + termination (HR-05).
 */

import {
	database as afendaDatabase,
	and,
	eq,
	hrOffboardingAccessRevocation,
	hrOffboardingPayrollHandoff,
	hrOnboardingAccessHandoff,
	hrOnboardingEquipmentHandoff,
	hrOnboardingOrientation,
	hrTermination,
	inArray,
	platformDomainEvent,
} from "@afenda/db";
import {
	HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
	HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
	HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
} from "@afenda/events/schemas";
import { afterAll, describe, expect, it } from "vitest";
import { confirmEmployment } from "../src/features/employment-lifecycle/confirmation";
import {
	completeOffboarding,
	completeOffboardingTask,
	getClearanceByOffboardingCase,
	getOffboardingAccessRevocationByCase,
	getOffboardingPayrollHandoffByCase,
	listOffboardingTasks,
	recordClearance,
	recordExitInterview,
	recordOffboardingAccessRevocation,
	recordOffboardingPayrollHandoff,
	startOffboarding,
} from "../src/features/employment-lifecycle/offboarding";
import {
	extendProbation,
	openProbation,
	recordProbationAssessment,
	recordProbationOutcome,
} from "../src/features/employment-lifecycle/probation";
import { transferAssignment } from "../src/features/employment-lifecycle/transfer";
import { createPosition } from "../src/features/organization/position";
import { createAssignment } from "../src/features/workforce-records/employment/assignment";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import { createEmployment } from "../src/features/workforce-records/employment/employment";
import { isoDateTimeSchema } from "../src/kernel/validation/common";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import {
	completeOnboardingPath,
	runEmploymentTerminationFlow,
} from "./helpers/lifecycle-test-fixtures";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { resultFailureMessage } from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readEffectiveOn(payload: unknown): string | undefined {
	if (typeof payload !== "object" || payload === null) {
		return;
	}
	if (!("effectiveOn" in payload)) {
		return;
	}
	return typeof payload.effectiveOn === "string"
		? payload.effectiveOn
		: undefined;
}

describe.runIf(runDrizzleParity)("human-resources lifecycle parity", () => {
	const neonOrgs = createNeonOrgTracker();

	afterAll(async () => {
		await neonOrgs.cleanup();
	});

	for (const adapter of ["memory", "drizzle"] as const) {
		it(`${adapter}: transfer then finalizeTermination emit workforce events`, async () => {
			const ready = createHrParityHarness(adapter);
			const suffix = uniqueSuffix(adapter);
			const organizationId = neonOrgs.trackOrg(`org-life-parity-${suffix}`);
			const actorUserId = "user-life-parity";

			const employee = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-emp-${suffix}`,
					idempotencyKey: `idem-emp-${suffix}`,
					employeeNumber: `E-${suffix}`.slice(0, 64),
					legalName: "Parity Worker",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-employment-${suffix}`,
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const orgSeed = await seedDepartmentAndJob(ready, {
				organizationId,
				actorUserId,
			});
			expect(orgSeed).not.toBeNull();
			if (!orgSeed) {
				return;
			}

			const positionA = await createPosition(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-pos-a-${suffix}`,
					code: `PA-${suffix}`.slice(0, 64),
					title: "Role A",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(positionA.ok).toBe(true);
			if (!positionA.ok) {
				return;
			}

			const positionB = await createPosition(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-pos-b-${suffix}`,
					code: `PB-${suffix}`.slice(0, 64),
					title: "Role B",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(positionB.ok).toBe(true);
			if (!positionB.ok) {
				return;
			}

			const assignment = await createAssignment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-asg-${suffix}`,
					employmentId: employment.data.id,
					positionId: positionA.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) {
				return;
			}

			const transfer = await transferAssignment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-xfer-${suffix}`,
					idempotencyKey: `idem-xfer-${suffix}`,
					employmentId: employment.data.id,
					toPositionId: positionB.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-03-01",
					reason: "Parity transfer",
				},
				ready,
			);
			expect(transfer.ok).toBe(true);
			if (!transfer.ok) {
				return;
			}
			expect(transfer.data.movementKind).toBe("transfer");
			expect(isoDateTimeSchema.safeParse(transfer.data.createdAt).success).toBe(
				true,
			);
			expect(isoDateTimeSchema.safeParse(transfer.data.updatedAt).success).toBe(
				true,
			);
			const replay = await transferAssignment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-xfer-replay-${suffix}`,
					idempotencyKey: `idem-xfer-${suffix}`,
					employmentId: employment.data.id,
					toPositionId: positionB.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-03-01",
					reason: "Parity transfer",
				},
				ready,
			);
			expect(replay).toEqual(transfer);
			if (replay.ok) {
				expect(replay.data.createdAt).toBe(transfer.data.createdAt);
				expect(replay.data.updatedAt).toBe(transfer.data.updatedAt);
			}

			const previousAssignment = await ready.store.getAssignmentById({
				organizationId,
				assignmentId: transfer.data.fromAssignmentId,
			});
			const successorAssignment = await ready.store.getAssignmentById({
				organizationId,
				assignmentId: transfer.data.toAssignmentId,
			});
			expect(previousAssignment.ok).toBe(true);
			expect(successorAssignment.ok).toBe(true);
			if (
				previousAssignment.ok &&
				successorAssignment.ok &&
				previousAssignment.data &&
				successorAssignment.data
			) {
				expect(previousAssignment.data.endsOn).toBe("2025-02-28");
				expect(previousAssignment.data.successorAssignmentId).toBe(
					successorAssignment.data.id,
				);
				expect(previousAssignment.data.transferMovementId).toBe(
					transfer.data.id,
				);
				expect(successorAssignment.data.startsOn).toBe("2025-03-01");
				expect(successorAssignment.data.predecessorAssignmentId).toBe(
					previousAssignment.data.id,
				);
				expect(successorAssignment.data.transferMovementId).toBe(
					transfer.data.id,
				);
				expect(
					successorAssignment.data.organizationDimensions?.legal_entity.key,
				).toBe(TEST_ORGANIZATION_DIMENSION_KEYS.legalEntityKey);
			}

			const termFlow = await runEmploymentTerminationFlow(ready, {
				organizationId,
				actorUserId,
				employmentId: employment.data.id,
				correlationId: `corr-term-${suffix}`,
				idempotencyKey: `idem-term-${suffix}`,
				reasonCode: "resignation",
				reasonDetail: "Parity exit",
				effectiveOn: "2025-04-01",
				rehireEligible: true,
			});
			expect(termFlow.ok).toBe(true);
			if (!termFlow.ok) {
				return;
			}

			if (adapter === "memory") {
				const transferEvent = ready.ports.outbox.calls.find(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
				);
				const terminationEvent = ready.ports.outbox.calls.find(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
				);
				expect(transferEvent).toBeDefined();
				expect(terminationEvent).toBeDefined();
				expect(transferEvent?.payload.effectiveOn).toBe("2025-03-01");
				expect(terminationEvent?.payload.effectiveOn).toBe("2025-04-01");
				return;
			}

			const events = await afendaDatabase.client
				.select()
				.from(platformDomainEvent)
				.where(
					and(
						eq(platformDomainEvent.organizationId, organizationId),
						inArray(platformDomainEvent.type, [
							HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
							HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
						]),
					),
				);
			const transferEvent = events.find(
				(row) => row.type === HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
			);
			const terminationEvent = events.find(
				(row) => row.type === HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
			);
			expect(transferEvent).toBeDefined();
			expect(terminationEvent).toBeDefined();
			expect(readEffectiveOn(transferEvent?.payload)).toBe("2025-03-01");
			expect(readEffectiveOn(terminationEvent?.payload)).toBe("2025-04-01");
		});

		it(`${adapter}: termination propose/approve/finalize and offboarding completion facts parity`, async () => {
			const ready = createHrParityHarness(adapter);
			const suffix = uniqueSuffix(adapter);
			const organizationId = neonOrgs.trackOrg(`org-term-off-parity-${suffix}`);
			const actorUserId = "user-term-off-parity";

			const employee = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-emp-term-off-${suffix}`,
					idempotencyKey: `idem-emp-term-off-${suffix}`,
					employeeNumber: `ETO-${suffix}`.slice(0, 64),
					legalName: "Termination Offboarding Parity Worker",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-employment-term-off-${suffix}`,
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const termFlow = await runEmploymentTerminationFlow(ready, {
				organizationId,
				actorUserId,
				employmentId: employment.data.id,
				correlationId: `corr-term-${suffix}`,
				idempotencyKey: `idem-term-propose-${suffix}`,
				reasonCode: "resignation",
				reasonDetail: "Parity termination",
				effectiveOn: "2025-06-01",
				rehireEligible: false,
			});
			expect(termFlow.ok).toBe(true);
			if (!termFlow.ok) {
				return;
			}
			expect(termFlow.proposed.status).toBe("draft");
			expect(termFlow.proposed.rehireEligible).toBe(false);
			expect(termFlow.approved.approvedAt).not.toBeNull();
			expect(termFlow.approved.approvedBy).toBe(actorUserId);
			expect(termFlow.termination.status).toBe("finalized");

			const offboarding = await startOffboarding(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-off-start-${suffix}`,
					idempotencyKey: `idem-off-start-${suffix}`,
					employmentId: employment.data.id,
					terminationId: termFlow.termination.id,
					tasks: [
						{ code: "return_badge", title: "Return badge", mandatory: true },
					],
				},
				ready,
			);
			expect(offboarding.ok).toBe(true);
			if (!offboarding.ok) {
				return;
			}

			const access = await getOffboardingAccessRevocationByCase(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-access-get-${suffix}`,
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(access.ok).toBe(true);
			if (!access.ok || access.data === null) {
				return;
			}
			expect(access.data.status).toBe("pending");

			const payroll = await getOffboardingPayrollHandoffByCase(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-payroll-get-${suffix}`,
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(payroll.ok).toBe(true);
			if (!payroll.ok || payroll.data === null) {
				return;
			}
			expect(payroll.data.status).toBe("pending");

			const tasks = await listOffboardingTasks(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-off-tasks-${suffix}`,
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(tasks.ok).toBe(true);
			if (!tasks.ok) {
				return;
			}
			const [task] = tasks.data;
			expect(task).toBeDefined();
			if (!task) {
				return;
			}

			const taskCompleted = await completeOffboardingTask(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-off-task-${suffix}`,
					taskId: task.id,
					status: "completed",
					expectedVersion: task.version,
				},
				ready,
			);
			expect(taskCompleted.ok, resultFailureMessage(taskCompleted)).toBe(true);
			if (!taskCompleted.ok) {
				return;
			}
			const interviewRecorded = await recordExitInterview(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-exit-${suffix}`,
					offboardingCaseId: offboarding.data.id,
					conductedOn: "2025-06-02",
					notes: "Exit interview completed",
				},
				ready,
			);
			expect(
				interviewRecorded.ok,
				resultFailureMessage(interviewRecorded),
			).toBe(true);
			if (!interviewRecorded.ok) {
				return;
			}

			const clearance = await getClearanceByOffboardingCase(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-clearance-get-${suffix}`,
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(clearance.ok).toBe(true);
			if (!clearance.ok || clearance.data === null) {
				return;
			}

			const clearanceRecorded = await recordClearance(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-clearance-${suffix}`,
					clearanceId: clearance.data.id,
					clearedOn: "2025-06-03",
					expectedVersion: clearance.data.version,
				},
				ready,
			);
			expect(
				clearanceRecorded.ok,
				resultFailureMessage(clearanceRecorded),
			).toBe(true);
			if (!clearanceRecorded.ok) {
				return;
			}

			const accessRecorded = await recordOffboardingAccessRevocation(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-access-record-${suffix}`,
					accessRevocationId: access.data.id,
					revokedOn: "2025-06-04",
					summary: "Access revoked",
					expectedVersion: access.data.version,
				},
				ready,
			);
			expect(accessRecorded.ok).toBe(true);
			if (!accessRecorded.ok) {
				return;
			}

			const payrollRecorded = await recordOffboardingPayrollHandoff(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-payroll-record-${suffix}`,
					payrollHandoffId: payroll.data.id,
					readyOn: "2025-06-05",
					summary: "Payroll handoff ready",
					expectedVersion: payroll.data.version,
				},
				ready,
			);
			expect(payrollRecorded.ok).toBe(true);
			if (!payrollRecorded.ok) {
				return;
			}

			const completed = await completeOffboarding(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-off-complete-${suffix}`,
					offboardingCaseId: offboarding.data.id,
					expectedVersion: payrollRecorded.data.version,
				},
				ready,
			);
			expect(completed.ok, resultFailureMessage(completed)).toBe(true);
			if (!completed.ok) {
				return;
			}
			expect(completed.data.status).toBe("completed");

			if (adapter === "memory") {
				const terminationRow = await ready.store.getTermination({
					organizationId,
					terminationId: termFlow.termination.id,
				});
				expect(terminationRow.ok).toBe(true);
				if (terminationRow.ok && terminationRow.data) {
					expect(terminationRow.data.approvedAt).not.toBeNull();
					expect(terminationRow.data.rehireEligible).toBe(false);
				}
				return;
			}

			const terminationRows = await afendaDatabase.client
				.select()
				.from(hrTermination)
				.where(
					and(
						eq(hrTermination.organizationId, organizationId),
						eq(hrTermination.id, termFlow.termination.id),
					),
				);
			expect(terminationRows[0]?.status).toBe("finalized");
			expect(terminationRows[0]?.approvedAt).not.toBeNull();
			expect(terminationRows[0]?.rehireEligible).toBe(false);

			const accessRows = await afendaDatabase.client
				.select()
				.from(hrOffboardingAccessRevocation)
				.where(
					and(
						eq(hrOffboardingAccessRevocation.organizationId, organizationId),
						eq(
							hrOffboardingAccessRevocation.offboardingCaseId,
							offboarding.data.id,
						),
					),
				);
			expect(accessRows[0]?.status).toBe("revoked");

			const payrollRows = await afendaDatabase.client
				.select()
				.from(hrOffboardingPayrollHandoff)
				.where(
					and(
						eq(hrOffboardingPayrollHandoff.organizationId, organizationId),
						eq(
							hrOffboardingPayrollHandoff.offboardingCaseId,
							offboarding.data.id,
						),
					),
				);
			expect(payrollRows[0]?.status).toBe("ready");
		});

		it(`${adapter}: probation assessment, extend, outcome, and confirm emit enriched events`, async () => {
			const ready = createHrParityHarness(adapter);
			const suffix = uniqueSuffix(adapter);
			const organizationId = neonOrgs.trackOrg(`org-prob-parity-${suffix}`);
			const actorUserId = "user-prob-parity";

			const employee = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-emp-prob-${suffix}`,
					idempotencyKey: `idem-emp-prob-${suffix}`,
					employeeNumber: `EP-${suffix}`.slice(0, 64),
					legalName: "Probation Parity Worker",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-employment-prob-${suffix}`,
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const probation = await openProbation(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-prob-open-${suffix}`,
					idempotencyKey: `idem-prob-open-${suffix}`,
					employmentId: employment.data.id,
					startsOn: "2025-01-01",
					endsOn: "2025-04-01",
				},
				ready,
			);
			expect(probation.ok).toBe(true);
			if (!probation.ok) {
				return;
			}

			const assessment = await recordProbationAssessment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-prob-assess-${suffix}`,
					probationReviewId: probation.data.id,
					reviewedOn: "2025-02-01",
					reason: "Interim review satisfactory",
					expectedVersion: probation.data.version,
				},
				ready,
			);
			expect(assessment.ok).toBe(true);
			if (!assessment.ok) {
				return;
			}

			const extended = await extendProbation(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-prob-extend-${suffix}`,
					probationReviewId: probation.data.id,
					newEndsOn: "2025-05-01",
					reason: "Extended probation period",
					expectedVersion: probation.data.version + 1,
				},
				ready,
			);
			expect(extended.ok).toBe(true);
			if (!extended.ok) {
				return;
			}

			const outcome = await recordProbationOutcome(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-prob-outcome-${suffix}`,
					probationReviewId: extended.data.id,
					outcome: "passed",
					outcomeRecordedOn: "2025-04-30",
					reason: "Probation passed",
					expectedVersion: extended.data.version,
				},
				ready,
			);
			expect(outcome.ok).toBe(true);
			if (!outcome.ok) {
				return;
			}

			const confirmed = await confirmEmployment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-prob-confirm-${suffix}`,
					idempotencyKey: `idem-prob-confirm-${suffix}`,
					employmentId: employment.data.id,
					confirmedOn: "2025-05-01",
					evidenceNote: "Confirmed after probation",
				},
				ready,
			);
			expect(confirmed.ok).toBe(true);

			const expectedTypes = [
				HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
				HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
				HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
				HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
			];

			if (adapter === "memory") {
				for (const type of expectedTypes) {
					expect(
						ready.ports.outbox.calls.some((call) => call.type === type),
					).toBe(true);
				}
				const extendEvent = ready.ports.outbox.calls.find(
					(call) => call.type === HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
				);
				expect(extendEvent?.payload.newEndsOn).toBe("2025-05-01");
				expect(extendEvent?.payload.reason).toBe("Extended probation period");
				return;
			}

			const events = await afendaDatabase.client
				.select()
				.from(platformDomainEvent)
				.where(
					and(
						eq(platformDomainEvent.organizationId, organizationId),
						inArray(platformDomainEvent.type, expectedTypes),
					),
				);
			expect(events).toHaveLength(expectedTypes.length);
			const extendEvent = events.find(
				(row) => row.type === HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
			);
			const payload = extendEvent?.payload;
			if (typeof payload === "object" && payload !== null) {
				expect("newEndsOn" in payload && payload.newEndsOn).toBe("2025-05-01");
				expect("reason" in payload && payload.reason).toBe(
					"Extended probation period",
				);
			}
		});

		it(`${adapter}: onboarding handoff facts complete through governed checklist`, async () => {
			const ready = createHrParityHarness(adapter);
			const suffix = uniqueSuffix(adapter);
			const organizationId = neonOrgs.trackOrg(`org-onb-parity-${suffix}`);
			const actorUserId = "user-onb-parity";

			const employee = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-emp-onb-${suffix}`,
					idempotencyKey: `idem-emp-onb-${suffix}`,
					employeeNumber: `EO-${suffix}`.slice(0, 64),
					legalName: "Onboarding Parity Worker",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-employment-onb-${suffix}`,
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const completed = await completeOnboardingPath(ready, {
				organizationId,
				actorUserId,
				employmentId: employment.data.id,
				employeeId: employee.data.id,
				suffix,
			});
			expect(completed.ok).toBe(true);
			if (!completed.ok) {
				return;
			}
			expect(completed.data.status).toBe("completed");

			if (adapter === "memory") {
				const completedEvent = ready.ports.outbox.calls.find(
					(call) => call.type === HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
				);
				expect(completedEvent).toBeDefined();
				return;
			}

			const orientationRows = await afendaDatabase.client
				.select()
				.from(hrOnboardingOrientation)
				.where(
					and(
						eq(hrOnboardingOrientation.organizationId, organizationId),
						eq(hrOnboardingOrientation.onboardingCaseId, completed.data.id),
					),
				);
			expect(orientationRows[0]?.status).toBe("acknowledged");

			const equipmentRows = await afendaDatabase.client
				.select()
				.from(hrOnboardingEquipmentHandoff)
				.where(
					and(
						eq(hrOnboardingEquipmentHandoff.organizationId, organizationId),
						eq(
							hrOnboardingEquipmentHandoff.onboardingCaseId,
							completed.data.id,
						),
					),
				);
			expect(equipmentRows[0]?.status).toBe("handed_over");

			const accessRows = await afendaDatabase.client
				.select()
				.from(hrOnboardingAccessHandoff)
				.where(
					and(
						eq(hrOnboardingAccessHandoff.organizationId, organizationId),
						eq(hrOnboardingAccessHandoff.onboardingCaseId, completed.data.id),
					),
				);
			expect(accessRows[0]?.status).toBe("granted");
		});
	}
});
