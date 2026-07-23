import { ok, type Result } from "@afenda/errors/result";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHumanResourcesStore } from "../src/adapters/memory/store";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesPermission,
} from "../src/authorization";
import type { HumanResourcesEmployeeId } from "../src/brands";
import type {
	HumanResourcesEmployeeIdentity,
	HumanResourcesIdentityResolverPort,
} from "../src/identity-resolver";
import {
	requireAdminResourceAccess,
	requireManagerResourceAccess,
	requireOwnResourceAccess,
} from "../src/shared/subject-aware-authorization";

function createTestAuthorizationPort(
	grantedPermissions: Set<HumanResourcesPermission>,
): HumanResourcesAuthorizationPort {
	return {
		async can(input: {
			organizationId: string;
			actorUserId: string;
			permission: HumanResourcesPermission;
		}): Promise<boolean> {
			return grantedPermissions.has(input.permission);
		},
	};
}

function createTestIdentityResolverPort(
	mappings: Map<string, HumanResourcesEmployeeIdentity | null>,
): HumanResourcesIdentityResolverPort {
	return {
		async resolveEmployeeForActor(input: {
			organizationId: string;
			actorUserId: string;
			asOf?: string;
		}): Promise<Result<HumanResourcesEmployeeIdentity | null>> {
			const key = `${input.organizationId}:${input.actorUserId}`;
			const result = mappings.get(key) || null;
			return ok(result);
		},

		async resolveManagerEmployeesForActor(_input: {
			organizationId: string;
			actorUserId: string;
			asOf?: string;
		}): Promise<Result<HumanResourcesEmployeeId[]>> {
			return ok([]);
		},
	};
}

describe("Subject-Aware Authorization", () => {
	const organizationId = "org-123";
	const actorUserId = "user-123";
	const targetEmployeeId = "emp-123" as HumanResourcesEmployeeId;
	const differentEmployeeId = "emp-456" as HumanResourcesEmployeeId;

	let store: ReturnType<typeof createMemoryHumanResourcesStore>;

	beforeEach(() => {
		store = createMemoryHumanResourcesStore();
		store.reset();
	});

	describe("requireOwnResourceAccess", () => {
		it("should allow access when actor owns the target employee", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["employee-document.own.read" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: targetEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			const result = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "employee-document.own.read" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(true);
		});

		it("should deny access when actor does not own the target employee", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["employee-document.own.read" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: differentEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			const result = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "employee-document.own.read" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Cannot access other employee's resources");
		});

		it("should deny access when actor is not an employee", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["employee-document.own.read" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(new Map());

			const result = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "employee-document.own.read" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Actor is not an employee");
		});

		it("should deny access when actor lacks the required permission", async () => {
			const authPort = createTestAuthorizationPort(new Set());

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: targetEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			const result = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "employee-document.own.read" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});
	});

	describe("requireManagerResourceAccess", () => {
		it("should allow access when actor is the primary manager", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["leave-request.approve-team" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: "manager-123" as HumanResourcesEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			// Mock the store to return the actor as the primary manager
			store.getPrimaryManagerForEmployee = async () =>
				ok("manager-123" as HumanResourcesEmployeeId);

			const result = await requireManagerResourceAccess(
				identityResolver,
				store,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "leave-request.approve-team" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(true);
		});

		it("should deny access when actor is not the primary manager", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["leave-request.approve-team" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: "manager-123" as HumanResourcesEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			// Mock the store to return a different manager
			store.getPrimaryManagerForEmployee = async () =>
				ok("manager-456" as HumanResourcesEmployeeId);

			const result = await requireManagerResourceAccess(
				identityResolver,
				store,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "leave-request.approve-team" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Actor is not the manager of the target employee",
			);
		});

		it("should deny access when target has no manager", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["leave-request.approve-team" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: "manager-123" as HumanResourcesEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			// Mock the store to return no manager
			store.getPrimaryManagerForEmployee = async () => ok(null);

			const result = await requireManagerResourceAccess(
				identityResolver,
				store,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "leave-request.approve-team" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Actor is not the manager of the target employee",
			);
		});
	});

	describe("requireAdminResourceAccess", () => {
		it("should allow access when actor has admin permission", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["compliance.administer" as HumanResourcesPermission]),
			);

			const result = await requireAdminResourceAccess(authPort, {
				organizationId,
				actorUserId,
				permission: "compliance.administer" as HumanResourcesPermission,
			});

			expect(result.ok).toBe(true);
		});

		it("should deny access when actor lacks admin permission", async () => {
			const authPort = createTestAuthorizationPort(new Set());

			const result = await requireAdminResourceAccess(authPort, {
				organizationId,
				actorUserId,
				permission: "compliance.administer" as HumanResourcesPermission,
			});

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Missing required human resources permission",
			);
		});

		it("should fail when authorization port is not provided", async () => {
			const result = await requireAdminResourceAccess(undefined, {
				organizationId,
				actorUserId,
				permission: "compliance.administer" as HumanResourcesPermission,
			});

			expect(result.ok).toBe(false);
			expect(result.code).toBe("UNAUTHORIZED");
		});
	});

	describe("IDOR Prevention Tests", () => {
		it("should prevent compliance document access with wrong employee ID", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["employee-document.own.read" as HumanResourcesPermission]),
			);

			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: targetEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			// Try to access a different employee's documents
			const result = await requireOwnResourceAccess(
				identityResolver,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId: differentEmployeeId,
					permission: "employee-document.own.read" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe("Cannot access other employee's resources");
		});

		it("should prevent manager approval with wrong manager identity", async () => {
			const authPort = createTestAuthorizationPort(
				new Set(["leave-request.approve-team" as HumanResourcesPermission]),
			);

			// Actor resolves to one manager
			const identityResolver = createTestIdentityResolverPort(
				new Map([
					[
						`${organizationId}:${actorUserId}`,
						{
							employeeId: "manager-123" as HumanResourcesEmployeeId,
							relationshipType: "self",
							effectiveFrom: "2024-01-01",
							effectiveUntil: null,
						},
					],
				]),
			);

			// But employee actually has a different manager
			store.getPrimaryManagerForEmployee = async () =>
				ok("manager-456" as HumanResourcesEmployeeId);

			const result = await requireManagerResourceAccess(
				identityResolver,
				store,
				authPort,
				{
					organizationId,
					actorUserId,
					targetEmployeeId,
					permission: "leave-request.approve-team" as HumanResourcesPermission,
				},
			);

			expect(result.ok).toBe(false);
			expect(result.message).toBe(
				"Actor is not the manager of the target employee",
			);
		});
	});
});
