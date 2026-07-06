"use server";

import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { runLoggedAction } from "@/lib/observability";
import { portalCopy } from "@/lib/portal-copy";
import { parseSchema } from "@/lib/schemas/common";
import { signInSchema } from "@/lib/schemas/auth";

export async function requireAdminSession() {
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/org/login?reason=access-denied");
  }

  return session!;
}

export async function adminSignInAction(formData: FormData) {
  return runLoggedAction("adminSignInAction", undefined, async () => {
    const parsed = parseSchema(signInSchema, {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
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

    const { data: session } = await auth.getSession();

    if (!isAdminSession(session)) {
      await auth.signOut();
      await recordAuditEvent({
        eventType: "auth.sign_in_failed",
        resourceType: "session",
        metadata: { surface: "org", reason: "access_denied" },
      });
      return { error: portalCopy.orgSignIn.accessDenied };
    }

    redirect("/dashboard");
  });
}
