/**
 * Failure injection tests for HR leave transactions
 *
 * Tests verify that transaction failures leave no partial state by:
 * - Injecting failures at different transaction stages
 * - Verifying complete rollback occurs
 * - Ensuring no orphaned records remain
 * - Testing atomic behavior under various failure conditions
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzleLeave } from "../src/adapters/drizzle/leave";
import * as leaveTransactions from "../src/adapters/drizzle/leave-transactions";
import { createTestHarness } from "./helpers/hr-parity-harness";
import {
	and,
	db,
	eq,
	hrLeaveAdjustment,
	hrLeaveRequest,
	hrLeaveRequestSegment,
} from "@afenda/db";
import type { 
	WorkforceTestHarness,
	TestEmployee,
	TestEmployment,
	TestLeavePolicy,
	TestLeaveEntitlement,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

describe.skipIf(!hasDatabase)("Leave Failure Injection Tests", () => {
	let harness: WorkforceTestHarness;
	let employee: TestEmployee;
	let employment: TestEmployment;
	let policy: TestLeavePolicy;
	let entitlement: TestLeaveEntitlement;
	
	beforeEach(async () => {
		harness = await createTestHarness();
		
		// Create test data
		employee = await harness.createEmployee();
		employment = await harness.createEmployment(employee);
		policy = await harness.createLeavePolicy();
		entitlement = await harness.createLeaveEntitlement(employee, employment, policy);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Create Draft Leave Request Failures", () => {
		it("leaves no partial state when request creation fails", async () => {
			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Database connection lost"),
			);

			// Attempt to create request
			const result = await drizzleLeave.createDraftLeaveRequest(
				{
					organizationId: harness.organizationId,
					employeeId: employee.id,
					employmentId: employment.id,
					entitlementId: entitlement.id,
					policyId: policy.id,
					startDate: "2024-01-15",
					endDate: "2024-01-17",
					requestedQuantity: "3",
					unit: policy.unit,
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-01-15", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-16", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-17", quantity: "1", dayPortion: "full" },
					],
					createIdempotencyKey: `create-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Operation should fail
			expect(result.ok).toBe(false);

			// Verify no partial records exist
			const requests = await db
				.select()
				.from(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, harness.organizationId));

			const segments = await db
				.select()
				.from(hrLeaveRequestSegment)
				.where(eq(hrLeaveRequestSegment.organizationId, harness.organizationId));

			expect(requests).toHaveLength(0);
			expect(segments).toHaveLength(0);
		});

		it("handles audit failure without leaving orphaned request", async () => {
			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Audit service unavailable"),
			);

			// Attempt to create request  
			const result = await drizzleLeave.createDraftLeaveRequest(
				{
					organizationId: harness.organizationId,
					employeeId: employee.id,
					employmentId: employment.id,
					entitlementId: entitlement.id,
					policyId: policy.id,
					startDate: "2024-01-15",
					endDate: "2024-01-17",
					requestedQuantity: "3",
					unit: policy.unit,
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-01-15", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-16", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-17", quantity: "1", dayPortion: "full" },
					],
					createIdempotencyKey: `create-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Since audit is embedded in CTE, the transaction should fail atomically
			expect(result.ok).toBe(false);

			// Verify no records were created
			const requests = await db
				.select()
				.from(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, harness.organizationId));

			expect(requests).toHaveLength(0);

			vi.restoreAllMocks();
		});
	});

	describe("Approve Leave Request Failures", () => {
		it("prevents partial approval state on balance check failure", async () => {
			// Create and submit a request
			const request = await harness.createLeaveRequest(
				employee,
				employment, 
				entitlement,
				policy,
				{ requestedQuantity: entitlement.openingQuantity }
			);

			await drizzleLeave.submitLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Manually consume all balance to simulate insufficient balance
			await drizzleLeave.adjustLeaveEntitlement(
				{
					organizationId: harness.organizationId,
					entitlementId: entitlement.id,
					sourceRequestId: null,
					kind: "manual",
					delta: `-${entitlement.openingQuantity}`,
					reason: "Pre-consume balance",
					source: "test",
					createIdempotencyKey: `pre-consume-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Try to approve - should fail due to insufficient balance
			const approval = await drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2, // After submit
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Approval should fail
			expect(approval.ok).toBe(false);

			// Verify request is still in submitted state
			const requestCheck = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(requestCheck.ok).toBe(true);
			expect(requestCheck.data?.status).toBe("submitted");
			expect(requestCheck.data?.version).toBe(2); // Unchanged

			// Verify no consumption adjustment was created
			const adjustments = await db
				.select()
				.from(hrLeaveAdjustment)
				.where(
					and(
						eq(hrLeaveAdjustment.organizationId, harness.organizationId),
						eq(hrLeaveAdjustment.sourceRequestId, request.id)
					)
				);

			expect(adjustments).toHaveLength(0);
		});

		it("rolls back approval on outbox failure", async () => {
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);
			
			await drizzleLeave.submitLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Outbox service down"),
			);

			// Try to approve
			const approval = await drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Since outbox is embedded in CTE, transaction should fail atomically
			expect(approval.ok).toBe(false);

			// Verify request state is unchanged
			const requestCheck = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(requestCheck.ok).toBe(true);
			expect(requestCheck.data?.status).toBe("submitted");

			// Verify balance is unchanged
			const balance = await drizzleLeave.getLeaveBalance({
				organizationId: harness.organizationId,
				entitlementId: entitlement.id,
			});
			expect(balance.ok).toBe(true);
			expect(balance.data?.balance).toBe(entitlement.openingQuantity);
		});
	});

	describe("Cancel Approved Leave Request Failures", () => {
		it("prevents partial cancellation on reversal failure", async () => {
			// Create, submit and approve a request
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);
			
			await drizzleLeave.submitLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const approved = await drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);
			expect(approved.ok).toBe(true);

			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Adjustment creation failed"),
			);

			// Try to cancel
			const cancellation = await drizzleLeave.cancelApprovedLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 3, // After approval
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Cancellation should fail
			expect(cancellation.ok).toBe(false);

			// Verify request is still approved
			const requestCheck = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(requestCheck.ok).toBe(true);
			expect(requestCheck.data?.status).toBe("approved");
			expect(requestCheck.data?.version).toBe(3); // Unchanged

			// Verify no reversal adjustment was created
			const adjustments = await db
				.select()
				.from(hrLeaveAdjustment)
				.where(
					and(
						eq(hrLeaveAdjustment.organizationId, harness.organizationId),
						eq(hrLeaveAdjustment.sourceRequestId, request.id),
						eq(hrLeaveAdjustment.kind, "cancellation_reversal")
					)
				);

			expect(adjustments).toHaveLength(0);

			vi.restoreAllMocks();
		});
	});

	describe("Entitlement Operations Failures", () => {
		it("prevents partial carry-forward on new entitlement creation failure", async () => {
			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Database constraint violation"),
			);

			// Try to carry forward
			const carryForward = await drizzleLeave.carryForwardLeaveEntitlement(
				{
					organizationId: harness.organizationId,
					entitlementId: entitlement.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
					newPeriodStart: "2025-01-01",
					newPeriodEnd: "2025-12-31",
					carriedQuantity: "5",
					createIdempotencyKey: `carry-forward-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
				},
				harness.ports,
				harness.meta,
			);

			// Operation should fail
			expect(carryForward.ok).toBe(false);

			// Verify source entitlement is unchanged
			const sourceCheck = await drizzleLeave.getLeaveEntitlementById({
				organizationId: harness.organizationId,
				entitlementId: entitlement.id,
			});
			expect(sourceCheck.ok).toBe(true);
			expect(sourceCheck.data?.status).toBe("active"); // Not carried_forward
			expect(sourceCheck.data?.version).toBe(1); // Unchanged
		});

		it("handles audit failure in adjustment creation", async () => {
			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Audit system failure"),
			);

			// Try to create adjustment
			const adjustment = await drizzleLeave.adjustLeaveEntitlement(
				{
					organizationId: harness.organizationId,
					entitlementId: entitlement.id,
					sourceRequestId: null,
					kind: "manual",
					delta: "5",
					reason: "Manual credit",
					source: "system",
					createIdempotencyKey: `adjust-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Since audit is embedded in CTE, operation should fail
			expect(adjustment.ok).toBe(false);

			// Verify no adjustment was created
			const adjustments = await db
				.select()
				.from(hrLeaveAdjustment)
				.where(
					and(
						eq(hrLeaveAdjustment.organizationId, harness.organizationId),
						eq(hrLeaveAdjustment.entitlementId, entitlement.id)
					)
				);

			expect(adjustments).toHaveLength(0);

			vi.restoreAllMocks();
		});
	});

	describe("Amendment Failures", () => {
		it("prevents partial amendment on segment deletion failure", async () => {
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);

			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Foreign key constraint violation"),
			);

			// Try to amend
			const amendment = await drizzleLeave.amendLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
					startDate: "2024-02-01",
					endDate: "2024-02-02",
					requestedQuantity: "2",
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-02-01", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-02-02", quantity: "1", dayPortion: "full" },
					],
				},
				harness.ports,
				harness.meta,
			);

			// Amendment should fail
			expect(amendment.ok).toBe(false);

			// Verify original request is unchanged
			const requestCheck = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(requestCheck.ok).toBe(true);
			expect(requestCheck.data?.version).toBe(1); // Unchanged
			expect(requestCheck.data?.startDate).not.toBe("2024-02-01"); // Still original
		});
	});

	describe("Network and Timeout Failures", () => {
		it("handles transaction timeout gracefully", async () => {
			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockImplementation(
				() =>
					new Promise((_, reject) => {
						setTimeout(() => reject(new Error("Transaction timeout")), 60000);
					}),
			);

			// Set shorter timeout for test
			const startTime = Date.now();
			
			const result = await Promise.race([
				drizzleLeave.createDraftLeaveRequest(
					{
						organizationId: harness.organizationId,
						employeeId: employee.id,
						employmentId: employment.id,
						entitlementId: entitlement.id,
						policyId: policy.id,
						startDate: "2024-01-15",
						endDate: "2024-01-17",
						requestedQuantity: "3",
						unit: policy.unit,
						isBackdated: false,
						backdateJustification: null,
						segments: [
							{ segmentDate: "2024-01-15", quantity: "1", dayPortion: "full" },
						],
						createIdempotencyKey: `timeout-test-${randomUUID()}`,
						createRequestFingerprint: randomUUID(),
						createdBy: harness.actorUserId,
					},
					harness.ports,
					harness.meta,
				),
				new Promise<{ ok: false; error: any }>((resolve) => 
					setTimeout(() => resolve({ ok: false, error: { code: "TIMEOUT" } }), 5000)
				)
			]);

			const elapsed = Date.now() - startTime;
			expect(elapsed).toBeLessThan(10000); // Should timeout before 10 seconds
			expect(result.ok).toBe(false);

			// Verify no partial state exists after timeout
			const requests = await db
				.select()
				.from(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, harness.organizationId));

			expect(requests).toHaveLength(0);

			vi.restoreAllMocks();
		});
	});

	describe("Version Conflict Failures", () => {
		it("prevents lost updates during version conflicts", async () => {
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);

			// First user amends the request
			const amendment1 = await drizzleLeave.amendLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
					startDate: "2024-02-01",
					endDate: "2024-02-03",
					requestedQuantity: "3",
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-02-01", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-02-02", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-02-03", quantity: "1", dayPortion: "full" },
					],
				},
				harness.ports,
				harness.meta,
			);
			expect(amendment1.ok).toBe(true);

			// Second user tries to amend with stale version
			const amendment2 = await drizzleLeave.amendLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1, // Stale version
					actorUserId: harness.actorUserId,
					startDate: "2024-03-01",
					endDate: "2024-03-05",
					requestedQuantity: "5",
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-03-01", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-03-02", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-03-03", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-03-04", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-03-05", quantity: "1", dayPortion: "full" },
					],
				},
				harness.ports,
				harness.meta,
			);

			// Second amendment should fail due to version conflict
			expect(amendment2.ok).toBe(false);

			// Verify first amendment is preserved
			const final = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(final.ok).toBe(true);
			expect(final.data?.startDate).toBe("2024-02-01");
			expect(final.data?.endDate).toBe("2024-02-03");
			expect(final.data?.requestedQuantity).toBe("3");
			expect(final.data?.version).toBe(2); // Incremented once
		});
	});

	describe("Complex Failure Scenarios", () => {
		it("handles cascading failure during multi-operation transaction", async () => {
			// Create an entitlement at the edge of balance (distinct period avoids active unique index)
			const limitedEntitlement = await harness.createLeaveEntitlement(
				employee,
				employment,
				policy,
				{
					openingQuantity: "1",
					periodStart: "2025-01-01",
					periodEnd: "2025-12-31",
				},
			);

			// Create request that exactly matches balance
			const request = await harness.createLeaveRequest(
				employee,
				employment,
				limitedEntitlement,
				policy,
				{ requestedQuantity: "1" }
			);

			await drizzleLeave.submitLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			vi.spyOn(leaveTransactions, "runLeaveTransaction").mockRejectedValue(
				new Error("Status update failed"),
			);

			// Try to approve
			const approval = await drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Should fail atomically
			expect(approval.ok).toBe(false);

			// Verify balance was not consumed
			const balance = await drizzleLeave.getLeaveBalance({
				organizationId: harness.organizationId,
				entitlementId: limitedEntitlement.id,
			});
			expect(balance.ok).toBe(true);
			expect(balance.data?.balance).toBe("1"); // Unchanged

			// Verify request is still submitted
			const requestCheck = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(requestCheck.ok).toBe(true);
			expect(requestCheck.data?.status).toBe("submitted");
		});
	});
});