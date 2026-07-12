"use server";

import { redirect } from "next/navigation";
import {
  isAdminSession,
  ORG_SIGN_IN_HREF,
} from "@/modules/identity/admin";
import { recordAuditEvent } from "@/modules/platform/audit";
import { auth } from "@/modules/identity/auth/server";
import {
  neonAdminBanUser,
  neonAdminCreateUser,
  neonAdminImpersonateUser,
  neonAdminRemoveUser,
  neonAdminRevokeUserSessions,
  neonAdminSetRole,
  neonAdminSetUserPassword,
  neonAdminStopImpersonating,
  neonAdminUnbanUser,
  neonAdminUpdateUser,
} from "@/modules/identity/auth/admin";
import {
  rejectNonOrganizationAdminSignIn,
  requireAdminSession,
} from "@/modules/identity/auth/session";
import { requirePlatformOperatorSession } from "@/modules/identity/auth/platform-operator-session";
import { runLoggedAction } from "@/modules/platform/observability";
import {
  CLIENT_HOME_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
  ORGANIZATION_ADMIN_USERS_HREF,
  organizationAdminUserHref,
} from "@/modules/platform/routing/portal-routes";
import {
  getPreviewClientUser,
  isPreviewClientConfigured,
  isPreviewClientSession,
  clientPreviewUnavailableHref,
  PREVIEW_UNAVAILABLE_FAILED_REASON,
} from "@/modules/identity/preview-client";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { parseSchema } from "@/modules/platform/schemas/common";
import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/modules/platform/schemas/action-result";
import { signInSchema } from "@/modules/identity/schemas/auth";
import {
  banOrganizationUserSchema,
  banOrganizationUsersSchema,
  createOrganizationUserSchema,
  importOrganizationUsersSchema,
  organizationUserIdSchema,
  organizationUserIdsSchema,
  setOrganizationUserPasswordSchema,
  setOrganizationUserRoleSchema,
  updateOrganizationUserSchema,
} from "@/modules/identity/schemas/users";
import {
  assignPlatformRoleSchema,
  createPlatformRoleSchema,
  deletePlatformRoleSchema,
  revokePlatformRoleAssignmentSchema,
  setPlatformRolePermissionSchema,
  updatePlatformRoleSchema,
} from "@/modules/identity/schemas/platform-rbac";
import {
  assignPlatformRole,
  createPlatformRole,
  deletePlatformRole,
  revokePlatformRoleAssignment,
  setPlatformRolePermission,
  updatePlatformRole,
} from "@/modules/identity/domain/platform-rbac";
import { requirePlatformPermission } from "@/modules/identity/domain/platform-rbac-access";
import {
  formPassword,
  formString,
} from "@/modules/declarations/server-actions/form-data";
import { revalidatePath } from "next/cache";
import {
  ORGANIZATION_ADMIN_PERMISSIONS_HREF,
  ORGANIZATION_ADMIN_ROLES_HREF,
} from "@/modules/platform/routing/portal-routes";

export async function adminSignInAction(formData: FormData) {
  return runLoggedAction("adminSignInAction", undefined, async () => {
    const parsed = parseSchema(signInSchema, {
      email: formString(formData, "email"),
      password: formPassword(formData, "password"),
    });

    if (!parsed.success) {
      return { error: portalCopy.errors.emailPasswordRequired };
    }

    const { email, password } = parsed.data;

    const { error } = await auth.signIn.email({ email, password });

    if (error) {
      await recordAuditEvent({
        eventType: "auth.sign_in_failed",
        resourceType: "session",
        metadata: { surface: "org" },
      });
      return { error: error.message ?? portalCopy.orgSignIn.invalidCredentials };
    }

    const accessDenied = await rejectNonOrganizationAdminSignIn(email);
    if (accessDenied) {
      return accessDenied;
    }

    redirect(ORGANIZATION_ADMIN_DASHBOARD_HREF);
  });
}

