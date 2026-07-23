import { ok } from "@afenda/errors/result";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHumanResourcesStore } from "../src/adapters/memory/store";
import type { HumanResourcesAuthorizationPort } from "../src/authorization";
import type { HumanResourcesEmployeeId } from "../src/brands";
import type { HumanResourcesIdentityResolverPort } from "../src/identity-resolver";
import { listEmployeeGoals } from "../src/performance/goal";
import {
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
} from "../src/permissions";
import { requireComplianceEmployeeReadScope } from "../src/shared/compliance-command";
import {
	requireManagerResourceAccess,
	requireOwnResourceAccess,
} from "../src/shared/subject-aware-authorization";
import type { HumanResourcesStore } from "../src/store";

describe("Security Boundary Tests", () => {
	const organizationId = "org-123";
	const validActorUserId = "user-valid";
	const invalidActorUserId = "user-invalid";
	const validEmployeeId =
		"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
	const invalidEmployeeId =
		"6ba7b810-9dad-11d1-80b4-00c04fd430c8" as HumanResourcesEmployeeId;

	let store: ReturnType<typeof createMemoryHumanResourcesStore>;
	let authPort: HumanResourcesAuthorizationPort;
	let identityResolver: HumanResourcesIdentityResolverPort;

	beforeEach(() => {
		store = createMemoryHumanResourcesStore();
		store.reset();

		// Mock authorization port that grants employee-document.own.read to valid users
		authPort = {
			async can(input) {
				if (input.permission === "human-resources.compliance.administer") {
					return false; // No admin permissions for these tests
				}
				if (
					input.permission === "human-resources.employee-document.own.read" &&
					input.actorUserId === validActorUserId
				) {
					return true;
				}
				return false;
			},
		};

		// Mock identity resolver that maps valid user to valid employee
		identityResolver = {
			async resolveEmployeeForActor(input) {
				// Only resolve for the correct organization and valid user
				if (
					input.organizationId === organizationId &&
					input.actorUserId === validActorUserId
				) {
					return ok({
						employeeId: validEmployeeId,
						relationshipType: "self" as const,
						effectiveFrom: "2024-01-01",
						effectiveUntil: null,
					});
				}
				return ok(null);
			},
			async resolveManagerEmployeesForActor() {
				return ok([]);
			},
		};
	});

	describe("Compliance Document IDOR Prevention", () => {
		it("should allow access to own employee documents", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(true);
		});

		it("should deny access to other employee's documents with wrong employee ID", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: invalidEmployeeId, // Different employee ID
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});

		it("should deny access when user has no employee identity", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId: invalidActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Actor is not an employee");
		});

		it("should deny access when user lacks permission", async () => {
			// Use an auth port that denies the permission
			const denyAuthPort = {
				async can() {
					return false;
				},
			};

			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				denyAuthPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});

		it("should deny access when identity resolver is missing", async () => {
			// Create a null identity resolver to test error handling
			const nullIdentityResolver =
				null as unknown as HumanResourcesIdentityResolverPort;

			try {
				const result = await requireComplianceEmployeeReadScope(
					nullIdentityResolver,
					authPort,
					{
						organizationId,
						actorUserId: validActorUserId,
						employeeId: validEmployeeId,
					},
				);

				// If we reach here, it should be a failed result
				expect(result.ok).toBe(false);
				expect(result.message).toContain(
					"Missing required human resources permission",
				);
			} catch (error) {
				// Should catch the error when trying to call methods on null
				expect(error).toBeDefined();
			}
		});
	});

	describe("Cross-Organization Security", () => {
		it("should prevent cross-organization access", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId: "different-org", // Different organization
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Actor is not an employee");
		});
	});

	describe("Temporal Security", () => {
		it("should respect effective dates in identity resolution", async () => {
			// Mock identity resolver that returns identity only for specific dates
			const temporalIdentityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					const asOf = input.asOf || new Date().toISOString().split("T")[0];

					// Identity is only effective from 2024-01-01 to 2024-12-31
					if (
						input.actorUserId === validActorUserId &&
						asOf >= "2024-01-01" &&
						asOf <= "2024-12-31"
					) {
						return ok({
							employeeId: validEmployeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: "2024-12-31",
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Test with a valid date within the effective period
			const validResult = await requireComplianceEmployeeReadScope(
				temporalIdentityResolver,
				authPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
					asOf: "2024-06-15", // Within the effective range
				},
			);

			expect(validResult.ok).toBe(true);

			// Test with a date outside the effective period
			const invalidResult = await requireComplianceEmployeeReadScope(
				temporalIdentityResolver,
				authPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
					asOf: "2025-01-01", // Outside the effective range
				},
			);

			expect(invalidResult.ok).toBe(false);
			expect(invalidResult.message).toBe("Actor is not an employee");
		});
	});

	describe("Multiple Attack Vectors", () => {
		it("should derive own employee when client omits employeeId", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: undefined,
				},
			);

			expect(result.ok).toBe(true);
		});

		it("should handle malformed employee IDs", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId:
						"'; DROP TABLE hr_employee; --" as HumanResourcesEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});

		it("should handle malformed organization IDs", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId: "malicious-org-id",
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Actor is not an employee");
		});

		it("should handle malformed user IDs", async () => {
			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId: "'; DROP TABLE platform_user; --",
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Actor is not an employee");
		});
	});

	describe("Authorization Bypass Attempts", () => {
		it("should prevent permission bypass through case sensitivity", async () => {
			const caseBypassAuthPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					// Try to bypass with different case
					if (input.permission === "EMPLOYEE-DOCUMENT.OWN.READ") {
						return true;
					}
					return false;
				},
			};

			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				caseBypassAuthPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});

		it("should prevent bypass through permission name manipulation", async () => {
			const manipulatedAuthPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					// Try to bypass with similar but different permission
					if (input.permission === "employee-document.own.write") {
						return true;
					}
					return false;
				},
			};

			const result = await requireComplianceEmployeeReadScope(
				identityResolver,
				manipulatedAuthPort,
				{
					organizationId,
					actorUserId: validActorUserId,
					employeeId: validEmployeeId,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});
	});

	describe("Real Identity Resolver Integration", () => {
		it("should prevent IDOR attacks through actual performance query paths", async () => {
			const correlationId = "test-correlation-123";
			const employeeId1 =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const employeeId2 =
				"6ba7b810-9dad-11d1-80b4-00c04fd430c8" as HumanResourcesEmployeeId;
			const actorUserId = "user-actor-123";

			// Set up authorization that grants own.read permission
			const authPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					if (
						input.permission ===
							HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ &&
						input.actorUserId === actorUserId
					) {
						return true;
					}
					return false;
				},
			};

			// Set up identity resolver that maps actor to employeeId1 only
			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					if (input.actorUserId === actorUserId) {
						return ok({
							employeeId: employeeId1,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Should allow access to own employee (employeeId1)
			const ownResult = await listEmployeeGoals(
				{
					organizationId,
					correlationId,
					actorUserId,
					employeeId: employeeId1,
				},
				{
					store,
					authorization: authPort,
					identityResolver,
				},
			);
			expect(ownResult.ok).toBe(true);

			// Should deny access to other employee (employeeId2) - IDOR prevention
			const idorResult = await listEmployeeGoals(
				{
					organizationId,
					correlationId,
					actorUserId,
					employeeId: employeeId2,
				},
				{
					store,
					authorization: authPort,
					identityResolver,
				},
			);
			expect(idorResult.ok).toBe(false);
			expect(idorResult.message).toContain(
				"Missing required human resources permission",
			);
		});

		it("should validate manager relationships through actual store queries", async () => {
			const managerEmployeeId =
				"f47ac10b-58cc-4372-a567-0e02b2c3d475" as HumanResourcesEmployeeId;
			const employeeId1 =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const employeeId2 =
				"6ba7b810-9dad-11d1-80b4-00c04fd430c8" as HumanResourcesEmployeeId;
			const actorUserId = "manager-user-123";

			// Set up authorization that grants manager.manage permission
			const authPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					if (
						input.permission ===
							HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE &&
						input.actorUserId === actorUserId
					) {
						return true;
					}
					return false;
				},
			};

			// Set up identity resolver that maps manager to their employee ID
			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					if (input.actorUserId === actorUserId) {
						return ok({
							employeeId: managerEmployeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Set up store with manager relationship
			const testStore = {
				...store,
				// Mock that manager manages employeeId1 but not employeeId2
				async getPrimaryManagerForEmployee({
					employeeId,
				}: {
					employeeId: string;
				}) {
					if (employeeId === employeeId1) {
						return ok(managerEmployeeId);
					}
					return ok(null);
				},
			};

			// Should allow manager access to direct report (employeeId1)
			const managerAccessResult = await requireManagerResourceAccess(
				identityResolver,
				testStore as HumanResourcesStore,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: employeeId1,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
				},
			);
			expect(managerAccessResult.ok).toBe(true);

			// Should deny manager access to non-report (employeeId2)
			const managerDeniedResult = await requireManagerResourceAccess(
				identityResolver,
				testStore as HumanResourcesStore,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: employeeId2,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
				},
			);
			expect(managerDeniedResult.ok).toBe(false);
			expect(managerDeniedResult.message).toContain(
				"Actor is not the manager of the target employee",
			);
		});

		it("should prevent identity spoofing attacks", async () => {
			const legitEmployeeId =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const spoofedEmployeeId =
				"f47ac10b-58cc-4372-a567-0e02b2c3d479" as HumanResourcesEmployeeId;
			const actorUserId = "attacker-user";

			// Set up authorization that would grant permission if identity was spoofed
			const authPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					if (
						input.permission === HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ
					) {
						return true;
					}
					return false;
				},
			};

			// Identity resolver maps attacker to legitimate employee
			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					if (input.actorUserId === actorUserId) {
						return ok({
							employeeId: legitEmployeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Should allow access to legitimate employee identity
			const legitResult = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: legitEmployeeId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				},
			);
			expect(legitResult.ok).toBe(true);

			// Should prevent access to spoofed employee identity
			const spoofResult = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: spoofedEmployeeId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				},
			);
			expect(spoofResult.ok).toBe(false);
			expect(spoofResult.message).toContain(
				"Cannot access other employee's resources",
			);
		});

		it("should validate organization boundaries in identity resolution", async () => {
			const employeeId =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const actorUserId = "cross-org-user";

			const authPort: HumanResourcesAuthorizationPort = {
				async can() {
					return true;
				},
			};

			// Identity resolver only works for specific organization
			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					// Only resolve identity for the correct organization
					if (
						input.organizationId === organizationId &&
						input.actorUserId === actorUserId
					) {
						return ok({
							employeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Should work for correct organization
			const validOrgResult = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: employeeId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				},
			);
			expect(validOrgResult.ok).toBe(true);

			// Should fail for different organization
			const invalidOrgResult = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId: "different-org-456",
					actorUserId,
					targetEmployeeId: employeeId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				},
			);
			expect(invalidOrgResult.ok).toBe(false);
			expect(invalidOrgResult.message).toContain("Actor is not an employee");
		});

		it("should handle temporal identity attacks", async () => {
			const employeeId =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const actorUserId = "temporal-user";

			const authPort: HumanResourcesAuthorizationPort = {
				async can() {
					return true;
				},
			};

			// Identity resolver with temporal boundaries
			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					const asOf = input.asOf || new Date().toISOString().split("T")[0];

					// Identity was only valid from 2024-01-01 to 2024-06-30
					if (
						input.actorUserId === actorUserId &&
						asOf >= "2024-01-01" &&
						asOf <= "2024-06-30"
					) {
						return ok({
							employeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: "2024-06-30",
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Should work within valid period
			const validPeriodResult = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: employeeId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
					asOf: "2024-03-15",
				},
			);
			expect(validPeriodResult.ok).toBe(true);

			// Should fail after identity expired
			const expiredResult = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: employeeId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
					asOf: "2024-08-15",
				},
			);
			expect(expiredResult.ok).toBe(false);
			expect(expiredResult.message).toContain("Actor is not an employee");
		});
	});

	describe("Comprehensive IDOR Attack Scenarios", () => {
		it("should prevent parameter manipulation across all attack vectors", async () => {
			const correlationId = "test-correlation-123";
			const legitimateEmployeeId =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const targetEmployeeId =
				"6ba7b810-9dad-11d1-80b4-00c04fd430c8" as HumanResourcesEmployeeId;
			const actorUserId = "attacker-user";

			const authPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					if (
						input.permission === HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ
					) {
						return true;
					}
					return false;
				},
			};

			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					if (input.actorUserId === actorUserId) {
						return ok({
							employeeId: legitimateEmployeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			// Test common IDOR attack patterns with valid UUID shapes
			const attackVectors = [
				{
					employeeId: targetEmployeeId,
					description: "Direct employee ID manipulation",
				},
				{
					employeeId:
						"550e8400-e29b-41d4-a716-446655440001" as HumanResourcesEmployeeId,
					description: "Sequential ID guessing",
				},
				{
					employeeId:
						"00000000-0000-4000-8000-000000000001" as HumanResourcesEmployeeId,
					description: "System account targeting",
				},
				{
					employeeId:
						"ffffffff-ffff-4fff-bfff-ffffffffffff" as HumanResourcesEmployeeId,
					description: "Max value targeting",
				},
				{
					employeeId:
						"12345678-1234-4234-8234-123456789012" as HumanResourcesEmployeeId,
					description: "Sample ID targeting",
				},
			];

			for (const vector of attackVectors) {
				const result = await listEmployeeGoals(
					{
						organizationId,
						correlationId,
						actorUserId,
						employeeId: vector.employeeId,
					},
					{
						store,
						authorization: authPort,
						identityResolver,
					},
				);

				expect(
					result.ok,
					`Attack vector '${vector.description}' should fail`,
				).toBe(false);
				expect(
					result.message,
					`Attack vector '${vector.description}' should return authorization error`,
				).toMatch(
					/Missing required human resources permission|Cannot access other employee's resources/,
				);
			}
		});

		it("should prevent organization boundary violations", async () => {
			const correlationId = "test-correlation-123";
			const employeeId =
				"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;
			const actorUserId = "boundary-attacker";

			const authPort: HumanResourcesAuthorizationPort = {
				async can(input) {
					return (
						input.permission === HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ
					);
				},
			};

			const identityResolver: HumanResourcesIdentityResolverPort = {
				async resolveEmployeeForActor(input) {
					if (input.organizationId === organizationId) {
						return ok({
							employeeId,
							relationshipType: "self" as const,
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						});
					}
					return ok(null);
				},
				async resolveManagerEmployeesForActor() {
					return ok([]);
				},
			};

			const orgAttacks = [
				"different-org",
				"admin-org",
				"system-org",
				"null",
				"undefined",
				"../../etc/passwd",
			];

			for (const attackOrg of orgAttacks) {
				const result = await listEmployeeGoals(
					{
						organizationId: attackOrg,
						correlationId,
						actorUserId,
						employeeId,
					},
					{
						store,
						authorization: authPort,
						identityResolver,
					},
				);

				expect(
					result.ok,
					`Organization attack '${attackOrg}' should fail`,
				).toBe(false);
				expect(
					result.message,
					`Organization attack '${attackOrg}' should return authorization error`,
				).toMatch(
					/Missing required human resources permission|Actor is not an employee/,
				);
			}
		});
	});
});
