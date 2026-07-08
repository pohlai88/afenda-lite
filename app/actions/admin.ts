"use server";

import { redirect } from "next/navigation";
import {
  ORG_SIGN_IN_HREF,
} from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import {
  neonAdminImpersonateUser,
  neonAdminStopImpersonating,
} from "@/lib/auth/admin";
import {
  rejectNonOperatorSignIn,
  requireAdminSession,
} from "@/lib/auth/session";
import { runLoggedAction } from "@/lib/observability";
import {
  CLIENT_HOME_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/portal-routes";
import {
  getPreviewClientUser,
  isPreviewClientConfigured,
  clientPreviewUnavailableHref,
  PREVIEW_UNAVAILABLE_FAILED_REASON,
} from "@/lib/preview-client";
import { portalCopy } from "@/lib/portal-copy";
import { parseSchema } from "@/lib/schemas/common";
import { signInSchema } from "@/lib/schemas/auth";
import {
  formPassword,
  formString,
} from "@/lib/server-actions/form-data";

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

    const accessDenied = await rejectNonOperatorSignIn(email);
    if (accessDenied) {
      return accessDenied;
    }

    redirect(OPERATOR_DASHBOARD_HREF);
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

    redirect(OPERATOR_DASHBOARD_HREF);
  });
}