export async function startClientPreviewAction() {
  return runLoggedAction("startClientPreviewAction", undefined, async () => {
    const session = await requireAdminSession();

    if (!isPreviewClientConfigured()) {
      redirect(clientPreviewUnavailableHref());
    }

    const previewUser = await getPreviewClientUser();
    if (!previewUser) {
      redirect(clientPreviewUnavailableHref());
    }

    const previewEmail = previewUser.email;

    const impersonation = await neonAdminImpersonateUser(previewUser.id);

    if ("error" in impersonation) {
      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.client_preview_failed",
        resourceType: "session",
        metadata: {
          previewEmail,
          reason: impersonation.error,
        },
      });
      redirect(
        clientPreviewUnavailableHref({
          reason: PREVIEW_UNAVAILABLE_FAILED_REASON,
        }),
      );
    }

    const impersonatedEmail = impersonation.user?.email?.trim().toLowerCase();
    const expectedPreviewEmail = previewEmail.trim().toLowerCase();

    if (
      !impersonatedEmail ||
      impersonatedEmail !== expectedPreviewEmail
    ) {
      await neonAdminStopImpersonating();
      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.client_preview_failed",
        resourceType: "session",
        metadata: {
          previewEmail: expectedPreviewEmail,
          reason: "session_mismatch",
          impersonatedEmail: impersonatedEmail ?? null,
        },
      });
      redirect(
        clientPreviewUnavailableHref({
          reason: PREVIEW_UNAVAILABLE_FAILED_REASON,
        }),
      );
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "admin.client_preview_started",
      resourceType: "session",
      metadata: { previewEmail, mode: "impersonation" },
    });

    redirect(CLIENT_HOME_HREF);
  });
}

export async function exitClientPreviewAction() {
  return runLoggedAction("exitClientPreviewAction", undefined, async () => {
    const { data: session } = await auth.getSession();

    if (!isPreviewClientSession(session)) {
      redirect(CLIENT_HOME_HREF);
    }

    await recordAuditEvent({
      actorId: session?.user?.id,
      eventType: "admin.client_preview_ended",
      resourceType: "session",
    });

    const stopResult = await neonAdminStopImpersonating();
    if ("error" in stopResult) {
      await auth.signOut();
      redirect(ORG_SIGN_IN_HREF);
    }

    redirect(ORGANIZATION_ADMIN_DASHBOARD_HREF);
  });
}

function revalidateOrganizationUsers(userId?: string) {
  revalidatePath(ORGANIZATION_ADMIN_USERS_HREF);
  if (userId) {
    revalidatePath(organizationAdminUserHref(userId));
  }
}

const organizationAdminUserErrors = {
  selfDelete: "You cannot delete your own account.",
  selfSuspend: "You cannot suspend your own account.",
  selfDemote: "You cannot remove your own admin role.",
} as const;

async function removeOrganizationUsersForAdmin(input: {
  actorId: string;
  userIds: string[];
}): Promise<{ error: string } | { ok: true; removed: number }> {
  if (input.userIds.some((userId) => userId === input.actorId)) {
    return { error: organizationAdminUserErrors.selfDelete };
  }

  let removed = 0;
  for (const userId of input.userIds) {
    const result = await neonAdminRemoveUser(userId);
    if ("error" in result) {
      return {
        error: `Stopped after ${removed} removal(s): ${result.error}`,
      };
    }
    await recordAuditEvent({
      actorId: input.actorId,
      eventType: "admin.user_removed",
      resourceType: "user",
      resourceId: userId,
    });
    removed += 1;
  }

  revalidateOrganizationUsers();
  return { ok: true as const, removed };
}

async function banOrganizationUsersForAdmin(input: {
  actorId: string;
  userIds: string[];
  banReason?: string;
}): Promise<{ error: string } | { ok: true; banned: number }> {
  if (input.userIds.some((userId) => userId === input.actorId)) {
    return { error: organizationAdminUserErrors.selfSuspend };
  }

  let banned = 0;
  for (const userId of input.userIds) {
    const result = await neonAdminBanUser({
      userId,
      banReason: input.banReason,
    });
    if ("error" in result) {
      return {
        error: `Stopped after ${banned} suspend(s): ${result.error}`,
      };
    }
    await recordAuditEvent({
      actorId: input.actorId,
      eventType: "admin.user_banned",
      resourceType: "user",
      resourceId: userId,
      metadata: { banReason: input.banReason ?? null },
    });
    banned += 1;
  }

  revalidatePath(ORGANIZATION_ADMIN_USERS_HREF);
  for (const userId of input.userIds) {
    revalidatePath(organizationAdminUserHref(userId));
  }
  return { ok: true as const, banned };
}

