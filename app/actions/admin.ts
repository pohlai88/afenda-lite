"use server";

import { redirect } from "next/navigation";
import {
  isAdminSession,
  ORG_SIGN_IN_HREF,
} from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
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
  getPreviewClientEmail,
  getPreviewClientPassword,
  isPreviewClientConfigured,
  isPreviewClientSession,
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

    const email = getPreviewClientEmail();
    const password = getPreviewClientPassword();

    const { error } = await auth.signIn.email({ email, password });

    if (error) {
      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.client_preview_failed",
        resourceType: "session",
        metadata: { previewEmail: email, reason: error.message ?? "sign_in_failed" },
      });
      redirect(
        clientPreviewUnavailableHref({
          reason: PREVIEW_UNAVAILABLE_FAILED_REASON,
        }),
      );
    }

    const { data: previewSession } = await auth.getSession();

    if (!isPreviewClientSession(previewSession)) {
      await auth.signOut();
      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "admin.client_preview_failed",
        resourceType: "session",
        metadata: { previewEmail: email, reason: "session_mismatch" },
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
      metadata: { previewEmail: email },
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

    await auth.signOut();
    redirect(ORG_SIGN_IN_HREF);
  });
}
