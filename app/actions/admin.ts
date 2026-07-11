"use server";

import { redirect } from "next/navigation";
import {
  ORG_SIGN_IN_HREF,
} from "@/modules/identity/admin";
import { recordAuditEvent } from "@/modules/platform/audit";
import { auth } from "@/modules/identity/auth/server";
import {
  neonAdminBanUser,
  neonAdminImpersonateUser,
  neonAdminSetRole,
  neonAdminStopImpersonating,
  neonAdminUnbanUser,
} from "@/modules/identity/auth/admin";
import {
  rejectNonOrganizationAdminSignIn,
  requireAdminSession,
} from "@/modules/identity/auth/session";
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
import { portalCopy } from "@/modules/declarations/copy/portal-copy";
import { parseSchema } from "@/modules/platform/schemas/common";
import { signInSchema } from "@/modules/identity/schemas/auth";
import {
  banOrganizationUserSchema,
  organizationUserIdSchema,
  setOrganizationUserRoleSchema,
} from "@/modules/identity/schemas/users";
import {
  formPassword,
  formString,
} from "@/modules/declarations/server-actions/form-data";
import { revalidatePath } from "next/cache";

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

export async function setOrganizationUserRoleAction(input: {
  userId: string;
  role: "user" | "admin";
}) {
  return runLoggedAction(
    "setOrganizationUserRoleAction",
    undefined,
    async () => {
      const session = await requireAdminSession();
      const parsed = parseSchema(setOrganizationUserRoleSchema, input);
      if (!parsed.success) {
        return { error: parsed.error };
      }

      if (
        parsed.data.userId === session.user.id &&
        parsed.data.role !== "admin"
      ) {
        return { error: "You cannot remove your own admin role." };
      }

      const result = await neonAdminSetRole({
        userId: parsed.data.userId,
        role: parsed.data.role,
      });
      if ("error" in result) {
        return { error: result.error };
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.user_role_set",
        resourceType: "user",
        resourceId: parsed.data.userId,
        metadata: { role: parsed.data.role },
      });
      revalidateOrganizationUsers(parsed.data.userId);
      return { ok: true as const };
    },
  );
}

export async function banOrganizationUserAction(input: {
  userId: string;
  banReason?: string;
}) {
  return runLoggedAction("banOrganizationUserAction", undefined, async () => {
    const session = await requireAdminSession();
    const parsed = parseSchema(banOrganizationUserSchema, input);
    if (!parsed.success) {
      return { error: parsed.error };
    }

    if (parsed.data.userId === session.user.id) {
      return { error: "You cannot suspend your own account." };
    }

    const result = await neonAdminBanUser({
      userId: parsed.data.userId,
      banReason: parsed.data.banReason,
    });
    if ("error" in result) {
      return { error: result.error };
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "admin.user_banned",
      resourceType: "user",
      resourceId: parsed.data.userId,
      metadata: { banReason: parsed.data.banReason ?? null },
    });
    revalidateOrganizationUsers(parsed.data.userId);
    return { ok: true as const };
  });
}

export async function unbanOrganizationUserAction(input: { userId: string }) {
  return runLoggedAction("unbanOrganizationUserAction", undefined, async () => {
    const session = await requireAdminSession();
    const parsed = parseSchema(organizationUserIdSchema, input);
    if (!parsed.success) {
      return { error: parsed.error };
    }

    const result = await neonAdminUnbanUser(parsed.data.userId);
    if ("error" in result) {
      return { error: result.error };
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "admin.user_unbanned",
      resourceType: "user",
      resourceId: parsed.data.userId,
    });
    revalidateOrganizationUsers(parsed.data.userId);
    return { ok: true as const };
  });
}