export async function setOrganizationUserRoleAction(input: {
  userId: string;
  role: "user" | "admin";
}): Promise<ActionResult<Record<string, never>>> {
  return runLoggedAction(
    "setOrganizationUserRoleAction",
    undefined,
    async () => {
      const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
      const parsed = parseSchema(setOrganizationUserRoleSchema, input);
      if (!parsed.success) {
        return actionFail("VALIDATION_ERROR", parsed.error);
      }

      if (
        parsed.data.userId === session.user.id &&
        parsed.data.role !== "admin"
      ) {
        return actionFail("FORBIDDEN", organizationAdminUserErrors.selfDemote);
      }

      const result = await neonAdminSetRole({
        userId: parsed.data.userId,
        role: parsed.data.role,
      });
      if ("error" in result) {
        return actionFail("ACTION_FAILED", result.error);
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.user_role_set",
        resourceType: "user",
        resourceId: parsed.data.userId,
        metadata: { role: parsed.data.role },
      });
      revalidateOrganizationUsers(parsed.data.userId);
      return actionOk({});
    },
  );
}

export async function banOrganizationUserAction(input: {
  userId: string;
  banReason?: string;
}): Promise<ActionResult<Record<string, never>>> {
  return runLoggedAction("banOrganizationUserAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(banOrganizationUserSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const result = await banOrganizationUsersForAdmin({
      actorId: session.user.id,
      userIds: [parsed.data.userId],
      banReason: parsed.data.banReason,
    });
    if ("error" in result) {
      return actionFail("ACTION_FAILED", result.error);
    }
    return actionOk({});
  });
}

export async function unbanOrganizationUserAction(input: { userId: string }): Promise<ActionResult<Record<string, never>>> {
  return runLoggedAction("unbanOrganizationUserAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(organizationUserIdSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const result = await neonAdminUnbanUser(parsed.data.userId);
    if ("error" in result) {
      return actionFail("ACTION_FAILED", result.error);
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "admin.user_unbanned",
      resourceType: "user",
      resourceId: parsed.data.userId,
    });
    revalidateOrganizationUsers(parsed.data.userId);
    return actionOk({});
  });
}

async function createOrganizationUserForAdmin(input: {
  actorId: string;
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  source?: "form" | "import";
}): Promise<{ error: string } | { ok: true; userId?: string; email: string }> {
  const result = await neonAdminCreateUser({
    email: input.email,
    password: input.password,
    name: input.name,
    role: input.role,
  });
  if ("error" in result) {
    return { error: result.error };
  }

  const createdId =
    result.user && typeof result.user === "object" && "id" in result.user
      ? String((result.user as { id: string }).id)
      : undefined;

  await recordAuditEvent({
    actorId: input.actorId,
    eventType: "admin.user_created",
    resourceType: "user",
    resourceId: createdId,
    metadata: {
      email: input.email,
      role: input.role,
      ...(input.source === "import" ? { source: "import" } : {}),
    },
  });

  return { ok: true as const, userId: createdId, email: input.email };
}

export async function createOrganizationUserAction(input: {
  email: string;
  password: string;
  name: string;
  role?: "user" | "admin";
}): Promise<ActionResult<{ userId?: string }>> {
  return runLoggedAction("createOrganizationUserAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(createOrganizationUserSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const result = await createOrganizationUserForAdmin({
      actorId: session.user.id,
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      role: parsed.data.role,
      source: "form",
    });
    if ("error" in result) {
      return actionFail("ACTION_FAILED", result.error);
    }

    revalidateOrganizationUsers(result.userId);
    return actionOk({ userId: result.userId });
  });
}

export async function importOrganizationUsersAction(input: {
  users: Array<{
    email: string;
    password: string;
    name: string;
    role?: "user" | "admin" | string;
  }>;
}): Promise<ActionResult<{ created: number; failed: number; failures: Array<{ email: string; error: string }> }>> {
  return runLoggedAction("importOrganizationUsersAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(importOrganizationUsersSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const created: string[] = [];
    const failures: Array<{ email: string; error: string }> = [];

    for (const user of parsed.data.users) {
      const result = await createOrganizationUserForAdmin({
        actorId: session.user.id,
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role,
        source: "import",
      });
      if ("error" in result) {
        failures.push({ email: user.email, error: result.error });
        continue;
      }
      created.push(result.email);
    }

    revalidateOrganizationUsers();
    return actionOk({ created: created.length, failed: failures.length, failures });
  });
}

