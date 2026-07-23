/**
 * Concurrency and race condition tests for HR leave transactions
 *
 * Tests verify that the transactional implementation prevents:
 * - Double spending of leave balances
 * - Race conditions in approval workflows
 * - Partial state from concurrent operations
 * - Lost updates in version conflicts
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzleLeave } from "../src/adapters/drizzle/leave";
import { createTestHarness } from "./helpers/hr-parity-harness";
import type { 
	WorkforceTestHarness,
	TestEmployee,
	TestEmployment,
	TestLeavePolicy,
	TestLeaveEntitlement,
	TestLeaveRequest,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

describe.skipIf(!hasDatabase)("Leave Concurrency Tests", () => {
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

	describe("Concurrent Leave Approval", () => {
		it("prevents double spending when approving same request concurrently", async () => {
			// Create a leave request that consumes the entire balance
			const request = await harness.createLeaveRequest(
				employee, 
				employment, 
				entitlement, 
				policy,
				{ requestedQuantity: entitlement.openingQuantity }
			);

			// Submit the request
			const submitted = await drizzleLeave.submitLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);
			expect(submitted.ok).toBe(true);

			// Two managers try to approve the same request concurrently
			const approval1Promise = drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2, // after submit
					actorUserId: harness.actorUserId,
					note: "Approved by manager 1",
				},
				harness.ports,
				harness.meta,
			);

			const approval2Promise = drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2, // same version
					actorUserId: harness.actorUserId,
					note: "Approved by manager 2",
				},
				harness.ports,
				harness.meta,
			);

			// Wait for both operations to complete
			const [result1, result2] = await Promise.allSettled([
				approval1Promise,
				approval2Promise,
			]);

			// Exactly one should succeed, one should fail
			const successCount = [result1, result2].filter(
				result => result.status === "fulfilled" && result.value.ok
			).length;

			const failureCount = [result1, result2].filter(
				result => result.status === "fulfilled" && !result.value.ok
			).length;

			expect(successCount).toBe(1);
			expect(failureCount).toBe(1);

			// Verify balance was only consumed once
			const balance = await drizzleLeave.getLeaveBalance({
				organizationId: harness.organizationId,
				entitlementId: entitlement.id,
			});
			expect(balance.ok).toBe(true);
			expect(balance.data?.balance).toBe("0"); // All consumed by single approval
		});

		it("prevents approval when insufficient balance due to concurrent consumption", async () => {
			// Create two requests that would individually fit, but together exceed balance
			const halfBalance = String(Number(entitlement.openingQuantity) / 2);
			const moreThanHalf = String(Math.floor(Number(entitlement.openingQuantity) * 0.7));
			
			const request1 = await harness.createLeaveRequest(
				employee,
				employment,
				entitlement,
				policy,
				{ requestedQuantity: moreThanHalf }
			);

			const request2 = await harness.createLeaveRequest(
				employee,
				employment, 
				entitlement,
				policy,
				{ requestedQuantity: halfBalance }
			);

			// Submit both requests
			await Promise.all([
				drizzleLeave.submitLeaveRequest(
					{
						organizationId: harness.organizationId,
						requestId: request1.id,
						expectedVersion: 1,
						actorUserId: harness.actorUserId,
					},
					harness.ports,
					harness.meta,
				),
				drizzleLeave.submitLeaveRequest(
					{
						organizationId: harness.organizationId,
						requestId: request2.id,
						expectedVersion: 1,
						actorUserId: harness.actorUserId,
					},
					harness.ports,
					harness.meta,
				),
			]);

			// Try to approve both concurrently
			const approval1Promise = drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request1.id,
					expectedVersion: 2,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const approval2Promise = drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request2.id,
					expectedVersion: 2,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const [result1, result2] = await Promise.allSettled([
				approval1Promise,
				approval2Promise,
			]);

			// Only one approval should succeed (the first to acquire the lock)
			const successCount = [result1, result2].filter(
				result => result.status === "fulfilled" && result.value.ok
			).length;

			expect(successCount).toBe(1);

			// Verify the failed approval didn't consume any balance
			const balance = await drizzleLeave.getLeaveBalance({
				organizationId: harness.organizationId,
				entitlementId: entitlement.id,
			});
			expect(balance.ok).toBe(true);

			// Exactly one request quantity should have been consumed
			const consumed = Number(entitlement.openingQuantity) - Number(balance.data?.balance);
			expect([Number(moreThanHalf), Number(halfBalance)]).toContain(consumed);
		});
	});

	describe("Concurrent Request Amendment", () => {
		it("prevents conflicting amendments to same request", async () => {
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);

			// Two users try to amend the same request concurrently
			const amendment1Promise = drizzleLeave.amendLeaveRequest(
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

			const amendment2Promise = drizzleLeave.amendLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1, // Same version
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

			const [result1, result2] = await Promise.allSettled([
				amendment1Promise,
				amendment2Promise,
			]);

			// Exactly one should succeed due to version conflict
			const successCount = [result1, result2].filter(
				result => result.status === "fulfilled" && result.value.ok
			).length;

			const failureCount = [result1, result2].filter(
				result => result.status === "fulfilled" && !result.value.ok
			).length;

			expect(successCount).toBe(1);
			expect(failureCount).toBe(1);

			// Verify final state reflects only one amendment
			const final = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(final.ok).toBe(true);
			expect(final.data?.version).toBe(2); // Should be incremented once
		});
	});

	describe("Concurrent Entitlement Operations", () => {
		it("prevents conflicting carry-forward operations", async () => {
			// Two processes try to carry forward the same entitlement concurrently
			const carryForward1Promise = drizzleLeave.carryForwardLeaveEntitlement(
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

			const carryForward2Promise = drizzleLeave.carryForwardLeaveEntitlement(
				{
					organizationId: harness.organizationId,
					entitlementId: entitlement.id,
					expectedVersion: 1, // Same version
					actorUserId: harness.actorUserId,
					newPeriodStart: "2025-01-01",
					newPeriodEnd: "2025-12-31",
					carriedQuantity: "8",
					createIdempotencyKey: `carry-forward-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
				},
				harness.ports,
				harness.meta,
			);

			const [result1, result2] = await Promise.allSettled([
				carryForward1Promise,
				carryForward2Promise,
			]);

			// Only one should succeed
			const successCount = [result1, result2].filter(
				result => result.status === "fulfilled" && result.value.ok
			).length;

			expect(successCount).toBe(1);

			// Verify source entitlement was transitioned only once
			const sourceCheck = await drizzleLeave.getLeaveEntitlementById({
				organizationId: harness.organizationId,
				entitlementId: entitlement.id,
			});
			expect(sourceCheck.ok).toBe(true);
			expect(sourceCheck.data?.status).toBe("carried_forward");
			expect(sourceCheck.data?.version).toBe(2); // Incremented once
		});
	});

	describe("Concurrent Policy Operations", () => {
		it("prevents conflicting status transitions on same policy", async () => {
			const testPolicy = await harness.createLeavePolicy({ status: "draft" });

			// Two processes try to publish the same policy concurrently
			const publish1Promise = drizzleLeave.publishLeavePolicy(
				{
					organizationId: harness.organizationId,
					policyId: testPolicy.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const publish2Promise = drizzleLeave.publishLeavePolicy(
				{
					organizationId: harness.organizationId,
					policyId: testPolicy.id,
					expectedVersion: 1, // Same version
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const [result1, result2] = await Promise.allSettled([
				publish1Promise,
				publish2Promise,
			]);

			// Only one should succeed
			const successCount = [result1, result2].filter(
				result => result.status === "fulfilled" && result.value.ok
			).length;

			const failureCount = [result1, result2].filter(
				result => result.status === "fulfilled" && !result.value.ok
			).length;

			expect(successCount).toBe(1);
			expect(failureCount).toBe(1);

			// Verify final state
			const final = await drizzleLeave.getLeavePolicyById({
				organizationId: harness.organizationId,
				policyId: testPolicy.id,
			});
			expect(final.ok).toBe(true);
			expect(final.data?.status).toBe("published");
			expect(final.data?.version).toBe(2); // Incremented once
		});
	});

	describe("Mixed Concurrent Operations", () => {
		it("handles concurrent approval and cancellation attempts", async () => {
			// Create and submit a request
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);
			
			const submitted = await drizzleLeave.submitLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 1,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);
			expect(submitted.ok).toBe(true);

			// One process tries to approve, another tries to withdraw
			const approvalPromise = drizzleLeave.approveLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2,
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const withdrawalPromise = drizzleLeave.withdrawLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 2, // Same version
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const [result1, result2] = await Promise.allSettled([
				approvalPromise,
				withdrawalPromise,
			]);

			// Only one should succeed
			const successCount = [result1, result2].filter(
				result => result.status === "fulfilled" && result.value.ok
			).length;

			expect(successCount).toBe(1);

			// Verify final state is consistent
			const final = await drizzleLeave.getLeaveRequestById({
				organizationId: harness.organizationId,
				requestId: request.id,
			});
			expect(final.ok).toBe(true);
			expect(final.data?.version).toBe(3); // Incremented once from submitted
			expect(["approved", "withdrawn"]).toContain(final.data?.status);
		});

		it("prevents race condition between approval and adjustment operations", async () => {
			// Create approved request
			const request = await harness.createLeaveRequest(employee, employment, entitlement, policy);
			
			// Submit and approve the request
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

			// One process tries to cancel, another tries to adjust the same entitlement
			const cancellationPromise = drizzleLeave.cancelApprovedLeaveRequest(
				{
					organizationId: harness.organizationId,
					requestId: request.id,
					expectedVersion: 3, // After approval
					actorUserId: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const adjustmentPromise = drizzleLeave.adjustLeaveEntitlement(
				{
					organizationId: harness.organizationId,
					entitlementId: entitlement.id,
					sourceRequestId: null,
					kind: "manual",
					delta: "2",
					reason: "Manual adjustment",
					source: "system",
					createIdempotencyKey: `adjustment-${randomUUID()}`,
					createRequestFingerprint: randomUUID(),
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			// Both operations should be able to complete since they don't conflict
			// Cancellation locks the request, adjustment locks the entitlement
			const [result1, result2] = await Promise.allSettled([
				cancellationPromise,
				adjustmentPromise,
			]);

			// Both should succeed since they operate on different entities with proper locking
			expect(result1.status).toBe("fulfilled");
			expect(result2.status).toBe("fulfilled");
			
			if (result1.status === "fulfilled" && result2.status === "fulfilled") {
				expect(result1.value.ok).toBe(true);
				expect(result2.value.ok).toBe(true);
			}
		});
	});

	describe("Idempotency Under Concurrency", () => {
		it("handles concurrent requests with same idempotency key", async () => {
			const idempotencyKey = `create-request-${randomUUID()}`;
			const fingerprint = randomUUID();

			// Two processes try to create the same request concurrently
			const create1Promise = drizzleLeave.createDraftLeaveRequest(
				{
					organizationId: harness.organizationId,
					employeeId: employee.id,
					employmentId: employment.id,
					entitlementId: entitlement.id,
					policyId: policy.id,
					startDate: "2024-01-15",
					endDate: "2024-01-19",
					requestedQuantity: "5",
					unit: policy.unit,
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-01-15", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-16", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-17", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-18", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-19", quantity: "1", dayPortion: "full" },
					],
					createIdempotencyKey: idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const create2Promise = drizzleLeave.createDraftLeaveRequest(
				{
					organizationId: harness.organizationId,
					employeeId: employee.id,
					employmentId: employment.id,
					entitlementId: entitlement.id,
					policyId: policy.id,
					startDate: "2024-01-15",
					endDate: "2024-01-19",
					requestedQuantity: "5",
					unit: policy.unit,
					isBackdated: false,
					backdateJustification: null,
					segments: [
						{ segmentDate: "2024-01-15", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-16", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-17", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-18", quantity: "1", dayPortion: "full" },
						{ segmentDate: "2024-01-19", quantity: "1", dayPortion: "full" },
					],
					createIdempotencyKey: idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: harness.actorUserId,
				},
				harness.ports,
				harness.meta,
			);

			const [result1, result2] = await Promise.allSettled([
				create1Promise,
				create2Promise,
			]);

			// One should create, one should return the existing record
			expect(result1.status).toBe("fulfilled");
			expect(result2.status).toBe("fulfilled");
			
			if (result1.status === "fulfilled" && result2.status === "fulfilled") {
				expect(result1.value.ok).toBe(true);
				expect(result2.value.ok).toBe(true);
				
				// Both should return the same request ID
				expect(result1.value.data.id).toBe(result2.value.data.id);
			}
		});
	});
});