export async function updateOrganizationUserAction(input: {
  userId: string;
  name: string;
  role?: "user" | "admin";
}): Promise<ActionResult<Record<string, never>>> {
  return runLoggedAction("updateOrganizationUserAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(updateOrganizationUserSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    if (
      parsed.data.userId === session.user.id &&
      parsed.data.role &&
      parsed.data.role !== "admin"
    ) {
      return actionFail("FORBIDDEN", organizationAdminUserErrors.selfDemote);
    }

    const updated = await neonAdminUpdateUser({
      userId: parsed.data.userId,
      data: { name: parsed.data.name },
    });
    if ("error" in updated) {
      return actionFail("ACTION_FAILED", updated.error);
    }

    if (parsed.data.role) {
      const roleResult = await neonAdminSetRole({
        userId: parsed.data.userId,
        role: parsed.data.role,
      });
      if ("error" in roleResult) {
        return actionFail("ACTION_FAILED", roleResult.error);
      }
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "admin.user_updated",
      resourceType: "user",
      resourceId: parsed.data.userId,
      metadata: { name: parsed.data.name, role: parsed.data.role ?? null },
    });
    revalidateOrganizationUsers(parsed.data.userId);
    return actionOk({});
  });
}

export async function setOrganizationUserPasswordAction(input: {
  userId: string;
  newPassword: string;
}) {
  return runLoggedAction(
    "setOrganizationUserPasswordAction",
    undefined,
    async () => {
      const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
      const parsed = parseSchema(setOrganizationUserPasswordSchema, input);
      if (!parsed.success) {
        return actionFail("VALIDATION_ERROR", parsed.error);
      }

      const result = await neonAdminSetUserPassword({
        userId: parsed.data.userId,
        newPassword: parsed.data.newPassword,
      });
      if ("error" in result) {
        return actionFail("ACTION_FAILED", result.error);
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.user_password_set",
        resourceType: "user",
        resourceId: parsed.data.userId,
      });
      revalidateOrganizationUsers(parsed.data.userId);
      return actionOk({});
    },
  );
}

export async function removeOrganizationUserAction(input: { userId: string }) {
  return runLoggedAction("removeOrganizationUserAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(organizationUserIdSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const result = await removeOrganizationUsersForAdmin({
      actorId: session.user.id,
      userIds: [parsed.data.userId],
    });
    if ("error" in result) {
      return actionFail("ACTION_FAILED", result.error);
    }
    return actionOk({});
  });
}

export async function removeOrganizationUsersAction(input: {
  userIds: string[];
}): Promise<ActionResult<{ removed: number }>> {
  return runLoggedAction(
    "removeOrganizationUsersAction",
    undefined,
    async () => {
      const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
      const parsed = parseSchema(organizationUserIdsSchema, input);
      if (!parsed.success) {
        return actionFail("VALIDATION_ERROR", parsed.error);
      }

      const result = await removeOrganizationUsersForAdmin({
        actorId: session.user.id,
        userIds: parsed.data.userIds,
      });
      if ("error" in result) {
        return actionFail("ACTION_FAILED", result.error);
      }
      return actionOk({ removed: result.removed });
    },
  );
}

export async function banOrganizationUsersAction(input: {
  userIds: string[];
  banReason?: string;
}): Promise<ActionResult<{ banned: number }>> {
  return runLoggedAction("banOrganizationUsersAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
    const parsed = parseSchema(banOrganizationUsersSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const result = await banOrganizationUsersForAdmin({
      actorId: session.user.id,
      userIds: parsed.data.userIds,
      banReason: parsed.data.banReason,
    });
    if ("error" in result) {
      return actionFail("ACTION_FAILED", result.error);
    }
    return actionOk({ banned: result.banned });
  });
}

export async function revokeOrganizationUserSessionsAction(input: {
  userId: string;
}) {
  return runLoggedAction(
    "revokeOrganizationUserSessionsAction",
    undefined,
    async () => {
      const session = await requirePlatformOperatorSession({
        anyOf: ["org.users.manage"],
      });
      const denied = await assertUsersManageAllowed(session);
      if (denied) return denied;
      const parsed = parseSchema(organizationUserIdSchema, input);
      if (!parsed.success) {
        return actionFail("VALIDATION_ERROR", parsed.error);
      }

      const result = await neonAdminRevokeUserSessions(parsed.data.userId);
      if ("error" in result) {
        return actionFail("ACTION_FAILED", result.error);
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.user_sessions_revoked",
        resourceType: "user",
        resourceId: parsed.data.userId,
      });
      revalidateOrganizationUsers(parsed.data.userId);
      return actionOk({});
    },
  );
}

function revalidatePlatformRbacPaths() {
  revalidatePath(ORGANIZATION_ADMIN_ROLES_HREF);
  revalidatePath(ORGANIZATION_ADMIN_PERMISSIONS_HREF);
}

async function requireRolesManageGate(session: {
  user: { id: string; role?: string | null };
}) {
  return requirePlatformPermission({
    userId: session.user.id,
    code: "org.roles.manage",
    isNeonAdmin: isAdminSession(session),
  });
}

async function requireUsersManageGate(session: {
  user: { id: string; role?: string | null };
}) {
  return requirePlatformPermission({
    userId: session.user.id,
    code: "org.users.manage",
    isNeonAdmin: isAdminSession(session),
  });
}

async function assertUsersManageAllowed(session: {
  user: { id: string; role?: string | null };
}) {
  const { check } = await requireUsersManageGate(session);
  if (!check.allowed) {
    return actionFail(
      "FORBIDDEN",
      "You do not have permission to manage users.",
    );
  }
  return null;
}

export async function createPlatformRoleAction(input: {
  name: string;
  description?: string;
  permissionCodes: string[];
}): Promise<ActionResult<{ roleId: string }>> {
  return runLoggedAction("createPlatformRoleAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
      anyOf: ["org.roles.manage"],
    });
    const parsed = parseSchema(createPlatformRoleSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const { organizationId, check } = await requireRolesManageGate(session);
    if (!check.allowed) {
      return actionFail(
        "FORBIDDEN",
        "You do not have permission to manage roles.",
      );
    }

    const role = await createPlatformRole({
      organizationId,
      data: parsed.data,
      actorUserId: session.user.id,
    });
    revalidatePlatformRbacPaths();
    return actionOk({ roleId: role?.id ?? "" });
  });
}

export async function updatePlatformRoleAction(input: {
  roleId: string;
  name: string;
  description?: string;
  permissionCodes: string[];
}): Promise<ActionResult<{ roleId: string }>> {
  return runLoggedAction("updatePlatformRoleAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
      anyOf: ["org.roles.manage"],
    });
    const parsed = parseSchema(updatePlatformRoleSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const { organizationId, check } = await requireRolesManageGate(session);
    if (!check.allowed) {
      return actionFail(
        "FORBIDDEN",
        "You do not have permission to manage roles.",
      );
    }

    const result = await updatePlatformRole({
      organizationId,
      data: parsed.data,
      actorUserId: session.user.id,
    });
    if ("error" in result && result.error) {
      return actionFail(
        result.error,
        "message" in result && typeof result.message === "string"
          ? result.message
          : "Could not update role.",
      );
    }

    revalidatePlatformRbacPaths();
    return actionOk({
      roleId: String(result.role?.id ?? parsed.data.roleId),
    });
  });
}

export async function deletePlatformRoleAction(input: {
  roleId: string;
}): Promise<ActionResult<{ roleId: string }>> {
  return runLoggedAction("deletePlatformRoleAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
      anyOf: ["org.roles.manage"],
    });
    const parsed = parseSchema(deletePlatformRoleSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const { organizationId, check } = await requireRolesManageGate(session);
    if (!check.allowed) {
      return actionFail(
        "FORBIDDEN",
        "You do not have permission to manage roles.",
      );
    }

    const result = await deletePlatformRole({
      organizationId,
      roleId: parsed.data.roleId,
      actorUserId: session.user.id,
    });
    if ("error" in result && result.error) {
      return actionFail(
        result.error,
        "message" in result && typeof result.message === "string"
          ? result.message
          : "Could not delete role.",
      );
    }

    revalidatePlatformRbacPaths();
    return actionOk({ roleId: parsed.data.roleId });
  });
}

export async function setPlatformRolePermissionAction(input: {
  roleId: string;
  permissionCode: string;
  granted: boolean;
}): Promise<ActionResult<{ roleId: string }>> {
  return runLoggedAction(
    "setPlatformRolePermissionAction",
    undefined,
    async () => {
      const session = await requirePlatformOperatorSession({
        anyOf: ["org.roles.manage"],
      });
      const parsed = parseSchema(setPlatformRolePermissionSchema, input);
      if (!parsed.success) {
        return actionFail("VALIDATION_ERROR", parsed.error);
      }

      const { organizationId, check } = await requireRolesManageGate(session);
      if (!check.allowed) {
        return actionFail(
          "FORBIDDEN",
          "You do not have permission to manage roles.",
        );
      }

      const result = await setPlatformRolePermission({
        organizationId,
        roleId: parsed.data.roleId,
        permissionCode: parsed.data.permissionCode,
        granted: parsed.data.granted,
        actorUserId: session.user.id,
      });
      if ("error" in result && result.error) {
        return actionFail(
          result.error,
          "message" in result && typeof result.message === "string"
            ? result.message
            : "Could not update permission.",
        );
      }

      revalidatePlatformRbacPaths();
      return actionOk({ roleId: parsed.data.roleId });
    },
  );
}

export async function assignPlatformRoleAction(input: {
  userId: string;
  roleId: string;
  scopeType?: "organization" | "platform";
}): Promise<ActionResult<{ assignmentId?: string }>> {
  return runLoggedAction("assignPlatformRoleAction", undefined, async () => {
    const session = await requirePlatformOperatorSession({
      anyOf: ["org.roles.manage"],
    });
    const parsed = parseSchema(assignPlatformRoleSchema, input);
    if (!parsed.success) {
      return actionFail("VALIDATION_ERROR", parsed.error);
    }

    const { organizationId, check } = await requireRolesManageGate(session);
    if (!check.allowed) {
      return actionFail(
        "FORBIDDEN",
        "You do not have permission to manage roles.",
      );
    }

    const result = await assignPlatformRole({
      userId: parsed.data.userId,
      organizationId,
      roleId: parsed.data.roleId,
      scopeType: parsed.data.scopeType,
      actorUserId: session.user.id,
    });
    if ("error" in result && result.error) {
      return actionFail(result.error, "Could not assign role.");
    }

    revalidatePlatformRbacPaths();
    revalidatePath(ORGANIZATION_ADMIN_USERS_HREF);
    revalidatePath(organizationAdminUserHref(parsed.data.userId));
    return actionOk({ assignmentId: result.assignmentId });
  });
}

export async function revokePlatformRoleAssignmentAction(input: {
  assignmentId: string;
}): Promise<ActionResult<{ assignmentId: string }>> {
  return runLoggedAction(
    "revokePlatformRoleAssignmentAction",
    undefined,
    async () => {
      const session = await requirePlatformOperatorSession({
        anyOf: ["org.roles.manage"],
      });
      const parsed = parseSchema(revokePlatformRoleAssignmentSchema, input);
      if (!parsed.success) {
        return actionFail("VALIDATION_ERROR", parsed.error);
      }

      const { organizationId, check } = await requireRolesManageGate(session);
      if (!check.allowed) {
        return actionFail(
          "FORBIDDEN",
          "You do not have permission to manage roles.",
        );
      }

      const result = await revokePlatformRoleAssignment({
        assignmentId: parsed.data.assignmentId,
        organizationId,
        actorUserId: session.user.id,
      });
      if ("error" in result && result.error) {
        return actionFail(result.error, "Could not revoke assignment.");
      }

      revalidatePlatformRbacPaths();
      revalidatePath(ORGANIZATION_ADMIN_USERS_HREF);
      if ("userId" in result && typeof result.userId === "string") {
        revalidatePath(organizationAdminUserHref(result.userId));
      }
      return actionOk({ assignmentId: parsed.data.assignmentId });
    },
  );
}
